import { describe, expect, it } from 'vitest';
import {
  buildLectureQaPrompt,
  buildNotesPrompt,
  buildTranslationPrompt,
  validateAndGroundNotes,
  validateAndGroundQaResponse,
} from '../../../shared/notesGrounding.js';
import type { TranscriptSegment } from '../../../shared/types.js';

describe('shared/notesGrounding (shared between Node.js and Cloudflare Worker)', () => {
  it('builds prompt-injection-safe translation and notes prompts', () => {
    const trPrompt = buildTranslationPrompt('Sunlight helps plants.', 'te');
    expect(trPrompt).toContain('<untrusted_transcript>Sunlight helps plants.</untrusted_transcript>');
    expect(trPrompt).toContain('Telugu');

    const segments: TranscriptSegment[] = [
      {
        id: 'seg-001',
        sessionId: 'cf-1',
        timestampMs: 1000,
        createdAtIso: '2026-11-27T06:00:00Z',
        originalText: 'Chlorophyll absorbs sunlight.',
        isFinal: true,
        words: [],
        hasConfidenceData: true,
      },
    ];
    const notesPrompt = buildNotesPrompt('Photosynthesis', segments);
    expect(notesPrompt).toContain('[id=seg-001 | ts=1000ms] Chlorophyll absorbs sunlight.');

    const grounded = validateAndGroundNotes(
      'cf-1',
      {
        topicHeadings: ['Photosynthesis'],
        keyConcepts: [
          {
            title: 'Chlorophyll',
            content: 'Chlorophyll absorbs sunlight.',
            unverified: false,
            segmentIds: ['seg-001', 'fake-id'],
          },
        ],
        importantDefinitions: [],
        lessonSummary: [],
        highlightedExplanations: [],
        bookmarkedMoments: [],
        unclearOrUnverified: [],
      },
      segments
    );
    expect(grounded.keyConcepts).toHaveLength(1);
    expect(grounded.keyConcepts[0].references).toHaveLength(1);
    expect(grounded.keyConcepts[0].references[0].segmentId).toBe('seg-001');

    const qaPrompt = buildLectureQaPrompt('Photosynthesis', 'What does chlorophyll do?', segments);
    expect(qaPrompt).toContain('Student Question: What does chlorophyll do?');

    const qaGrounded = validateAndGroundQaResponse(
      {
        answer: 'Chlorophyll absorbs sunlight.',
        notFoundInTranscript: false,
        segmentIds: ['seg-001', 'fabricated-99'],
      },
      segments
    );
    expect(qaGrounded.notFoundInTranscript).toBe(false);
    expect(qaGrounded.references).toHaveLength(1);
    expect(qaGrounded.spokenSourcesSummary).toContain('1 seconds into the lecture');

    const qaNotFound = validateAndGroundQaResponse(
      {
        answer: 'Hallucinated answer',
        notFoundInTranscript: false,
        segmentIds: ['fabricated-99'],
      },
      segments
    );
    expect(qaNotFound.notFoundInTranscript).toBe(true);
    expect(qaNotFound.answer).toBe(
      "I couldn't find that explanation in your saved classroom transcript."
    );
  });
});
