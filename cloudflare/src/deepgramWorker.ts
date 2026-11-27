import type { ClientWsMessage, ServerWsMessage, SupportedLanguage, WordToken } from '../../shared/types.js';
import { isLiveEnabled, parsePositiveInt, type Env } from './types.js';

const ALLOWED_LANGUAGES = new Set<SupportedLanguage>(['multi', 'en-IN', 'hi', 'te']);

function sendWsJson(ws: WebSocket, payload: ServerWsMessage): void {
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    // ignore closed socket
  }
}

export async function handleWorkerWebSocket(request: Request, env: Env): Promise<Response> {
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  const pair = new WebSocketPair();
  const [clientWs, serverWs] = Object.values(pair) as [WebSocket, WebSocket];
  serverWs.accept();

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const quotaId = env.QUOTA_GUARD.idFromName('global');
  const quotaStub = env.QUOTA_GUARD.get(quotaId);

  if (!isLiveEnabled(env) || !env.DEEPGRAM_API_KEY?.trim()) {
    sendWsJson(serverWs, {
      type: 'error',
      code: !isLiveEnabled(env) ? 'LIVE_SERVICES_DISABLED' : 'DEEPGRAM_NOT_CONFIGURED',
      message: !isLiveEnabled(env)
        ? 'Live speech recognition is temporarily paused. Interactive Demo Mode remains available.'
        : 'Live speech recognition is not configured (missing DEEPGRAM_API_KEY). Use Interactive Demo Mode.',
      recoverable: false,
    });
    serverWs.close(1008, 'Unavailable');
    return new Response(null, { status: 101, webSocket: clientWs });
  }

  const maxAudioMinutes = parsePositiveInt(env.GLOBAL_DAILY_AUDIO_MINUTES, 120);
  const maxGlobalWs = parsePositiveInt(env.GLOBAL_MAX_CONCURRENT_WS, 25);
  let activeSampleRate = 16000;
  let reserved = false;
  let deepgramWs: WebSocket | null = null;
  let lastFinalSignature = '';
  let sessionTimer: ReturnType<typeof setTimeout> | null = null;

  const releaseSlot = async () => {
    if (sessionTimer) {
      clearTimeout(sessionTimer);
      sessionTimer = null;
    }
    if (deepgramWs) {
      try {
        deepgramWs.close(1000, 'Session ended');
      } catch {
        // ignore
      }
      deepgramWs = null;
    }
    if (reserved) {
      reserved = false;
      await quotaStub
        .fetch('https://quota-guard/ws-release', {
          method: 'POST',
          body: JSON.stringify({ ip }),
        })
        .catch(() => {});
    }
  };

  serverWs.addEventListener('message', async (event) => {
    const data = event.data;
    if (typeof data !== 'string') {
      const byteLen = data instanceof ArrayBuffer ? data.byteLength : 0;
      const maxAudioBytesDaily = maxAudioMinutes * 60 * activeSampleRate * 2;
      const checkRes = await quotaStub.fetch('https://quota-guard/ws-audio', {
        method: 'POST',
        body: JSON.stringify({ bytes: byteLen, maxAudioBytesDaily }),
      });
      if (!checkRes.ok) {
        sendWsJson(serverWs, {
          type: 'error',
          code: 'GLOBAL_AUDIO_BUDGET_EXCEEDED',
          message:
            'Daily live speech-recognition audio budget reached. Interactive Demo Mode remains available.',
          recoverable: false,
        });
        await releaseSlot();
        serverWs.close(1008, 'Budget exceeded');
        return;
      }
      if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
        deepgramWs.send(data);
      }
      return;
    }

    try {
      const msg = JSON.parse(data) as ClientWsMessage;
      if (msg.type === 'ping') {
        sendWsJson(serverWs, { type: 'pong' });
        return;
      }
      if (msg.type === 'stop') {
        await releaseSlot();
        sendWsJson(serverWs, { type: 'status', status: 'closed' });
        return;
      }
      if (msg.type === 'start') {
        const language = ALLOWED_LANGUAGES.has(msg.language) ? msg.language : 'multi';
        activeSampleRate =
          Number.isFinite(msg.sampleRate) && msg.sampleRate >= 8000 && msg.sampleRate <= 48000
            ? msg.sampleRate
            : 16000;

        if (!reserved) {
          const reserveRes = await quotaStub.fetch('https://quota-guard/ws-reserve', {
            method: 'POST',
            body: JSON.stringify({
              ip,
              maxPerIp: 5,
              maxGlobal: maxGlobalWs,
              maxAudioBytesDaily: maxAudioMinutes * 60 * activeSampleRate * 2,
            }),
          });
          if (!reserveRes.ok) {
            const errBody = (await reserveRes.json()) as { code?: string; message?: string };
            sendWsJson(serverWs, {
              type: 'error',
              code: errBody.code || 'RATE_LIMIT_EXCEEDED',
              message: errBody.message || 'Live transcription limit reached.',
              recoverable: false,
            });
            serverWs.close(1008, 'Limit reached');
            return;
          }
          reserved = true;
        }

        const params = new URLSearchParams({
          model: 'nova-3',
          language,
          encoding: 'linear16',
          sample_rate: String(activeSampleRate),
          channels: '1',
          interim_results: 'true',
          punctuate: 'true',
          smart_format: 'true',
          utterance_end_ms: '1200',
        });

        const dgRes = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
          headers: {
            Upgrade: 'websocket',
            Authorization: `Token ${env.DEEPGRAM_API_KEY!.trim()}`,
          },
        });

        const upstreamWs = dgRes.webSocket;
        if (!upstreamWs) {
          sendWsJson(serverWs, {
            type: 'error',
            code: 'DEEPGRAM_CONNECT_FAILED',
            message: 'Unable to connect to Deepgram speech recognition.',
            recoverable: true,
          });
          return;
        }

        upstreamWs.accept();
        deepgramWs = upstreamWs;
        sendWsJson(serverWs, { type: 'ready', provider: 'Deepgram Nova-3', language });
        sendWsJson(serverWs, {
          type: 'status',
          status: 'connected',
          message: 'Connected to Deepgram Nova-3',
        });

        sessionTimer = setTimeout(() => {
          sendWsJson(serverWs, {
            type: 'error',
            code: 'SESSION_LIMIT_REACHED',
            message: 'Maximum live session duration (20 minutes) reached.',
            recoverable: false,
          });
          void releaseSlot();
          serverWs.close(1000, 'Session limit');
        }, 20 * 60 * 1000);

        upstreamWs.addEventListener('message', (dgEvent) => {
          if (typeof dgEvent.data !== 'string') return;
          try {
            const parsed = JSON.parse(dgEvent.data) as {
              type?: string;
              is_final?: boolean;
              speech_final?: boolean;
              channel?: {
                alternatives?: Array<{
                  transcript?: string;
                  confidence?: number;
                  words?: Array<{
                    word?: string;
                    punctuated_word?: string;
                    confidence?: number;
                    start?: number;
                    end?: number;
                    language?: string;
                  }>;
                  languages?: string[];
                }>;
              };
            };
            if (parsed.type !== 'Results') return;
            const alt = parsed.channel?.alternatives?.[0];
            const transcript = (alt?.transcript ?? '').trim();
            if (!transcript) return;

            const isFinal = Boolean(parsed.is_final || parsed.speech_final);
            const rawWords = alt?.words ?? [];
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

            if (isFinal) {
              const sig = `${words[0]?.start ?? ''}:${transcript}`;
              if (sig === lastFinalSignature) return;
              lastFinalSignature = sig;
            }

            const avgConfidence =
              hasConfidenceData && words.length > 0
                ? words.reduce((s, w) => s + (w.confidence ?? 1), 0) / words.length
                : typeof alt?.confidence === 'number'
                  ? alt.confidence
                  : null;
            const isUnclearAudio = isFinal && avgConfidence !== null && avgConfidence < 0.25;

            sendWsJson(serverWs, {
              type: 'transcript',
              text: isUnclearAudio ? 'Audio unclear — please check this section.' : transcript,
              isFinal,
              words,
              hasConfidenceData,
              languageDetected: alt?.languages?.[0] ?? words.find((w) => w.language)?.language,
              isUnclearAudio,
            });
          } catch {
            // ignore non-Results frames
          }
        });

        upstreamWs.addEventListener('close', () => {
          sendWsJson(serverWs, { type: 'status', status: 'closed' });
        });
      }
    } catch {
      sendWsJson(serverWs, {
        type: 'error',
        code: 'INVALID_WS_MESSAGE',
        message: 'Invalid WebSocket control message.',
        recoverable: true,
      });
    }
  });

  serverWs.addEventListener('close', () => {
    void releaseSlot();
  });

  return new Response(null, { status: 101, webSocket: clientWs });
}
