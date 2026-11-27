import { describe, expect, it } from 'vitest';
import { buildLocalBasicNotes } from '../services/localNotesFallback';
import type { TranscriptSegment } from '../types';

describe('buildLocalBasicNotes', () => {
  it('builds deterministic basic notes with valid references, preserving unclear speech and excluding commands', () => {
    const segments: TranscriptSegment[] = [
      {
        id: 'seg-001',
        sessionId: 's1',
        timestampMs: 2000,
        createdAtIso: '2026-11-27T05:00:00Z',
        originalText: 'Plants convert sunlight into chemical energy.',
        isFinal: true,
        words: [],
        hasConfidenceData: true,
        highlightType: 'definition',
      },
      {
        id: 'seg-002',
        sessionId: 's1',
        timestampMs: 5000,
        createdAtIso: '2026-11-27T05:00:05Z',
        originalText: 'MyVoice, mark that as important.',
        isFinal: true,
        words: [],
        hasConfidenceData: false,
        isVoiceCommand: true,
      },
      {
        id: 'seg-003',
        sessionId: 's1',
        timestampMs: 12000,
        createdAtIso: '2026-11-27T05:00:12Z',
        originalText: 'The reaction occurs in the stroma.',
        isFinal: true,
        words: [{ word: 'stroma', confidence: 0.42 }],
        hasConfidenceData: true,
        isBookmarked: true,
        bookmarkLabel: 'Stroma',
      },
      {
        id: 'seg-004',
        sessionId: 's1',
        timestampMs: 18000,
        createdAtIso: '2026-11-27T05:00:18Z',
        originalText: 'Audio unclear — please check this section.',
        isFinal: true,
        words: [],
        hasConfidenceData: true,
        isUnclearAudio: true,
      },
    ];

    const notes = buildLocalBasicNotes('s1', 'Photosynthesis', segments);
    expect(notes.isLocalFallback).toBe(true);
    expect(notes.isDemo).toBe(false);
    expect(notes.notice).toBe(
      'Basic study notes — generated locally from your classroom transcript. AI summarization is currently unavailable.'
    );
    expect(notes.lessonSummary).toHaveLength(0);
    expect(notes.importantDefinitions).toHaveLength(0);
    expect(notes.highlightedExplanations).toHaveLength(1);
    expect(notes.highlightedExplanations[0].references[0].segmentId).toBe('seg-001');
    expect(notes.bookmarkedMoments).toHaveLength(1);
    expect(notes.bookmarkedMoments[0].references[0].segmentId).toBe('seg-003');
    expect(notes.unclearOrUnverified).toHaveLength(2);
  });
});
