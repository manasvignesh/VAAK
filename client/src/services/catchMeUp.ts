import type { EvidenceReference, TranscriptSegment } from '../types';

export interface CatchMeUpResult {
  generatedAtIso: string;
  isAi: boolean;
  isDemo: boolean;
  headline: string;
  points: Array<{
    text: string;
    reference: EvidenceReference;
  }>;
}

export function buildDeterministicCatchMeUp(
  segments: TranscriptSegment[],
  isDemo: boolean
): CatchMeUpResult {
  const educational = segments.filter(
    (s) =>
      s.isFinal &&
      !s.isVoiceCommand &&
      !s.isGapMarker &&
      (s.correctedText ?? s.originalText).trim().length > 0
  );

  const recent = educational.slice(-5);
  return {
    generatedAtIso: new Date().toISOString(),
    isAi: false,
    isDemo,
    headline:
      recent.length === 0
        ? 'No finalized classroom explanations yet.'
        : `Recent ${recent.length} classroom point${recent.length === 1 ? '' : 's'} (transcript-linked):`,
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
