import { DurableObject } from 'cloudflare:workers';
import type { Env } from './types.js';

export class QuotaGuardDO extends DurableObject<Env> {
  private initialized = false;

  private ensureSchema(): void {
    if (this.initialized) return;
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS daily_counters (
        day_key TEXT PRIMARY KEY,
        ai_count INTEGER NOT NULL DEFAULT 0,
        audio_bytes INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS ip_windows (
        ip_key TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ws_slots (
        ip TEXT PRIMARY KEY,
        active_count INTEGER NOT NULL DEFAULT 0
      );
    `);
    this.initialized = true;
  }

  private getOrCreateToday(): { dayKey: string; aiCount: number; audioBytes: number } {
    const dayKey = new Date().toISOString().slice(0, 10);
    const rows = [
      ...this.ctx.storage.sql.exec<{ day_key: string; ai_count: number; audio_bytes: number }>(
        'SELECT day_key, ai_count, audio_bytes FROM daily_counters WHERE day_key = ?',
        dayKey
      ),
    ];
    if (rows.length > 0) {
      return {
        dayKey: rows[0].day_key,
        aiCount: rows[0].ai_count,
        audioBytes: rows[0].audio_bytes,
      };
    }
    this.ctx.storage.sql.exec(
      'INSERT INTO daily_counters (day_key, ai_count, audio_bytes) VALUES (?, 0, 0)',
      dayKey
    );
    return { dayKey, aiCount: 0, audioBytes: 0 };
  }

  override async fetch(request: Request): Promise<Response> {
    this.ensureSchema();
    const url = new URL(request.url);

    if (request.method !== 'POST') {
      return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    }

    if (url.pathname === '/ai-check') {
      const body = (await request.json()) as {
        ip: string;
        route: string;
        maxPerIpMin: number;
        maxDailyGlobal: number;
      };
      const now = Date.now();
      const ipKey = `${body.route}:${body.ip}`;
      const winRows = [
        ...this.ctx.storage.sql.exec<{ window_start: number; count: number }>(
          'SELECT window_start, count FROM ip_windows WHERE ip_key = ?',
          ipKey
        ),
      ];
      if (winRows.length > 0 && now - winRows[0].window_start < 60_000) {
        if (winRows[0].count >= body.maxPerIpMin) {
          return Response.json(
            {
              allowed: false,
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests from this IP. Please wait a minute and retry.',
            },
            { status: 429 }
          );
        }
        this.ctx.storage.sql.exec(
          'UPDATE ip_windows SET count = count + 1 WHERE ip_key = ?',
          ipKey
        );
      } else {
        this.ctx.storage.sql.exec(
          'INSERT OR REPLACE INTO ip_windows (ip_key, window_start, count) VALUES (?, ?, 1)',
          ipKey,
          now
        );
      }

      const today = this.getOrCreateToday();
      if (today.aiCount >= body.maxDailyGlobal) {
        return Response.json(
          {
            allowed: false,
            code: 'GLOBAL_BUDGET_EXCEEDED',
            message:
              'Daily public AI usage budget reached. Interactive Demo Mode and local basic notes remain available.',
          },
          { status: 429 }
        );
      }

      this.ctx.storage.sql.exec(
        'UPDATE daily_counters SET ai_count = ai_count + 1 WHERE day_key = ?',
        today.dayKey
      );
      return Response.json({ allowed: true });
    }

    if (url.pathname === '/ws-reserve') {
      const body = (await request.json()) as {
        ip: string;
        maxPerIp: number;
        maxGlobal: number;
        maxAudioBytesDaily: number;
      };
      const today = this.getOrCreateToday();
      if (today.audioBytes >= body.maxAudioBytesDaily) {
        return Response.json(
          {
            allowed: false,
            code: 'GLOBAL_AUDIO_BUDGET_EXCEEDED',
            message:
              'Daily live speech-recognition audio budget reached. Interactive Demo Mode remains available.',
          },
          { status: 429 }
        );
      }

      const totalRow = [
        ...this.ctx.storage.sql.exec<{ total: number | null }>(
          'SELECT SUM(active_count) AS total FROM ws_slots'
        ),
      ];
      const totalActive = totalRow[0]?.total ?? 0;
      if (totalActive >= body.maxGlobal) {
        return Response.json(
          {
            allowed: false,
            code: 'GLOBAL_WS_CAPACITY_REACHED',
            message: 'Live transcription capacity reached. Please use Interactive Demo Mode or retry shortly.',
          },
          { status: 429 }
        );
      }

      const ipRow = [
        ...this.ctx.storage.sql.exec<{ active_count: number }>(
          'SELECT active_count FROM ws_slots WHERE ip = ?',
          body.ip
        ),
      ];
      const ipActive = ipRow[0]?.active_count ?? 0;
      if (ipActive >= body.maxPerIp) {
        return Response.json(
          {
            allowed: false,
            code: 'TOO_MANY_SESSIONS',
            message: 'Too many concurrent transcription sessions from this IP.',
          },
          { status: 429 }
        );
      }

      this.ctx.storage.sql.exec(
        'INSERT OR REPLACE INTO ws_slots (ip, active_count) VALUES (?, ?)',
        body.ip,
        ipActive + 1
      );
      return Response.json({ allowed: true });
    }

    if (url.pathname === '/ws-audio') {
      const body = (await request.json()) as { bytes: number; maxAudioBytesDaily: number };
      const today = this.getOrCreateToday();
      if (today.audioBytes >= body.maxAudioBytesDaily) {
        return Response.json({ allowed: false, code: 'GLOBAL_AUDIO_BUDGET_EXCEEDED' }, { status: 429 });
      }
      this.ctx.storage.sql.exec(
        'UPDATE daily_counters SET audio_bytes = audio_bytes + ? WHERE day_key = ?',
        body.bytes,
        today.dayKey
      );
      return Response.json({ allowed: true });
    }

    if (url.pathname === '/ws-release') {
      const body = (await request.json()) as { ip: string };
      const ipRow = [
        ...this.ctx.storage.sql.exec<{ active_count: number }>(
          'SELECT active_count FROM ws_slots WHERE ip = ?',
          body.ip
        ),
      ];
      const ipActive = ipRow[0]?.active_count ?? 0;
      if (ipActive <= 1) {
        this.ctx.storage.sql.exec('DELETE FROM ws_slots WHERE ip = ?', body.ip);
      } else {
        this.ctx.storage.sql.exec(
          'UPDATE ws_slots SET active_count = active_count - 1 WHERE ip = ?',
          body.ip
        );
      }
      return Response.json({ released: true });
    }

    return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
}
