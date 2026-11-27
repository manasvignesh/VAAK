import { Router } from 'express';
import { z } from 'zod';
import type { ServerConfig } from '../config.js';
import { answerLectureQuestion, GeminiServiceError } from '../services/geminiService.js';
import { createIpRateLimiter } from '../middleware/rateLimit.js';
import type { TranscriptSegment } from '../../../shared/types.js';

const AskRequestSchema = z.object({
  sessionTitle: z.string().trim().min(1).max(200),
  question: z.string().trim().min(1).max(1000),
  previousAnswer: z.string().max(2000).optional(),
  segments: z.array(z.any()).min(1).max(1000),
});

export function createAskRouter(config: ServerConfig): Router {
  const router = Router();
  const limiter = createIpRateLimiter({
    windowMs: 60_000,
    maxRequests: 20,
    message: 'Too many lecture questions from this IP. Please wait a minute and retry.',
  });

  router.post('/ask', limiter, async (req, res) => {
    const parsed = AskRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Provide a valid sessionTitle, question, and transcript segments.',
      });
      return;
    }

    try {
      const result = await answerLectureQuestion(
        config,
        parsed.data.sessionTitle,
        parsed.data.question,
        parsed.data.segments as TranscriptSegment[],
        parsed.data.previousAnswer
      );
      res.json(result);
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        res.status(err.statusCode).json({ error: err.code, message: err.message });
        return;
      }
      res.status(502).json({
        error: 'LECTURE_QA_FAILED',
        message: 'Unable to answer that question right now. Your saved transcript is preserved.',
      });
    }
  });

  return router;
}
