import { useState } from 'react';
import { ArrowLeft, MessageSquare, Square, Volume2 } from 'lucide-react';
import type { TtsStatus } from '../services/ttsService';
import { StatusBadge } from '../components/StatusBadge';

interface StudentParticipationScreenProps {
  ttsSupported: boolean;
  ttsStatus: TtsStatus;
  ttsStatusDetail: string;
  onSpeak: (text: string, lang: 'en-IN' | 'hi-IN' | 'te-IN', rate: number) => void;
  onStopSpeaking: () => void;
  onBackToClassroom: () => void;
  hasActiveSession: boolean;
}

const QUICK_PHRASES = [
  'Please repeat that.',
  'Could you explain more slowly?',
  'I have a question.',
  "I didn't understand that.",
  'Could you give another example?',
  "Ma'am, could you explain photosynthesis again?",
];

export function StudentParticipationScreen({
  ttsSupported,
  ttsStatus,
  ttsStatusDetail,
  onSpeak,
  onStopSpeaking,
  onBackToClassroom,
  hasActiveSession,
}: StudentParticipationScreenProps) {
  const [questionText, setQuestionText] = useState(
    "Ma'am, could you explain photosynthesis again?"
  );
  const [lang, setLang] = useState<'en-IN' | 'hi-IN' | 'te-IN'>('en-IN');
  const [rate, setRate] = useState<number>(1.0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Student Participation Mode</h1>
          <p className="text-sm text-[var(--mv-text-muted)]">
            Type or select a phrase to display it clearly and read it aloud to the classroom.
          </p>
        </div>
        {hasActiveSession && (
          <button
            type="button"
            onClick={onBackToClassroom}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--mv-border)] bg-[var(--mv-surface)] px-4 py-2 text-sm font-semibold hover:bg-[var(--mv-surface-alt)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Live Classroom</span>
          </button>
        )}
      </div>

      {!ttsSupported && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-[var(--mv-amber)] bg-[var(--mv-amber-bg)] p-4 text-sm text-[var(--mv-amber)]"
        >
          Your browser does not support Speech Synthesis. You can still type your question below
          and show the large-text display card to your teacher or classmates.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-5">
        <div className="space-y-5 rounded-2xl border border-[var(--mv-border)] bg-[var(--mv-surface)] p-5 md:col-span-3">
          <div>
            <span className="block text-sm font-semibold">Quick Classroom Phrases</span>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {QUICK_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => setQuestionText(phrase)}
                  className="min-h-10 rounded-xl border border-[var(--mv-border)] bg-[var(--mv-bg)] px-3 py-2 text-left text-sm font-medium hover:border-[var(--mv-accent)] hover:bg-[var(--mv-accent-soft)]/40"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="student-question-input" className="block text-sm font-semibold">
              Your Question or Message
            </label>
            <textarea
              id="student-question-input"
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Type your question for the teacher..."
              className="mt-1.5 w-full rounded-xl border border-[var(--mv-border)] bg-[var(--mv-bg)] p-3 text-base"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tts-lang-select" className="block text-sm font-semibold">
                Voice Language
              </label>
              <select
                id="tts-lang-select"
                value={lang}
                onChange={(e) => setLang(e.target.value as 'en-IN' | 'hi-IN' | 'te-IN')}
                className="mt-1.5 w-full rounded-xl border border-[var(--mv-border)] bg-[var(--mv-bg)] px-3 py-2.5 text-sm font-semibold"
              >
                <option value="en-IN">Indian English (en-IN)</option>
                <option value="hi-IN">Hindi (hi-IN)</option>
                <option value="te-IN">Telugu (te-IN)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <label htmlFor="tts-rate-range">Speaking Speed</label>
                <span className="font-mono">{rate.toFixed(2)}x</span>
              </div>
              <input
                id="tts-rate-range"
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={rate}
                onChange={(e) => setRate(Number.parseFloat(e.target.value))}
                className="mt-3 w-full accent-[var(--mv-accent)]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              disabled={!questionText.trim() || ttsStatus === 'speaking'}
              onClick={() => onSpeak(questionText, lang, rate)}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--mv-accent)] px-6 py-3 text-base font-semibold text-[var(--mv-accent-text)] hover:bg-[var(--mv-accent-hover)] disabled:opacity-50"
            >
              <Volume2 className="h-5 w-5" aria-hidden="true" />
              <span>Speak Aloud</span>
            </button>

            <button
              type="button"
              disabled={ttsStatus !== 'speaking'}
              onClick={onStopSpeaking}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[var(--mv-danger)] bg-[var(--mv-danger-bg)] px-5 py-3 text-base font-semibold text-[var(--mv-danger)] disabled:opacity-40"
            >
              <Square className="h-4 w-4" aria-hidden="true" />
              <span>Stop Speaking</span>
            </button>
          </div>
        </div>

        {/* Visible Question Display Card & Honest Playback Status */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--mv-border)] bg-[var(--mv-surface)] p-5 md:col-span-2">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--mv-text-muted)]">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                Visible Question Card
              </span>
              <StatusBadge
                tone={
                  ttsStatus === 'speaking'
                    ? 'live'
                    : ttsStatus === 'completed'
                      ? 'success'
                      : ttsStatus === 'error'
                        ? 'danger'
                        : 'neutral'
                }
                label={
                  ttsStatus === 'speaking'
                    ? 'Speaking'
                    : ttsStatus === 'completed'
                      ? 'Playback Finished'
                      : ttsStatus === 'stopped'
                        ? 'Stopped'
                        : ttsStatus === 'error'
                          ? 'Unavailable'
                          : 'Ready'
                }
              />
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--mv-border)] bg-[var(--mv-bg)] p-5">
              <p className="text-2xl font-semibold leading-snug">
                {questionText.trim() || 'Your question will appear here in large text.'}
              </p>
            </div>
          </div>

          <div
            role="status"
            className="rounded-xl border border-[var(--mv-border)] bg-[var(--mv-surface-alt)] p-3.5 text-xs leading-relaxed text-[var(--mv-text-muted)]"
          >
            <strong className="block text-[var(--mv-text)]">Playback &amp; Mic Safety:</strong>
            {ttsStatusDetail ||
              'Classroom microphone capture automatically pauses during speech playback so your question does not trigger teacher voice commands.'}
          </div>
        </div>
      </div>
    </div>
  );
}
