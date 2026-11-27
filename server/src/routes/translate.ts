import { Router } from 'express';
import { z } from 'zod';
import type { ServerConfig } from '../config.js';
import { GeminiServiceError, translateClassroomText } from '../services/geminiService.js';
import { createIpRateLimiter } from '../middleware/rateLimit.js';

const TranslateRequestSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  targetLanguage: z.enum(['en', 'hi', 'te']),
});

export function createTranslateRouter(config: ServerConfig): Router {
  const router = Router();
  const limiter = createIpRateLimiter({
    windowMs: 60_000,
    maxRequests: 30,
    message: 'Too many translation requests from this IP. Please wait a minute and retry.',
  });

  router.post('/translate', limiter, async (req, res) => {
    const parsed = TranslateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Provide non-empty text (<= 2000 chars) and targetLanguage (en, hi, or te).',
      });
      return;
    }

    try {
      const result = await translateClassroomText(
        config,
        parsed.data.text,
        parsed.data.targetLanguage
      );
      res.json({
        ...result,
        targetLanguage: parsed.data.targetLanguage,
        isDemo: false,
      });
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        res.status(err.statusCode).json({ error: err.code, message: err.message });
        return;
      }
      res.status(502).json({
        error: 'TRANSLATION_FAILED',
        message: 'Unable to translate caption right now. Your original transcript is preserved.',
      });
    }
  });

  return router;
}
