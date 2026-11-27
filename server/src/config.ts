import 'dotenv/config';
import type { AppCapabilities } from '../../shared/types.js';

export interface ServerConfig {
  port: number;
  deepgramApiKey: string | null;
  geminiApiKey: string | null;
  geminiModel: string;
  geminiFallbackModel: string | null;
}

export function loadConfig(): ServerConfig {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY?.trim() || null;
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || null;
  const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-flash-latest';
  const geminiFallbackModel =
    process.env.GEMINI_FALLBACK_MODEL?.trim() || 'gemini-flash-lite-latest';

  return {
    port: Number.isFinite(port) && port > 0 ? port : 3000,
    deepgramApiKey,
    geminiApiKey,
    geminiModel,
    geminiFallbackModel: geminiFallbackModel !== geminiModel ? geminiFallbackModel : null,
  };
}

export function getCapabilities(config: ServerConfig): AppCapabilities {
  return {
    speechToTextConfigured: Boolean(config.deepgramApiKey),
    speechToTextProvider: 'Deepgram Nova-3 Multilingual',
    aiNotesAndTranslationConfigured: Boolean(config.geminiApiKey),
    aiProvider: `Google Gemini (${config.geminiModel})`,
    demoModeAvailable: true,
    supportedLanguages: [
      { code: 'multi', label: 'Multilingual (English + Hindi + Telugu)' },
      { code: 'en-IN', label: 'Indian English (en-IN)' },
      { code: 'hi', label: 'Hindi (हिन्दी)' },
      { code: 'te', label: 'Telugu (తెలుగు)' },
    ],
  };
}
