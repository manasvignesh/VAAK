import type {
  LectureQaResponse,
  StudyNotes,
  TranscriptSegment,
  TranslationLanguage,
} from '../../shared/types.js';
import {
  buildLectureQaPrompt,
  buildNotesPrompt,
  buildTranslationPrompt,
  validateAndGroundNotes,
  validateAndGroundQaResponse,
  type RawNotesResponse,
} from '../../shared/notesGrounding.js';
import type { Env } from './types.js';

export class WorkerGeminiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

async function callGeminiRest(
  apiKey: string,
  model: string,
  prompt: string,
  responseSchema: Record<string, unknown>,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema,
        },
      }),
    });

    if (res.status === 429) {
      throw new WorkerGeminiError(
        'AI_RATE_LIMITED',
        'AI service is temporarily rate-limited. Please wait a moment and retry. Your transcript is preserved.',
        429
      );
    }

    if (!res.ok) {
      throw new WorkerGeminiError(
        'AI_PROVIDER_ERROR',
        'AI service failed to respond. Your transcript is preserved.',
        502
      );
    }

    const payload = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new WorkerGeminiError('EMPTY_AI_RESPONSE', 'AI returned an empty response.', 502);
    }
    return text;
  } catch (err) {
    if (err instanceof WorkerGeminiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new WorkerGeminiError(
        'AI_TIMEOUT',
        'AI request timed out. Your transcript is preserved and you can retry.',
        504
      );
    }
    throw new WorkerGeminiError('AI_PROVIDER_ERROR', 'AI request failed.', 502);
  } finally {
    clearTimeout(timer);
  }
}

async function callWithFallback(
  env: Env,
  prompt: string,
  schema: Record<string, unknown>,
  timeoutMs: number
): Promise<string> {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new WorkerGeminiError(
      'GEMINI_NOT_CONFIGURED',
      'Gemini API key is not configured. Use Interactive Demo Mode or configure GEMINI_API_KEY.',
      503
    );
  }

  const primary = env.GEMINI_MODEL?.trim() || 'gemini-flash-latest';
  const fallback = env.GEMINI_FALLBACK_MODEL?.trim() || 'gemini-flash-lite-latest';

  try {
    return await callGeminiRest(apiKey, primary, prompt, schema, timeoutMs);
  } catch (err) {
    if (
      err instanceof WorkerGeminiError &&
      err.code !== 'AI_RATE_LIMITED' &&
      fallback &&
      fallback !== primary
    ) {
      return await callGeminiRest(apiKey, fallback, prompt, schema, timeoutMs);
    }
    throw err;
  }
}

export async function translateOnWorker(
  env: Env,
  text: string,
  targetLanguage: TranslationLanguage
): Promise<{ translatedText: string; sourceLanguageDetected?: string }> {
  const prompt = buildTranslationPrompt(text, targetLanguage);
  const rawText = await callWithFallback(
    env,
    prompt,
    {
      type: 'OBJECT',
      properties: {
        translatedText: { type: 'STRING' },
        sourceLanguageDetected: { type: 'STRING' },
      },
      required: ['translatedText'],
    },
    20000
  );

  const parsed = JSON.parse(rawText) as {
    translatedText?: string;
    sourceLanguageDetected?: string;
  };
  if (!parsed.translatedText || typeof parsed.translatedText !== 'string') {
    throw new WorkerGeminiError('INVALID_AI_SCHEMA', 'Translation failed schema validation.', 502);
  }
  return {
    translatedText: parsed.translatedText,
    sourceLanguageDetected: parsed.sourceLanguageDetected,
  };
}

export async function generateNotesOnWorker(
  env: Env,
  sessionId: string,
  sessionTitle: string,
  segments: TranscriptSegment[]
): Promise<StudyNotes> {
  const educational = segments.filter(
    (s) =>
      s.isFinal &&
      !s.isVoiceCommand &&
      !s.isGapMarker &&
      (s.correctedText ?? s.originalText).trim().length > 0
  );
  if (educational.length === 0) {
    throw new WorkerGeminiError(
      'NO_TRANSCRIPT_CONTENT',
      'There are no finalized classroom transcript segments to generate notes from.',
      400
    );
  }

  const noteItemSchema = {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      content: { type: 'STRING' },
      unverified: { type: 'BOOLEAN' },
      segmentIds: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['title', 'content', 'unverified', 'segmentIds'],
  };

  const prompt = buildNotesPrompt(sessionTitle, educational);
  const rawText = await callWithFallback(
    env,
    prompt,
    {
      type: 'OBJECT',
      properties: {
        topicHeadings: { type: 'ARRAY', items: { type: 'STRING' } },
        keyConcepts: { type: 'ARRAY', items: noteItemSchema },
        importantDefinitions: { type: 'ARRAY', items: noteItemSchema },
        lessonSummary: { type: 'ARRAY', items: noteItemSchema },
        highlightedExplanations: { type: 'ARRAY', items: noteItemSchema },
        bookmarkedMoments: { type: 'ARRAY', items: noteItemSchema },
        unclearOrUnverified: { type: 'ARRAY', items: noteItemSchema },
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
    28000
  );

  const parsed = JSON.parse(rawText) as RawNotesResponse;
  return validateAndGroundNotes(sessionId, parsed, educational);
}

export async function askLectureOnWorker(
  env: Env,
  sessionTitle: string,
  question: string,
  segments: TranscriptSegment[],
  previousAnswer?: string
): Promise<LectureQaResponse> {
  const educational = segments.filter(
    (s) =>
      s.isFinal &&
      !s.isVoiceCommand &&
      !s.isGapMarker &&
      (s.correctedText ?? s.originalText).trim().length > 0
  );
  if (educational.length === 0) {
    return {
      answer: "I couldn't find that explanation in your saved classroom transcript.",
      teacherGrounded: false,
      notFoundInTranscript: true,
      references: [],
      spokenSourcesSummary: '',
    };
  }

  const prompt = buildLectureQaPrompt(sessionTitle, question, educational, previousAnswer);
  const rawText = await callWithFallback(
    env,
    prompt,
    {
      type: 'OBJECT',
      properties: {
        answer: { type: 'STRING' },
        notFoundInTranscript: { type: 'BOOLEAN' },
        supplementaryExplanation: { type: 'STRING' },
        segmentIds: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['answer', 'notFoundInTranscript', 'segmentIds'],
    },
    22000
  );

  const parsed = JSON.parse(rawText) as {
    answer: string;
    notFoundInTranscript: boolean;
    supplementaryExplanation?: string;
    segmentIds: string[];
  };
  return validateAndGroundQaResponse(parsed, educational);
}
