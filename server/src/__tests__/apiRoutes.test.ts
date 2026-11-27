import { describe, expect, it } from 'vitest';
import request from 'node:http';
import WebSocket from 'ws';
import { createApp } from '../index.js';

function httpRequest(
  serverUrl: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, serverUrl);
    const payload = body ? JSON.stringify(body) : undefined;
    const req = request.request(
      url,
      {
        method,
        headers: payload
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
          : undefined,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            body: JSON.parse(data) as Record<string, unknown>,
          });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe('MyVoice API & WebSocket routes (key-free startup)', () => {
  it('handles REST and WebSocket endpoints cleanly without API keys', async () => {
    delete process.env.DEEPGRAM_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const { server } = createApp();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const health = await httpRequest(baseUrl, 'GET', '/api/health');
      expect(health.status).toBe(200);
      expect(health.body.ok).toBe(true);

      const caps = await httpRequest(baseUrl, 'GET', '/api/capabilities');
      expect(caps.status).toBe(200);
      expect(caps.body.speechToTextConfigured).toBe(false);
      expect(caps.body.aiNotesAndTranslationConfigured).toBe(false);
      expect(caps.body.demoModeAvailable).toBe(true);

      const badTranslate = await httpRequest(baseUrl, 'POST', '/api/translate', {
        text: '',
        targetLanguage: 'te',
      });
      expect(badTranslate.status).toBe(400);

      const missingKeyTranslate = await httpRequest(baseUrl, 'POST', '/api/translate', {
        text: 'Photosynthesis converts sunlight.',
        targetLanguage: 'te',
      });
      expect(missingKeyTranslate.status).toBe(503);
      expect(missingKeyTranslate.body.error).toBe('GEMINI_NOT_CONFIGURED');

      const badNotes = await httpRequest(baseUrl, 'POST', '/api/notes', {
        sessionId: 's1',
        sessionTitle: 'Test',
        segments: [],
      });
      expect(badNotes.status).toBe(400);

      const missingKeyNotes = await httpRequest(baseUrl, 'POST', '/api/notes', {
        sessionId: 's1',
        sessionTitle: 'Test',
        segments: [
          {
            id: 'seg-001',
            sessionId: 's1',
            timestampMs: 1000,
            createdAtIso: '2026-11-27T04:00:00Z',
            originalText: 'Test explanation.',
            isFinal: true,
          },
        ],
      });
      expect(missingKeyNotes.status).toBe(503);
      expect(missingKeyNotes.body.error).toBe('GEMINI_NOT_CONFIGURED');

      // WebSocket /ws/transcribe key-free error check
      const wsMsg = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/transcribe`);
        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'start', language: 'multi', sampleRate: 16000 }));
        });
        ws.on('message', (raw) => {
          const parsed = JSON.parse(raw.toString()) as Record<string, unknown>;
          ws.close();
          resolve(parsed);
        });
        ws.on('error', reject);
      });
      expect(wsMsg.type).toBe('error');
      expect(wsMsg.code).toBe('DEEPGRAM_NOT_CONFIGURED');

      // Rate-limit check on /api/notes (max 10 req/min per IP)
      let hitRateLimit = false;
      for (let i = 0; i < 12; i++) {
        const res = await httpRequest(baseUrl, 'POST', '/api/notes', {
          sessionId: 's1',
          sessionTitle: 'Test',
          segments: [],
        });
        if (res.status === 429 && res.body.error === 'RATE_LIMIT_EXCEEDED') {
          hitRateLimit = true;
          break;
        }
      }
      expect(hitRateLimit).toBe(true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('disables live AI and WS services when LIVE_SERVICES_ENABLED=false while keeping demo health up', async () => {
    process.env.DEEPGRAM_API_KEY = 'dummy-dg';
    process.env.GEMINI_API_KEY = 'dummy-gm';
    process.env.LIVE_SERVICES_ENABLED = 'false';

    const { server } = createApp();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const caps = await httpRequest(baseUrl, 'GET', '/api/capabilities');
      expect(caps.status).toBe(200);
      expect(caps.body.speechToTextConfigured).toBe(false);
      expect(caps.body.aiNotesAndTranslationConfigured).toBe(false);
      expect(caps.body.demoModeAvailable).toBe(true);

      const wsMsg = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/transcribe`);
        ws.on('message', (raw) => {
          const parsed = JSON.parse(raw.toString()) as Record<string, unknown>;
          ws.close();
          resolve(parsed);
        });
        ws.on('error', reject);
      });
      expect(wsMsg.type).toBe('error');
      expect(wsMsg.code).toBe('LIVE_SERVICES_DISABLED');
    } finally {
      delete process.env.DEEPGRAM_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.LIVE_SERVICES_ENABLED;
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
