import type {
  AppCapabilities,
  LectureQaResponse,
  StudyNotes,
  TranscriptSegment,
  TranslationLanguage,
} from '../types';

const qaCache = new Map<string, LectureQaResponse>();
const translationCache = new Map<string, { translatedText: string; sourceLanguageDetected?: string; isDemo: boolean }>();

export async function fetchCapabilities(): Promise<AppCapabilities> {
  const res = await fetch('/api/capabilities');
  if (!res.ok) {
    throw new Error('Failed to check server capabilities');
  }
  return (await res.json()) as AppCapabilities;
}

export async function requestTranslation(
  text: string,
  targetLanguage: TranslationLanguage
): Promise<{ translatedText: string; sourceLanguageDetected?: string; isDemo: boolean }> {
  const cacheKey = `${targetLanguage}:${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLanguage }),
  });

  const data = (await res.json()) as {
    translatedText?: string;
    sourceLanguageDetected?: string;
    isDemo?: boolean;
    message?: string;
  };

  if (!res.ok || !data.translatedText) {
    throw new Error(data.message || 'Translation failed');
  }

  const out = {
    translatedText: data.translatedText,
    sourceLanguageDetected: data.sourceLanguageDetected,
    isDemo: Boolean(data.isDemo),
  };
  translationCache.set(cacheKey, out);
  return out;
}

export async function requestLectureAnswer(
  sessionTitle: string,
  question: string,
  segments: TranscriptSegment[],
  previousAnswer?: string,
  signal?: AbortSignal
): Promise<LectureQaResponse> {
  const cacheKey = `${sessionTitle}:${segments.length}:${previousAnswer ?? ''}:${question.toLowerCase()}`;
  const cached = qaCache.get(cacheKey);
  if (cached) {
    return { ...cached, isCached: true };
  }

  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ sessionTitle, question, segments, previousAnswer }),
  });

  const data = (await res.json()) as LectureQaResponse & { message?: string };
  if (!res.ok) {
    throw new Error(data.message || 'Unable to answer question right now.');
  }

  qaCache.set(cacheKey, data);
  return data;
}

export async function requestStudyNotes(
  sessionId: string,
  sessionTitle: string,
  segments: TranscriptSegment[]
): Promise<StudyNotes> {
  const res = await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, sessionTitle, segments }),
  });

  const data = (await res.json()) as StudyNotes & { message?: string };
  if (!res.ok) {
    throw new Error(data.message || 'Failed to generate study notes');
  }
  return data;
}
