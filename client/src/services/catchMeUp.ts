import type { EvidenceReference, TranscriptSegment } from '../types';

export interface CatchMeUpResult {
  generatedAtIso: string;
  isAi: boolean;
  isDemo: boolean;
  windowMinutes?: number;
  headline: string;
  points: Array<{
    text: string;
    reference: EvidenceReference;
  }>;
}

export function buildDeterministicCatchMeUp(
  segments: TranscriptSegment[],
  isDemo: boolean,
  windowMinutes?: number
): CatchMeUpResult {
  const educational = segments.filter(
    (s) =>
      s.isFinal &&
      !s.isVoiceCommand &&
      !s.isGapMarker &&
      (s.correctedText ?? s.originalText).trim().length > 0
  );

  let selected = educational;
  if (windowMinutes && educational.length > 0) {
    const latestTs = educational[educational.length - 1].timestampMs;
    const cutoff = Math.max(0, latestTs - windowMinutes * 60_000);
    const windowed = educational.filter((s) => s.timestampMs >= cutoff);
    if (windowed.length > 0) {
      selected = windowed;
    }
  }

  const recent = selected.slice(-5);
  const windowLabel = windowMinutes ? ` (last ${windowMinutes} minute${windowMinutes === 1 ? '' : 's'})` : '';

  return {
    generatedAtIso: new Date().toISOString(),
    isAi: false,
    isDemo,
    windowMinutes,
    headline:
      recent.length === 0
        ? 'No finalized classroom explanations yet.'
        : `Recent ${recent.length} classroom point${recent.length === 1 ? '' : 's'}${windowLabel}:`,
    points: recent.map((seg) => {
      const text = (seg.correctedText ?? seg.originalText).trim();
      return {
        text,
        reference: {
          segmentId: seg.id,
          timestampMs: seg.timestampMs,
          excerpt: text.length > 120 ? `${text.slice(0, 117)}...` : text,
        },
      };
    }),
  };
}
