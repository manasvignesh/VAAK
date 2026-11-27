import { describe, expect, it } from 'vitest';
import {
  callGeminiWithRetry,
  callWithModelFallback,
  GeminiServiceError,
  validateAndGroundNotes,
} from '../services/geminiService.js';
import type { TranscriptSegment } from '../../../shared/types.js';

describe('validateAndGroundNotes', () => {
  const segments: TranscriptSegment[] = [
    {
      id: 'seg-001',
      sessionId: 'sess-1',
      timestampMs: 1200,
      createdAtIso: '2026-11-27T04:00:00Z',
      originalText: 'Photosynthesis is the process by which plants convert sunlight into chemical energy.',
      isFinal: true,
      words: [],
      hasConfidenceData: false,
      highlightType: 'definition',
    },
    {
      id: 'seg-002',
      sessionId: 'sess-1',
      timestampMs: 18500,
      createdAtIso: '2026-11-27T04:00:18Z',
      originalText: 'Audio unclear — please check this section.',
      isFinal: true,
      words: [],
      hasConfidenceData: true,
      isUnclearAudio: true,
    },
    {
      id: 'seg-003',
      sessionId: 'sess-1',
      timestampMs: 24000,
      createdAtIso: '2026-11-27T04:00:24Z',
      originalText: 'The reaction occurs inside the stroma.',
      isFinal: true,
      words: [{ word: 'stroma', confidence: 0.41 }],
      hasConfidenceData: true,
    },
  ];

  it('grounds valid segment references, strips fabricated IDs, and marks low-confidence items unverified', () => {
    const notes = validateAndGroundNotes(
      'sess-1',
      {
        topicHeadings: ['Photosynthesis'],
        keyConcepts: [
          {
            title: 'Light Conversion',
            content: 'Plants convert sunlight into chemical energy.',
            unverified: false,
            segmentIds: ['seg-001', 'seg-999-fabricated'],
          },
          {
            title: 'Hallucinated Concept',
            content: 'Made up fact with no real segment.',
            unverified: false,
            segmentIds: ['seg-999-fabricated'],
          },
          {
            title: 'Stroma Location',
            content: 'The reaction occurs inside the stroma.',
            unverified: false,
            segmentIds: ['seg-003'],
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

    expect(notes.keyConcepts).toHaveLength(2);
    expect(notes.keyConcepts[0].references[0].segmentId).toBe('seg-001');
    expect(notes.keyConcepts[0].unverified).toBe(false);
    expect(notes.keyConcepts[1].references[0].segmentId).toBe('seg-003');
    expect(notes.keyConcepts[1].unverified).toBe(true);
    expect(notes.unclearOrUnverified).toHaveLength(1);
    expect(notes.unclearOrUnverified[0].references[0].segmentId).toBe('seg-002');
  });
});

describe('callGeminiWithRetry', () => {
  it('maps 429 rate-limit errors to status 429 without retrying', async () => {
    let calls = 0;
    await expect(
      callGeminiWithRetry(async () => {
        calls += 1;
        const err = new Error('429 RESOURCE_EXHAUSTED');
        throw err;
      }, 1000, 'Gemini test')
    ).rejects.toMatchObject({
      name: 'GeminiServiceError',
      code: 'AI_RATE_LIMITED',
      statusCode: 429,
    } satisfies Partial<GeminiServiceError>);
    expect(calls).toBe(1);
  });

  it('retries once on transient failure and succeeds', async () => {
    let calls = 0;
    const result = await callGeminiWithRetry(async () => {
      calls += 1;
      if (calls === 1) throw new Error('Transient 503');
      return 'ok';
    }, 1000, 'Gemini test', 1);
    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });
});

describe('callWithModelFallback', () => {
  const cfg = {
    port: 3000,
    deepgramApiKey: null,
    geminiApiKey: 'test-key',
    geminiModel: 'gemini-flash-latest',
    geminiFallbackModel: 'gemini-flash-lite-latest',
  };

  it('falls back to geminiFallbackModel when primary returns 503', async () => {
    const tried: string[] = [];
    const res = await callWithModelFallback(cfg, 'Test', 1000, async (model) => {
      tried.push(model);
      if (model === 'gemini-flash-latest') {
        const err = new Error('503 UNAVAILABLE');
        throw err;
      }
      return 'fallback-ok';
    });
    expect(res).toBe('fallback-ok');
    expect(tried).toEqual(['gemini-flash-latest', 'gemini-flash-lite-latest']);
  });

  it('does not call fallback model on 429 rate-limit error', async () => {
    const tried: string[] = [];
    await expect(
      callWithModelFallback(cfg, 'Test', 1000, async (model) => {
        tried.push(model);
        throw new Error('429 RESOURCE_EXHAUSTED');
      })
    ).rejects.toMatchObject({ code: 'AI_RATE_LIMITED', statusCode: 429 });
    expect(tried).toEqual(['gemini-flash-latest']);
  });
});
