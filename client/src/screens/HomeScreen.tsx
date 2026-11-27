import { Accessibility, ArrowRight, FolderOpen, MessageSquare, Mic, Play, ShieldCheck } from 'lucide-react';
import type { AppCapabilities, ClassroomSession, RecordingState, ScreenId } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { VaakMark } from '../components/VaakMark';
import { VoiceSculpture } from '../components/VoiceSculpture';

interface HomeScreenProps {
  capabilities: AppCapabilities | null;
  savedSessions: ClassroomSession[];
  reducedMotion: boolean;
  recordingState: RecordingState;
  onStartLiveClass: () => void;
  onStartDemo: () => void;
  onOpenSession: (session: ClassroomSession) => void;
  onNavigate: (screen: ScreenId) => void;
  onOpenAccessibility: () => void;
}

export function HomeScreen({
  capabilities,
  savedSessions,
  reducedMotion,
  recordingState,
  onStartLiveClass,
  onStartDemo,
  onOpenSession,
  onNavigate,
  onOpenAccessibility,
}: HomeScreenProps) {
  const sttReady = capabilities?.speechToTextConfigured ?? false;
  const aiReady = capabilities?.aiNotesAndTranslationConfigured ?? false;
  const recentSessions = savedSessions.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-4 sm:py-10">
      {/* Asymmetric Neo-Brutalist Interactive Workspace */}
      <section className="nb-card-lg grid min-w-0 gap-4 overflow-hidden bg-[var(--mv-surface)] p-4 sm:gap-6 sm:p-8 lg:grid-cols-12 lg:items-center">
        <div className="min-w-0 space-y-3 sm:space-y-5 lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2">
            <VaakMark className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
            <span className="nb-pill bg-[var(--mv-lavender)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#151515] sm:px-3 sm:py-1 sm:text-xs">
              VAAK • Speak. Understand. Participate.
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight leading-[1.06] sm:text-5xl">
            Communication Without Barriers.
          </h1>

          <p className="max-w-2xl text-sm font-medium leading-relaxed text-[var(--mv-text-muted)] sm:text-lg">
            A voice-first, two-way Indian classroom workspace. Deaf and hard-of-hearing students
            follow live multilingual captions with uncertainty indicators and evidence-linked notes—while
            students with speech disabilities participate aloud through accessible text-to-speech.
          </p>

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

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              data-tour-id="start-live-class"
              onClick={onStartLiveClass}
              className="nb-btn inline-flex min-h-13 items-center gap-2.5 bg-[var(--mv-lime)] px-6 py-3 text-base font-bold text-[#151515]"
            >
              <Mic className="h-5 w-5" aria-hidden="true" />
              <span>Start Live Class</span>
            </button>

            <button
              type="button"
              data-tour-id="try-demo"
              onClick={onStartDemo}
              className="nb-btn inline-flex min-h-13 items-center gap-2.5 bg-[var(--mv-lavender)] px-6 py-3 text-base font-bold text-[#151515]"
            >
              <Play className="h-5 w-5" aria-hidden="true" />
              <span>Try Interactive Demo</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('classes')}
              className="nb-btn inline-flex min-h-11 items-center gap-2 bg-[var(--mv-pink)] px-4 py-2 text-sm font-bold text-[#151515]"
            >
              <FolderOpen className="h-4 w-4" aria-hidden="true" />
              <span>My Classes ({savedSessions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('participation')}
              className="nb-btn inline-flex min-h-11 items-center gap-2 bg-[var(--mv-surface)] px-4 py-2 text-sm font-bold text-[var(--mv-text)]"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              <span>Student Participation</span>
            </button>

            <button
              type="button"
              onClick={onOpenAccessibility}
              className="nb-btn inline-flex min-h-11 items-center gap-2 bg-[var(--mv-surface)] px-4 py-2 text-sm font-bold text-[var(--mv-text)]"
            >
              <Accessibility className="h-4 w-4" aria-hidden="true" />
              <span>Accessibility</span>
            </button>
          </div>
        </div>

        <div className="min-w-0 space-y-3 lg:col-span-4">
          <VoiceSculpture
            recordingState={recordingState}
            micLevel={0}
            commandPulseKey={0}
            reducedMotion={reducedMotion}
          />
          <div className="nb-card bg-[var(--mv-surface-alt)] px-3.5 py-2.5 text-xs font-bold">
            Signature Voice Sculpture • Reacts to live speech, commands &amp; connection state
          </div>
        </div>
      </section>

      {/* Recent Classes + Core Capabilities */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-12">
        <section
          aria-labelledby="recent-classes-heading"
          className="nb-card min-w-0 bg-[var(--mv-surface)] p-5 lg:col-span-5"
        >
          <div className="flex items-center justify-between">
            <h2 id="recent-classes-heading" className="text-lg font-bold">
              Recent Classes
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('classes')}
              className="text-xs font-bold underline underline-offset-4"
            >
              View All
            </button>
          </div>

          {recentSessions.length === 0 ? (
            <p className="mt-3 text-sm font-medium text-[var(--mv-text-muted)]">
              No saved classes yet. Start a Live Class or run the Interactive Demo to save your
              first session locally.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {recentSessions.map((sess) => (
                <li key={sess.id}>
                  <button
                    type="button"
                    onClick={() => onOpenSession(sess)}
                    className="nb-btn flex w-full items-center justify-between gap-2 bg-[var(--mv-bg)] px-3.5 py-2.5 text-left text-sm font-bold"
                  >
                    <span className="truncate">{sess.title}</span>
                    <span className="font-mono text-xs text-[var(--mv-text-muted)]">
                      {new Date(sess.createdAtIso).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="how-it-works-heading"
          className="grid gap-4 sm:grid-cols-3 lg:col-span-7"
        >
          <div className="nb-card bg-[var(--mv-lime)] p-4 text-[#151515]">
            <h2 id="how-it-works-heading" className="text-base font-bold">
              1. Speak Commands
            </h2>
            <p className="mt-1.5 text-sm font-medium leading-snug">
              Prefix with <code className="rounded bg-white/70 px-1 font-bold">VAAK,</code> to
              highlight, bookmark, translate, or prepare notes.
            </p>
          </div>

          <div className="nb-card bg-[var(--mv-lavender)] p-4 text-[#151515]">
            <h2 className="text-base font-bold">2. Spot Uncertainty</h2>
            <p className="mt-1.5 text-sm font-medium leading-snug">
              Low-confidence words are underlined so students can inspect and correct captions
              honestly.
            </p>
          </div>

          <div className="nb-card bg-[var(--mv-pink)] p-4 text-[#151515]">
            <h2 className="text-base font-bold">3. Evidence Notes</h2>
            <p className="mt-1.5 text-sm font-medium leading-snug">
              Every study note links back to its exact transcript timestamp—with local fallback
              offline.
            </p>
          </div>
        </section>
      </div>

      <section className="nb-card flex flex-wrap items-center justify-between gap-4 bg-[var(--mv-surface-alt)] px-5 py-3.5 text-sm font-medium">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            No login required. Sessions stay in your browser; raw microphone audio is never saved.
          </span>
        </div>
        <button
          type="button"
          onClick={onStartDemo}
          className="inline-flex items-center gap-1 font-bold underline underline-offset-4"
        >
          <span>Launch Photosynthesis Demo</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
