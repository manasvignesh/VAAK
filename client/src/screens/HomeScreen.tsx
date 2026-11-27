import { Accessibility, ArrowRight, FolderOpen, MessageSquare, Mic, Play, ShieldCheck } from 'lucide-react';
import type { AppCapabilities, ScreenId } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { VaakMark } from '../components/VaakMark';

interface HomeScreenProps {
  capabilities: AppCapabilities | null;
  savedSessionCount: number;
  onStartLiveClass: () => void;
  onStartDemo: () => void;
  onNavigate: (screen: ScreenId) => void;
  onOpenAccessibility: () => void;
}

export function HomeScreen({
  capabilities,
  savedSessionCount,
  onStartLiveClass,
  onStartDemo,
  onNavigate,
  onOpenAccessibility,
}: HomeScreenProps) {
  const sttReady = capabilities?.speechToTextConfigured ?? false;
  const aiReady = capabilities?.aiNotesAndTranslationConfigured ?? false;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:py-12">
      <section className="rounded-[var(--mv-radius-lg)] border border-[var(--mv-border)] bg-[var(--mv-surface)] p-6 shadow-[var(--mv-shadow-sm)] sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <VaakMark className="h-8 w-8 shrink-0" />
            <span className="text-sm font-bold tracking-wide uppercase text-[var(--mv-accent)]">
              VAAK • Speak. Understand. Participate.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={sttReady ? 'success' : 'warning'}
              label={sttReady ? 'Live Speech Ready' : 'Speech Key Not Set — Demo Ready'}
            />
            <StatusBadge
              tone={aiReady ? 'success' : 'warning'}
              label={aiReady ? 'Gemini Notes & Translation Ready' : 'AI Key Not Set — Demo Ready'}
            />
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Communication Without Barriers.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--mv-text-muted)] sm:text-lg">
          A two-way classroom communication and learning workspace built for Indian schools and
          colleges. Deaf and hard-of-hearing students follow live multilingual captions with
          uncertainty indicators and evidence-linked notes—while students with speech disabilities
          participate aloud through accessible text-to-speech.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onStartLiveClass}
            className="inline-flex min-h-12 items-center gap-2.5 rounded-xl bg-[var(--mv-accent)] px-6 py-3 text-base font-semibold text-[var(--mv-accent-text)] shadow-[var(--mv-shadow-sm)] hover:bg-[var(--mv-accent-hover)]"
          >
            <Mic className="h-5 w-5" aria-hidden="true" />
            <span>Start Live Class</span>
          </button>

          <button
            type="button"
            onClick={onStartDemo}
            className="inline-flex min-h-12 items-center gap-2.5 rounded-xl border-2 border-[var(--mv-accent)] bg-[var(--mv-accent-soft)] px-6 py-3 text-base font-semibold text-[var(--mv-accent)] hover:opacity-90"
          >
            <Play className="h-5 w-5" aria-hidden="true" />
            <span>Try Interactive Demo (No API Keys)</span>
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--mv-border)] pt-5">
          <button
            type="button"
            onClick={() => onNavigate('classes')}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--mv-border)] bg-[var(--mv-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--mv-surface-alt)]"
          >
            <FolderOpen className="h-4 w-4 text-[var(--mv-accent)]" aria-hidden="true" />
            <span>My Classes ({savedSessionCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('participation')}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--mv-border)] bg-[var(--mv-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--mv-surface-alt)]"
          >
            <MessageSquare className="h-4 w-4 text-[var(--mv-accent)]" aria-hidden="true" />
            <span>Student Participation</span>
          </button>

          <button
            type="button"
            onClick={onOpenAccessibility}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--mv-border)] bg-[var(--mv-bg)] px-4 py-2 text-sm font-semibold hover:bg-[var(--mv-surface-alt)]"
          >
            <Accessibility className="h-4 w-4 text-[var(--mv-accent)]" aria-hidden="true" />
            <span>Accessibility Settings</span>
          </button>
        </div>
      </section>

      <section aria-labelledby="how-it-works-heading" className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--mv-radius-md)] border border-[var(--mv-border)] bg-[var(--mv-surface)] p-5 shadow-[var(--mv-shadow-sm)]">
          <h2 id="how-it-works-heading" className="text-base font-bold">
            Voice-First Teaching
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--mv-text-muted)]">
            Speak naturally in English, Hindi, Telugu, or mixed speech. Prefix commands with{' '}
            <code className="rounded bg-[var(--mv-surface-alt)] px-1.5 py-0.5 font-semibold">
              VAAK,
            </code>{' '}
            to highlight, bookmark, translate, or prepare study notes.
          </p>
        </div>

        <div className="rounded-[var(--mv-radius-md)] border border-[var(--mv-border)] bg-[var(--mv-surface)] p-5 shadow-[var(--mv-shadow-sm)]">
          <h2 className="text-base font-bold">Uncertainty-Aware Captions</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--mv-text-muted)]">
            Low-confidence words are underlined in amber so students can spot uncertain terms and
            correct them without losing the original recognized transcript.
          </p>
        </div>

        <div className="rounded-[var(--mv-radius-md)] border border-[var(--mv-border)] bg-[var(--mv-surface)] p-5 shadow-[var(--mv-shadow-sm)]">
          <h2 className="text-base font-bold">Evidence-Linked Study Notes</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--mv-text-muted)]">
            Every concept and definition links directly back to its source transcript segment and
            timestamp—with local basic notes available even offline.
          </p>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--mv-radius-md)] border border-[var(--mv-border)] bg-[var(--mv-surface-alt)] px-5 py-4 text-sm">
        <div className="flex items-center gap-2.5 text-[var(--mv-text-muted)]">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--mv-accent)]" aria-hidden="true" />
          <span>
            No account required. Classroom transcripts and notes are saved locally in your browser;
            raw audio is never stored.
          </span>
        </div>
        <button
          type="button"
          onClick={onStartDemo}
          className="inline-flex items-center gap-1 font-semibold text-[var(--mv-accent)] hover:underline"
        >
          <span>Launch Photosynthesis Demo</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
