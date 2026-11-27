import type { NoteItem, StudyNotes, TranscriptSegment } from '../types';

function formatMinuteBucket(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60000);
  return `Minute ${min + 1}`;
}

/**
 * Deterministic, key-free fallback that builds basic evidence-linked study notes
 * strictly from actual classroom transcript segments without fabricating summaries or definitions.
 */
export function buildLocalBasicNotes(
  sessionId: string,
  sessionTitle: string,
  segments: TranscriptSegment[]
): StudyNotes {
  const educational = segments.filter(
    (s) =>
      s.isFinal &&
      !s.isVoiceCommand &&
      !s.isGapMarker &&
      (s.correctedText ?? s.originalText).trim().length > 0
  );

  const makeRef = (seg: TranscriptSegment) => {
    const text = (seg.correctedText ?? seg.originalText).trim();
    return {
      segmentId: seg.id,
      timestampMs: seg.timestampMs,
      excerpt: text.length > 140 ? `${text.slice(0, 137)}...` : text,
    };
  };

  const isUnclearOrLowConf = (seg: TranscriptSegment) =>
    Boolean(seg.isUnclearAudio) ||
    (seg.hasConfidenceData && seg.words.some((w) => w.confidence !== null && w.confidence < 0.6));

  // Group confirmed segments into chronological lecture sections
  const confirmed = educational.filter((s) => !s.isUnclearAudio);
  const buckets = new Map<string, TranscriptSegment[]>();
  for (const seg of confirmed) {
    const bucket = formatMinuteBucket(seg.timestampMs);
    const list = buckets.get(bucket) ?? [];
    list.push(seg);
    buckets.set(bucket, list);
  }

  const chronologicalExcerpts: NoteItem[] = Array.from(buckets.entries()).map(
    ([bucketLabel, segs], idx) => ({
      id: `local-sec-${idx + 1}`,
      title: `Chronological Section (${bucketLabel})`,
      content: segs.map((s) => (s.correctedText ?? s.originalText).trim()).join(' '),
      unverified: segs.some(isUnclearOrLowConf),
      references: segs.map(makeRef),
    })
  );

  const highlightedExplanations: NoteItem[] = educational
    .filter((s) => Boolean(s.highlightType))
    .map((s, idx) => ({
      id: `local-hl-${idx + 1}`,
      title: `Highlighted ${s.highlightType ?? 'explanation'}`,
      content: (s.correctedText ?? s.originalText).trim(),
      unverified: isUnclearOrLowConf(s),
      references: [makeRef(s)],
    }));

  const bookmarkedMoments: NoteItem[] = educational
    .filter((s) => Boolean(s.isBookmarked))
    .map((s, idx) => ({
      id: `local-bm-${idx + 1}`,
      title: s.bookmarkLabel || 'Bookmarked Moment',
      content: (s.correctedText ?? s.originalText).trim(),
      unverified: isUnclearOrLowConf(s),
      references: [makeRef(s)],
    }));

  const unclearOrUnverified: NoteItem[] = educational
    .filter(isUnclearOrLowConf)
    .map((s, idx) => ({
      id: `local-unclear-${idx + 1}`,
      title: s.isUnclearAudio ? 'Unclear Audio Section' : 'Low-Confidence Transcript Segment',
      content: (s.correctedText ?? s.originalText).trim(),
      unverified: true,
      references: [makeRef(s)],
    }));

  return {
    sessionId,
    generatedAtIso: new Date().toISOString(),
    isDemo: false,
    isLocalFallback: true,
    notice:
      'Basic study notes — generated locally from your classroom transcript. AI summarization is currently unavailable.',
    topicHeadings: [sessionTitle, ...Array.from(buckets.keys())],
    keyConcepts: chronologicalExcerpts,
    importantDefinitions: [],
    lessonSummary: [],
    highlightedExplanations,
    bookmarkedMoments,
    unclearOrUnverified,
  };
}
