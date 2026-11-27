import { describe, expect, it } from 'vitest';
import { buildReadableSections } from '../services/notesReader';
import type { StudyNotes } from '../types';

describe('buildReadableSections', () => {
  it('announces section names, natural timestamps, and explicit unverified warnings', () => {
    const notes: StudyNotes = {
      sessionId: 's1',
      generatedAtIso: '2026-11-27T07:00:00Z',
      isDemo: false,
      topicHeadings: ['Photosynthesis'],
      lessonSummary: [
        {
          id: 'n1',
          title: 'Core Summary',
          content: 'Plants convert sunlight into glucose.',
          unverified: false,
          references: [{ segmentId: 'seg-001', timestampMs: 180000, excerpt: '...' }],
        },
      ],
      keyConcepts: [],
      importantDefinitions: [],
      highlightedExplanations: [],
      bookmarkedMoments: [],
      unclearOrUnverified: [
        {
          id: 'n2',
          title: 'Unclear Term',
          content: 'Audio unclear in stroma section.',
          unverified: true,
          references: [{ segmentId: 'seg-002', timestampMs: 240000, excerpt: '...' }],
        },
      ],
    };

    const sections = buildReadableSections(notes);
    expect(sections).toHaveLength(2);
    expect(sections[0].spokenText).toContain('Lesson Summary.');
    expect(sections[0].spokenText).toContain('approximately 3 minutes into the lecture');
    expect(sections[0].spokenText).not.toContain('seg-001');
    expect(sections[1].spokenText).toContain(
      'The following explanation contains uncertain speech recognition and should be verified.'
    );
  });
});
