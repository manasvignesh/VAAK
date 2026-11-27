import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import type {
  LectureQaResponse,
  StudyNotes,
  TranscriptSegment,
  TranslationLanguage,
} from '../../../shared/types.js';
import {
  buildLectureQaPrompt,
  buildNotesPrompt,
  buildTranslationPrompt,
  TRANSLATION_LANGUAGE_NAMES,
  validateAndGroundNotes,
  validateAndGroundQaResponse,
} from '../../../shared/notesGrounding.js';
import type { ServerConfig } from '../config.js';

export { validateAndGroundNotes };

const TranslationResponseSchema = z.object({
  translatedText: z.string().min(1),
  sourceLanguageDetected: z.string().optional(),
});

const RawNoteItemSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  unverified: z.boolean().default(false),
  segmentIds: z.array(z.string()).default([]),
});

const RawNotesResponseSchema = z.object({
  topicHeadings: z.array(z.string()).default([]),
  keyConcepts: z.array(RawNoteItemSchema).default([]),
  importantDefinitions: z.array(RawNoteItemSchema).default([]),
  lessonSummary: z.array(RawNoteItemSchema).default([]),
  highlightedExplanations: z.array(RawNoteItemSchema).default([]),
  bookmarkedMoments: z.array(RawNoteItemSchema).default([]),
  unclearOrUnverified: z.array(RawNoteItemSchema).default([]),
});

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class GeminiServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'GeminiServiceError';
  }
}

export async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label: string,
  maxRetries = 1
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await withTimeout(fn(), timeoutMs, label);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: unknown }).status)
          : undefined;

      if (status === 429 || /429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(msg)) {
        throw new GeminiServiceError(
          'AI_RATE_LIMITED',
          'AI service is temporarily rate-limited. Please wait a moment and retry. Your transcript is preserved.',
          429
        );
      }

      if (/timed out/i.test(msg)) {
        if (attempt < maxRetries) {
          attempt += 1;
          continue;
        }
        throw new GeminiServiceError(
          'AI_TIMEOUT',
          `${label} timed out. Your transcript is preserved and you can retry.`,
          504
        );
      }

      if (attempt < maxRetries && (!status || status >= 500)) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }

      throw new GeminiServiceError(
        'AI_PROVIDER_ERROR',
        `${label} failed. Your transcript is preserved.`,
        502
      );
    }
  }
}

export async function callWithModelFallback<T>(
  config: ServerConfig,
  label: string,
  timeoutMs: number,
  invoke: (model: string) => Promise<T>
): Promise<T> {
  try {
    return await callGeminiWithRetry(() => invoke(config.geminiModel), timeoutMs, label, 0);
  } catch (err) {
    // Do not hammer quota on 429 rate limits; only fall back on non-429 errors when fallback exists
    if (
      err instanceof GeminiServiceError &&
      err.code !== 'AI_RATE_LIMITED' &&
      config.geminiFallbackModel
    ) {
      return await callGeminiWithRetry(
        () => invoke(config.geminiFallbackModel!),
        timeoutMs,
        `${label} (fallback)`,
        0
      );
    }
    throw err;
  }
}

export async function translateClassroomText(
  config: ServerConfig,
  text: string,
  targetLanguage: TranslationLanguage
): Promise<{ translatedText: string; sourceLanguageDetected?: string }> {
  if (!config.geminiApiKey) {
    throw new GeminiServiceError(
      'GEMINI_NOT_CONFIGURED',
      'Gemini API key is not configured on the server. Use Demo Mode or configure GEMINI_API_KEY.',
      503
    );
  }

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const targetLabel = TRANSLATION_LANGUAGE_NAMES[targetLanguage];
  const prompt = buildTranslationPrompt(text, targetLanguage);

  const response = await callWithModelFallback(config, 'Gemini translation', 20000, (model) =>
    ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: {
              type: Type.STRING,
              description: `The accurate translation in ${targetLabel}.`,
            },
            sourceLanguageDetected: {
              type: Type.STRING,
              description: 'Brief name of the detected source language(s).',
            },
          },
          required: ['translatedText'],
        },
      },
    })
  );

  if (!response.text) {
    throw new GeminiServiceError('EMPTY_AI_RESPONSE', 'Translation service returned an empty response.', 502);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(response.text);
  } catch {
    throw new GeminiServiceError('INVALID_AI_JSON', 'Translation service returned malformed JSON.', 502);
  }

  const validated = TranslationResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new GeminiServiceError('INVALID_AI_SCHEMA', 'Translation response failed schema validation.', 502);
  }

  return validated.data;
}

export async function generateEvidenceLinkedNotes(
  config: ServerConfig,
  sessionId: string,
  sessionTitle: string,
  segments: TranscriptSegment[]
): Promise<StudyNotes> {
  if (!config.geminiApiKey) {
    throw new GeminiServiceError(
      'GEMINI_NOT_CONFIGURED',
      'Gemini API key is not configured on the server. Use Demo Mode or configure GEMINI_API_KEY.',
      503
    );
  }

  // Strictly exclude voice commands and connection gap markers from educational content
  const educationalSegments = segments.filter(
    (s) => s.isFinal && !s.isVoiceCommand && !s.isGapMarker && (s.correctedText ?? s.originalText).trim().length > 0
  );

  if (educationalSegments.length === 0) {
    throw new GeminiServiceError(
      'NO_TRANSCRIPT_CONTENT',
      'There are no finalized classroom transcript segments to generate notes from.',
      400
    );
  }

  const noteItemSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      content: { type: Type.STRING },
      unverified: { type: Type.BOOLEAN },
      segmentIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Exact segment IDs (e.g. seg-001) from the transcript supporting this item.',
      },
    },
    required: ['title', 'content', 'unverified', 'segmentIds'],
  };

  const prompt = buildNotesPrompt(sessionTitle, educationalSegments);

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const response = await callWithModelFallback(config, 'Gemini note generation', 30000, (model) =>
    ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            topicHeadings: { type: Type.ARRAY, items: { type: Type.STRING } },
            keyConcepts: { type: Type.ARRAY, items: noteItemSchema },
            importantDefinitions: { type: Type.ARRAY, items: noteItemSchema },
            lessonSummary: { type: Type.ARRAY, items: noteItemSchema },
            highlightedExplanations: { type: Type.ARRAY, items: noteItemSchema },
            bookmarkedMoments: { type: Type.ARRAY, items: noteItemSchema },
            unclearOrUnverified: { type: Type.ARRAY, items: noteItemSchema },
          },
          required: [
            'topicHeadings',
            'keyConcepts',
            'importantDefinitions',
            'lessonSummary',
            'highlightedExplanations',
            'bookmarkedMoments',
            'unclearOrUnverified',
          ],
        },
      },
    })
  );

  if (!response.text) {
    throw new GeminiServiceError('EMPTY_AI_RESPONSE', 'Note generation service returned an empty response.', 502);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(response.text);
  } catch {
    throw new GeminiServiceError('INVALID_AI_JSON', 'Note generation service returned malformed JSON.', 502);
  }

  const validated = RawNotesResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new GeminiServiceError('INVALID_AI_SCHEMA', 'Generated notes failed schema validation.', 502);
  }

  return validateAndGroundNotes(sessionId, validated.data, educationalSegments);
}

const RawQaResponseSchema = z.object({
  answer: z.string().min(1),
  notFoundInTranscript: z.boolean().default(false),
  supplementaryExplanation: z.string().optional(),
  segmentIds: z.array(z.string()).default([]),
});

export async function answerLectureQuestion(
  config: ServerConfig,
  sessionTitle: string,
  question: string,
  segments: TranscriptSegment[],
  previousAnswer?: string
): Promise<LectureQaResponse> {
  if (!config.geminiApiKey) {
    throw new GeminiServiceError(
      'GEMINI_NOT_CONFIGURED',
      'Gemini API key is not configured on the server.',
      503
    );
  }

  const educationalSegments = segments.filter(
    (s) => s.isFinal && !s.isVoiceCommand && !s.isGapMarker && (s.correctedText ?? s.originalText).trim().length > 0
  );
  if (educationalSegments.length === 0) {
    return {
      answer: "I couldn't find that explanation in your saved classroom transcript.",
      teacherGrounded: false,
      notFoundInTranscript: true,
      references: [],
      spokenSourcesSummary: '',
    };
  }

  const prompt = buildLectureQaPrompt(sessionTitle, question, educationalSegments, previousAnswer);
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const response = await callWithModelFallback(config, 'Gemini lecture Q&A', 22000, (model) =>
    ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            notFoundInTranscript: { type: Type.BOOLEAN },
            supplementaryExplanation: { type: Type.STRING },
            segmentIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['answer', 'notFoundInTranscript', 'segmentIds'],
        },
      },
    })
  );

  if (!response.text) {
    throw new GeminiServiceError('EMPTY_AI_RESPONSE', 'Lecture Q&A returned an empty response.', 502);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(response.text);
  } catch {
    throw new GeminiServiceError('INVALID_AI_JSON', 'Lecture Q&A returned malformed JSON.', 502);
  }

  const validated = RawQaResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new GeminiServiceError('INVALID_AI_SCHEMA', 'Lecture Q&A failed schema validation.', 502);
  }

  return validateAndGroundQaResponse(validated.data, educationalSegments);
}
