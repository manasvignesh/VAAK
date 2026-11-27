import { describe, expect, it } from 'vitest';
import { buildDemoStudyNotes } from '../services/demoEngine';
import type { TranscriptSegment } from '../types';

describe('buildDemoStudyNotes', () => {
  it('links notes strictly to existing segment IDs and flags unclear audio', () => {
    const segments: TranscriptSegment[] = [
      {
        id: 'seg-001',
        sessionId: 'demo-1',
        timestampMs: 1000,
        createdAtIso: '2026-11-27T04:00:00Z',
        originalText: 'Plants sunlight ni use chesi food prepare chestayi.',
        isFinal: true,
        words: [],
        hasConfidenceData: true,
      },
      {
        id: 'seg-002',
        sessionId: 'demo-1',
        timestampMs: 4000,
        createdAtIso: '2026-11-27T04:00:04Z',
        originalText: 'MyVoice, mark that definition as important.',
        isFinal: true,
        words: [],
        hasConfidenceData: false,
        isVoiceCommand: true,
      },
      {
        id: 'seg-003',
        sessionId: 'demo-1',
        timestampMs: 9000,
        createdAtIso: '2026-11-27T04:00:09Z',
        originalText: 'Audio unclear — please check this section.',
        isFinal: true,
        words: [],
        hasConfidenceData: true,
        isUnclearAudio: true,
      },
    ];

    const notes = buildDemoStudyNotes('demo-1', segments);
    expect(notes.isDemo).toBe(true);
    expect(notes.keyConcepts[0].references[0].segmentId).toBe('seg-001');
    expect(notes.unclearOrUnverified).toHaveLength(1);
    expect(notes.unclearOrUnverified[0].unverified).toBe(true);
    expect(notes.unclearOrUnverified[0].references[0].segmentId).toBe('seg-003');
  });
});
