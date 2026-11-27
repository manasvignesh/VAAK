import { Router } from 'express';
import { z } from 'zod';
import type { ServerConfig } from '../config.js';
import { GeminiServiceError, generateEvidenceLinkedNotes } from '../services/geminiService.js';
import { createIpRateLimiter } from '../middleware/rateLimit.js';
import type { TranscriptSegment } from '../../../shared/types.js';

const SegmentSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  timestampMs: z.number().nonnegative(),
  createdAtIso: z.string(),
  originalText: z.string(),
  correctedText: z.string().optional(),
  isFinal: z.boolean(),
  words: z.array(z.any()).default([]),
  hasConfidenceData: z.boolean().default(false),
  isUnclearAudio: z.boolean().optional(),
  isGapMarker: z.boolean().optional(),
  isVoiceCommand: z.boolean().optional(),
  languageDetected: z.string().optional(),
  highlightType: z.enum(['important', 'definition', 'explanation']).optional(),
  isBookmarked: z.boolean().optional(),
  bookmarkLabel: z.string().optional(),
});

const NotesRequestSchema = z.object({
  sessionId: z.string().min(1),
  sessionTitle: z.string().trim().min(1).max(200),
  segments: z.array(SegmentSchema).min(1).max(1000),
});

export function createNotesRouter(config: ServerConfig): Router {
  const router = Router();
  const limiter = createIpRateLimiter({
    windowMs: 60_000,
    maxRequests: 10,
    message: 'Too many study-note generation requests from this IP. Please wait a minute and retry.',
  });

  router.post('/notes', limiter, async (req, res) => {
    const parsed = NotesRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Provide a valid sessionId, sessionTitle, and at least one transcript segment.',
      });
      return;
    }

    try {
      const notes = await generateEvidenceLinkedNotes(
        config,
        parsed.data.sessionId,
        parsed.data.sessionTitle,
        parsed.data.segments as TranscriptSegment[]
      );
      res.json(notes);
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        res.status(err.statusCode).json({ error: err.code, message: err.message });
        return;
      }
      res.status(502).json({
        error: 'NOTES_GENERATION_FAILED',
        message: 'Could not generate study notes right now. Your transcript is safely preserved and can be exported or retried.',
      });
    }
  });

  return router;
}
