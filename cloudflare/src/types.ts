export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  QUOTA_GUARD: DurableObjectNamespace;
  DEEPGRAM_API_KEY?: string;
  GEMINI_API_KEY?: string;
  LIVE_SERVICES_ENABLED?: string;
  GEMINI_MODEL?: string;
  GEMINI_FALLBACK_MODEL?: string;
  GLOBAL_DAILY_AI_LIMIT?: string;
  GLOBAL_DAILY_AUDIO_MINUTES?: string;
  GLOBAL_MAX_CONCURRENT_WS?: string;
}

export function isLiveEnabled(env: Env): boolean {
  return (env.LIVE_SERVICES_ENABLED ?? 'true').trim().toLowerCase() !== 'false';
}

export function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
