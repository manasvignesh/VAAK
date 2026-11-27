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
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Participation Console</h1>
          <p className="mt-1 text-sm font-medium text-[var(--mv-text-muted)]">
            Type or tap a phrase to display it clearly and speak aloud to the classroom.
          </p>
        </div>
        {hasActiveSession && (
          <button
            type="button"
            onClick={onBackToClassroom}
            className="nb-btn inline-flex min-h-11 items-center gap-2 bg-[var(--mv-surface)] px-4 py-2 text-sm font-bold"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Live Classroom</span>
          </button>
        )}
      </div>

      {!ttsSupported && (
        <div
          role="alert"
          className="nb-card mb-5 bg-[var(--mv-amber)] p-4 text-sm font-bold text-[#151515]"
        >
          Your browser does not support Speech Synthesis. You can still type your question below
          and show the large-text display card to your teacher or classmates.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-5">
        <div className="nb-card-lg space-y-5 bg-[var(--mv-surface)] p-5 md:col-span-3">
          <div>
            <span className="block text-sm font-bold uppercase tracking-wide">
              Quick Classroom Phrases
            </span>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {QUICK_PHRASES.map((phrase) => {
                const selected = questionText === phrase;
                return (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => setQuestionText(phrase)}
                    className={`nb-btn min-h-12 px-3.5 py-2.5 text-left text-sm font-bold ${
                      selected
                        ? 'bg-[var(--mv-lavender)] text-[#151515]'
                        : 'bg-[var(--mv-bg)] text-[var(--mv-text)]'
                    }`}
                  >
                    {phrase}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="student-question-input" className="block text-sm font-bold">
              Your Question or Message
            </label>
            <textarea
              id="student-question-input"
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Type your question for the teacher..."
              className="mt-1.5 w-full rounded-xl border-[2.5px] border-[var(--mv-border)] bg-[var(--mv-bg)] p-3 text-base font-medium"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tts-lang-select" className="block text-sm font-bold">
                Voice Language
              </label>
              <select
                id="tts-lang-select"
                value={lang}
                onChange={(e) => setLang(e.target.value as 'en-IN' | 'hi-IN' | 'te-IN')}
                className="mt-1.5 w-full rounded-xl border-[2.5px] border-[var(--mv-border)] bg-[var(--mv-bg)] px-3 py-2.5 text-sm font-bold"
              >
                <option value="en-IN">Indian English (en-IN)</option>
                <option value="hi-IN">Hindi (hi-IN)</option>
                <option value="te-IN">Telugu (te-IN)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm font-bold">
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
                className="mt-3 w-full accent-[var(--mv-border)]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              disabled={!questionText.trim() || ttsStatus === 'speaking'}
              onClick={() => onSpeak(questionText, lang, rate)}
              className="nb-btn inline-flex min-h-13 items-center gap-2 bg-[var(--mv-lime)] px-6 py-3 text-base font-bold text-[#151515] disabled:opacity-50"
            >
              <Volume2 className="h-5 w-5" aria-hidden="true" />
              <span>Speak Aloud</span>
            </button>

            <button
              type="button"
              disabled={ttsStatus !== 'speaking'}
              onClick={onStopSpeaking}
              className="nb-btn inline-flex min-h-13 items-center gap-2 bg-[var(--mv-danger)] px-5 py-3 text-base font-bold text-[#151515] disabled:opacity-40"
            >
              <Square className="h-4 w-4" aria-hidden="true" />
              <span>Stop Speaking</span>
            </button>
          </div>
        </div>

        {/* Visible Question Display Card & Honest Playback Status */}
        <div className="nb-card-lg flex flex-col justify-between gap-4 bg-[var(--mv-surface)] p-5 md:col-span-2">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
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

            <div className="nb-card mt-4 bg-[var(--mv-pink)] p-5 text-[#151515]">
              <p className="text-2xl font-bold leading-snug">
                {questionText.trim() || 'Your question will appear here in large text.'}
              </p>
            </div>
          </div>

          <div
            role="status"
            className="rounded-xl border-2 border-[var(--mv-border)] bg-[var(--mv-surface-alt)] p-3.5 text-xs font-medium leading-relaxed"
          >
            <strong className="block font-bold">Playback &amp; Mic Safety:</strong>
            {ttsStatusDetail ||
              'Classroom microphone capture automatically pauses during speech playback so your question does not trigger teacher voice commands.'}
          </div>
        </div>
      </div>
    </div>
  );
}
