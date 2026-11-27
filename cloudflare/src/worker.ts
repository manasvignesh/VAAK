import type { AppCapabilities, TranscriptSegment, TranslationLanguage } from '../../shared/types.js';
import { handleWorkerWebSocket } from './deepgramWorker.js';
import {
  askLectureOnWorker,
  generateNotesOnWorker,
  translateOnWorker,
  WorkerGeminiError,
} from './geminiHttp.js';
import { QuotaGuardDO } from './quotaGuardDO.js';
import { isLiveEnabled, parsePositiveInt, type Env } from './types.js';

export { QuotaGuardDO };

function getCapabilities(env: Env): AppCapabilities {
  const live = isLiveEnabled(env);
  const model = env.GEMINI_MODEL?.trim() || 'gemini-flash-latest';
  return {
    speechToTextConfigured: live && Boolean(env.DEEPGRAM_API_KEY?.trim()),
    speechToTextProvider: 'Deepgram Nova-3 Multilingual',
    aiNotesAndTranslationConfigured: live && Boolean(env.GEMINI_API_KEY?.trim()),
    aiProvider: `Google Gemini (${model})`,
    demoModeAvailable: true,
    supportedLanguages: [
      { code: 'multi', label: 'Multilingual (English + Hindi + Telugu)' },
      { code: 'en-IN', label: 'Indian English (en-IN)' },
      { code: 'hi', label: 'Hindi (हिन्दी)' },
      { code: 'te', label: 'Telugu (తెలుగు)' },
    ],
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return Response.json({
        ok: true,
        status: 'healthy',
        runtime: 'cloudflare-workers',
        timestamp: new Date().toISOString(),
        capabilities: getCapabilities(env),
      });
    }

    if (url.pathname === '/api/capabilities' && request.method === 'GET') {
      return Response.json(getCapabilities(env));
    }

    if (url.pathname === '/ws/transcribe') {
      return handleWorkerWebSocket(request, env);
    }

    if (
      (url.pathname === '/api/translate' ||
        url.pathname === '/api/notes' ||
        url.pathname === '/api/ask') &&
      request.method === 'POST'
    ) {
      if (!isLiveEnabled(env)) {
        return Response.json(
          {
            error: 'LIVE_SERVICES_DISABLED',
            message:
              'Live AI services are temporarily paused. Interactive Demo Mode and local basic notes remain available.',
          },
          { status: 503 }
        );
      }

      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const quotaStub = env.QUOTA_GUARD.get(env.QUOTA_GUARD.idFromName('global'));
      const checkRes = await quotaStub.fetch('https://quota-guard/ai-check', {
        method: 'POST',
        body: JSON.stringify({
          ip,
          route: url.pathname,
          maxPerIpMin: url.pathname === '/api/translate' ? 30 : 10,
          maxDailyGlobal: parsePositiveInt(env.GLOBAL_DAILY_AI_LIMIT, 250),
        }),
      });
      if (!checkRes.ok) {
        const errBody = (await checkRes.json()) as { code?: string; message?: string };
        return Response.json(
          {
            error: errBody.code || 'RATE_LIMIT_EXCEEDED',
            message: errBody.message || 'AI usage limit reached.',
          },
          { status: 429 }
        );
      }

      try {
        if (url.pathname === '/api/translate') {
          const body = (await request.json()) as {
            text?: string;
            targetLanguage?: TranslationLanguage;
          };
          if (
            !body.text?.trim() ||
            body.text.length > 2000 ||
            !['en', 'hi', 'te'].includes(body.targetLanguage ?? '')
          ) {
            return Response.json(
              {
                error: 'INVALID_REQUEST',
                message: 'Provide non-empty text (<= 2000 chars) and targetLanguage (en, hi, or te).',
              },
              { status: 400 }
            );
          }
          const result = await translateOnWorker(env, body.text.trim(), body.targetLanguage!);
          return Response.json({
            ...result,
            targetLanguage: body.targetLanguage,
            isDemo: false,
          });
        }

        if (url.pathname === '/api/ask') {
          const body = (await request.json()) as {
            sessionTitle?: string;
            question?: string;
            previousAnswer?: string;
            segments?: TranscriptSegment[];
          };
          if (
            !body.sessionTitle?.trim() ||
            !body.question?.trim() ||
            !Array.isArray(body.segments) ||
            body.segments.length === 0
          ) {
            return Response.json(
              {
                error: 'INVALID_REQUEST',
                message: 'Provide a valid sessionTitle, question, and transcript segments.',
              },
              { status: 400 }
            );
          }
          const qa = await askLectureOnWorker(
            env,
            body.sessionTitle.trim(),
            body.question.trim(),
            body.segments,
            body.previousAnswer
          );
          return Response.json(qa);
        }

        const body = (await request.json()) as {
          sessionId?: string;
          sessionTitle?: string;
          segments?: TranscriptSegment[];
        };
        if (
          !body.sessionId?.trim() ||
          !body.sessionTitle?.trim() ||
          !Array.isArray(body.segments) ||
          body.segments.length === 0 ||
          body.segments.length > 1000
        ) {
          return Response.json(
            {
              error: 'INVALID_REQUEST',
              message: 'Provide a valid sessionId, sessionTitle, and at least one transcript segment.',
            },
            { status: 400 }
          );
        }
        const notes = await generateNotesOnWorker(
          env,
          body.sessionId.trim(),
          body.sessionTitle.trim(),
          body.segments
        );
        return Response.json(notes);
      } catch (err) {
        if (err instanceof WorkerGeminiError) {
          return Response.json({ error: err.code, message: err.message }, { status: err.statusCode });
        }
        return Response.json(
          { error: 'AI_PROVIDER_ERROR', message: 'AI request failed. Your transcript is preserved.' },
          { status: 502 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};
