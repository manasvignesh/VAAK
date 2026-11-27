import type {
  AppCapabilities,
  StudyNotes,
  TranscriptSegment,
  TranslationLanguage,
} from '../types';

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

  return {
    translatedText: data.translatedText,
    sourceLanguageDetected: data.sourceLanguageDetected,
    isDemo: Boolean(data.isDemo),
  };
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
