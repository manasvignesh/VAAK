import WebSocket, { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { Server } from 'node:http';
import type { ClientWsMessage, ServerWsMessage, SupportedLanguage, WordToken } from '../../../shared/types.js';
import type { ServerConfig } from '../config.js';

const ALLOWED_LANGUAGES = new Set<SupportedLanguage>(['multi', 'en-IN', 'hi', 'te']);

interface DeepgramWord {
  word?: string;
  punctuated_word?: string;
  confidence?: number;
  start?: number;
  end?: number;
  language?: string;
}

interface DeepgramResultPayload {
  type?: string;
  is_final?: boolean;
  speech_final?: boolean;
  channel?: {
    alternatives?: Array<{
      transcript?: string;
      confidence?: number;
      words?: DeepgramWord[];
      languages?: string[];
    }>;
  };
}

function sendJson(ws: WebSocket, payload: ServerWsMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function attachTranscriptionWebSocket(server: Server, config: ServerConfig): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws/transcribe', maxPayload: 128 * 1024 });
  const activeConnectionsByIp = new Map<string, number>();
  const MAX_CONCURRENT_PER_IP = 5;
  const MAX_SESSION_DURATION_MS = 20 * 60 * 1000;

  wss.on('connection', (clientWs: WebSocket, req: IncomingMessage) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    const currentCount = activeConnectionsByIp.get(clientIp) ?? 0;
    if (currentCount >= MAX_CONCURRENT_PER_IP) {
      sendJson(clientWs, {
        type: 'error',
        code: 'TOO_MANY_SESSIONS',
        message: 'Too many concurrent transcription sessions from this IP.',
        recoverable: false,
      });
      clientWs.close(1008, 'Rate limit exceeded');
      return;
    }
    activeConnectionsByIp.set(clientIp, currentCount + 1);

    let deepgramWs: WebSocket | null = null;
    let keepAliveTimer: NodeJS.Timeout | null = null;
    let sessionLimitTimer: NodeJS.Timeout | null = null;
    let activeLanguage: SupportedLanguage = 'multi';
    let activeSampleRate = 16000;
    let clientClosed = false;
    let reconnectAttempts = 0;
    let lastFinalSignature = '';
    const maxReconnectAttempts = 2;

    const cleanupDeepgram = () => {
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      if (deepgramWs) {
        try {
          if (deepgramWs.readyState === WebSocket.OPEN) {
            deepgramWs.send(JSON.stringify({ type: 'CloseStream' }));
          }
          deepgramWs.close();
        } catch {
          // ignore close errors
        }
        deepgramWs = null;
      }
    };

    const connectDeepgram = () => {
      if (clientClosed) return;
      if (!config.deepgramApiKey) {
        sendJson(clientWs, {
          type: 'error',
          code: 'DEEPGRAM_NOT_CONFIGURED',
          message:
            'Live speech recognition is not configured (missing DEEPGRAM_API_KEY). You can use Interactive Demo Mode or configure DEEPGRAM_API_KEY on the server.',
          recoverable: false,
        });
        return;
      }

      sendJson(clientWs, {
        type: 'status',
        status: reconnectAttempts > 0 ? 'reconnecting' : 'connecting',
        message:
          reconnectAttempts > 0
            ? `Reconnecting speech recognition (${reconnectAttempts}/${maxReconnectAttempts})...`
            : 'Connecting to Deepgram Nova-3...',
      });

      const params = new URLSearchParams({
        model: 'nova-3',
        language: activeLanguage,
        encoding: 'linear16',
        sample_rate: String(activeSampleRate),
        channels: '1',
        interim_results: 'true',
        punctuate: 'true',
        smart_format: 'true',
        utterance_end_ms: '1200',
      });

      const dgUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
      deepgramWs = new WebSocket(dgUrl, {
        headers: {
          Authorization: `Token ${config.deepgramApiKey}`,
        },
      });

      deepgramWs.on('open', () => {
        reconnectAttempts = 0;
        sendJson(clientWs, {
          type: 'ready',
          provider: 'Deepgram Nova-3',
          language: activeLanguage,
        });
        sendJson(clientWs, {
          type: 'status',
          status: 'connected',
          message: 'Connected to Deepgram Nova-3',
        });

        keepAliveTimer = setInterval(() => {
          if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
            deepgramWs.send(JSON.stringify({ type: 'KeepAlive' }));
          }
        }, 8000);

        if (!sessionLimitTimer) {
          sessionLimitTimer = setTimeout(() => {
            sendJson(clientWs, {
              type: 'error',
              code: 'SESSION_LIMIT_REACHED',
              message: 'Maximum live session duration (20 minutes) reached. Finalizing captions.',
              recoverable: false,
            });
            cleanupDeepgram();
            clientWs.close(1000, 'Session duration limit');
          }, MAX_SESSION_DURATION_MS);
        }
      });

      deepgramWs.on('message', (data: WebSocket.RawData) => {
        try {
          const parsed = JSON.parse(data.toString()) as DeepgramResultPayload;
          if (parsed.type !== 'Results') return;

          const alt = parsed.channel?.alternatives?.[0];
          if (!alt) return;

          const transcript = (alt.transcript ?? '').trim();
          const isFinal = Boolean(parsed.is_final || parsed.speech_final);
          const rawWords = alt.words ?? [];

          const hasConfidenceData =
            rawWords.length > 0 && rawWords.every((w) => typeof w.confidence === 'number');

          const words: WordToken[] = rawWords.map((w) => ({
            word: w.word ?? '',
            punctuatedWord: w.punctuated_word ?? w.word ?? '',
            confidence: typeof w.confidence === 'number' ? w.confidence : null,
            start: w.start,
            end: w.end,
            language: w.language,
          }));

          // Detect unrecognizable audio: final result with empty transcript but speech_final or very low alt confidence
          if (isFinal && !transcript && parsed.speech_final) {
            return;
          }
          if (!transcript) return;

          if (isFinal) {
            const firstStart = words[0]?.start ?? '';
            const signature = `${firstStart}:${transcript}`;
            if (signature === lastFinalSignature) {
              return;
            }
            lastFinalSignature = signature;
          }

          const avgConfidence =
            hasConfidenceData && words.length > 0
              ? words.reduce((sum, w) => sum + (w.confidence ?? 1), 0) / words.length
              : typeof alt.confidence === 'number'
                ? alt.confidence
                : null;

          const isUnclearAudio = isFinal && avgConfidence !== null && avgConfidence < 0.25;

          sendJson(clientWs, {
            type: 'transcript',
            text: isUnclearAudio ? 'Audio unclear — please check this section.' : transcript,
            isFinal,
            words,
            hasConfidenceData,
            languageDetected: alt.languages?.[0] ?? words.find((w) => w.language)?.language,
            isUnclearAudio,
          });
        } catch {
          // Ignore malformed non-Results frames
        }
      });

      deepgramWs.on('error', (err) => {
        console.error('[DeepgramProxy] Upstream WebSocket error:', err.message);
      });

      deepgramWs.on('close', (code) => {
        if (keepAliveTimer) {
          clearInterval(keepAliveTimer);
          keepAliveTimer = null;
        }
        deepgramWs = null;

        if (clientClosed) return;

        // 1000 = normal close
        if (code === 1000) {
          sendJson(clientWs, { type: 'status', status: 'closed' });
          return;
        }

        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts += 1;
          setTimeout(() => connectDeepgram(), 1000 * reconnectAttempts);
        } else {
          sendJson(clientWs, {
            type: 'error',
            code: 'DEEPGRAM_DISCONNECTED',
            message: 'Speech recognition connection was lost. Preserving finalized captions.',
            recoverable: true,
          });
        }
      });
    };

    clientWs.on('message', (data: WebSocket.RawData, isBinary: boolean) => {
      if (isBinary) {
        if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
          deepgramWs.send(data);
        }
        return;
      }

      try {
        const msg = JSON.parse(data.toString()) as ClientWsMessage;
        if (msg.type === 'start') {
          activeLanguage = ALLOWED_LANGUAGES.has(msg.language) ? msg.language : 'multi';
          activeSampleRate =
            Number.isFinite(msg.sampleRate) && msg.sampleRate >= 8000 && msg.sampleRate <= 48000
              ? msg.sampleRate
              : 16000;
          cleanupDeepgram();
          reconnectAttempts = 0;
          connectDeepgram();
        } else if (msg.type === 'stop') {
          cleanupDeepgram();
          sendJson(clientWs, { type: 'status', status: 'closed' });
        } else if (msg.type === 'ping') {
          sendJson(clientWs, { type: 'pong' });
        }
      } catch {
        sendJson(clientWs, {
          type: 'error',
          code: 'INVALID_WS_MESSAGE',
          message: 'Invalid WebSocket control message.',
          recoverable: true,
        });
      }
    });

    clientWs.on('close', () => {
      clientClosed = true;
      if (sessionLimitTimer) {
        clearTimeout(sessionLimitTimer);
        sessionLimitTimer = null;
      }
      const count = activeConnectionsByIp.get(clientIp) ?? 1;
      if (count <= 1) activeConnectionsByIp.delete(clientIp);
      else activeConnectionsByIp.set(clientIp, count - 1);
      cleanupDeepgram();
    });
  });

  return wss;
}
