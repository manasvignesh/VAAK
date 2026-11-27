import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Check,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Highlighter,
  Languages,
  Mic,
  MicOff,
  Pause,
  Play,
  SkipForward,
  Sparkles,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import type {
  AccessibilitySettings,
  ClassroomSession,
  RecordingState,
  TranscriptSegment,
  TranslationLanguage,
} from '../types';
import type { CatchMeUpResult } from '../services/catchMeUp';
import { StatusBadge } from '../components/StatusBadge';
import { VoiceSculpture } from '../components/VoiceSculpture';

interface LiveClassroomScreenProps {
  session: ClassroomSession | null;
  interimText: string;
  recordingState: RecordingState;
  micLevel: number;
  commandPulseKey: number;
  statusMessage: string;
  commandFeedback: { tone: 'success' | 'warning' | 'info'; message: string } | null;
  catchMeUp: CatchMeUpResult | null;
  onTriggerCatchMeUp: () => void;
  onDismissCatchMeUp: () => void;
  settings: AccessibilitySettings;
  onUpdateSettings: (next: AccessibilitySettings) => void;
  onStopRecording: () => void;
  onEndClassAndGenerateNotes: () => void;
  onToggleHighlight: (segmentId: string) => void;
  onToggleBookmark: (segmentId: string) => void;
  onCorrectSegment: (segmentId: string, correctedText: string) => void;
  onTranslateSegment: (segmentId: string, targetLanguage: TranslationLanguage) => Promise<unknown>;
  translateTarget: TranslationLanguage;
  onChangeTranslateTarget: (lang: TranslationLanguage) => void;
  autoTranslateEnabled: boolean;
  onToggleAutoTranslate: () => void;
  onOpenParticipation: () => void;
  onStartDemo: () => void;
  onDemoNextStep?: () => void;
  onToggleDemoPause?: () => void;
  isDemoPaused?: boolean;
  onStartLiveClass: () => void;
}

function formatTimestamp(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function LiveClassroomScreen({
  session,
  interimText,
  recordingState,
  micLevel,
  commandPulseKey,
  statusMessage,
  commandFeedback,
  catchMeUp,
  onTriggerCatchMeUp,
  onDismissCatchMeUp,
  settings,
  onUpdateSettings,
  onStopRecording,
  onEndClassAndGenerateNotes,
  onToggleHighlight,
  onToggleBookmark,
  onCorrectSegment,
  onTranslateSegment,
  translateTarget,
  onChangeTranslateTarget,
  autoTranslateEnabled,
  onToggleAutoTranslate,
  onOpenParticipation,
  onStartDemo,
  onDemoNextStep,
  onToggleDemoPause,
  isDemoPaused,
  onStartLiveClass,
}: LiveClassroomScreenProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [activeSideTab, setActiveSideTab] = useState<'saved' | 'commands'>('saved');
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!session) {
      setElapsedSec(0);
      return;
    }
    const startMs = new Date(session.createdAtIso).getTime();
    const update = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    update();
    if (recordingState === 'listening' || recordingState === 'reconnecting') {
      const id = setInterval(update, 1000);
      return () => clearInterval(id);
    }
  }, [session, recordingState]);

  useEffect(() => {
    if (settings.autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [session?.segments.length, interimText, settings.autoScroll]);

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <div className="nb-card-lg bg-[var(--mv-surface)] p-8">
          <Mic className="mx-auto h-10 w-10" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-bold">No Active Classroom Session</h1>
          <p className="mt-2 text-sm font-medium text-[var(--mv-text-muted)]">
            Start a live class with your microphone or launch the key-free Interactive Photosynthesis
            Demo to see real-time captions, uncertainty flags, and VAAK voice commands.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onStartLiveClass}
              className="nb-btn min-h-11 bg-[var(--mv-lime)] px-5 py-2.5 font-bold text-[#151515]"
            >
              Start Live Class
            </button>
            <button
              type="button"
              onClick={onStartDemo}
              className="nb-btn min-h-11 bg-[var(--mv-lavender)] px-5 py-2.5 font-bold text-[#151515]"
            >
              Try Interactive Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isListening = recordingState === 'listening';
  const isReconnecting = recordingState === 'reconnecting';
  const isFocusMode = Boolean(settings.focusMode);
  const savedMoments = session.segments.filter((s) => s.highlightType || s.isBookmarked);

  const handleTranslate = async (segmentId: string) => {
    setTranslatingId(segmentId);
    try {
      await onTranslateSegment(segmentId, translateTarget);
    } finally {
      setTranslatingId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 pb-24 sm:gap-4 sm:px-4 sm:py-4 lg:pb-6">
      {/* Top Status & Controls Bar */}
      <section
        aria-label="Classroom session status"
        className="nb-card flex flex-wrap items-center justify-between gap-2.5 bg-[var(--mv-surface)] p-3 sm:gap-3 sm:px-4 sm:py-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          {!isFocusMode && (
            <VoiceSculpture
              recordingState={recordingState}
              micLevel={micLevel}
              commandPulseKey={commandPulseKey}
              reducedMotion={settings.reducedMotion}
              focusMode={isFocusMode}
              compact
            />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold leading-tight">{session.title}</h1>
              <span className="nb-pill bg-[var(--mv-surface-alt)] px-2.5 py-0.5 font-mono text-xs font-bold">
                {formatTimestamp(elapsedSec * 1000)}
              </span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-[var(--mv-text-muted)]">
              {statusMessage}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {session.isDemo && <StatusBadge tone="demo" label="Interactive Demo" />}
              {isListening && !session.isDemo && <StatusBadge tone="live" label="Recording Live" />}
              {isReconnecting && <StatusBadge tone="warning" label="Reconnecting..." />}
              {recordingState === 'paused_for_tts' && (
                <StatusBadge tone="warning" label="Mic Paused for Student Speech" />
              )}
              {recordingState === 'completed' && (
                <StatusBadge tone="success" label="Session Finalized" />
              )}
              {recordingState === 'error' && <StatusBadge tone="danger" label="Connection Issue" />}
              <StatusBadge
                tone={
                  (isListening || isReconnecting) && settings.commandListeningEnabled
                    ? 'neutral'
                    : 'warning'
                }
                label={
                  !isListening && !isReconnecting
                    ? 'Mic Inactive'
                    : settings.commandListeningEnabled
                      ? '"VAAK," Ready'
                      : 'Commands Paused'
                }
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!session.isDemo && (
            <div
              className="nb-pill flex items-center gap-2 bg-[var(--mv-surface-alt)] px-3 py-1.5"
              aria-label={`Microphone activity level ${Math.round(micLevel * 100)} percent`}
            >
              {isListening ? (
                <Mic className="h-4 w-4" aria-hidden="true" />
              ) : (
                <MicOff className="h-4 w-4 text-[var(--mv-text-muted)]" aria-hidden="true" />
              )}
              <div className="h-2.5 w-16 overflow-hidden rounded-full border border-[var(--mv-border)] bg-[var(--mv-surface)]">
                <div
                  className="h-full bg-[var(--mv-lime)] transition-all duration-75"
                  style={{ width: `${Math.round(micLevel * 100)}%` }}
                />
              </div>
            </div>
          )}

          {session.isDemo && (recordingState === 'listening' || recordingState === 'reconnecting') && (
            <>
              <button
                type="button"
                onClick={onToggleDemoPause}
                className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-surface)] px-3 py-1.5 text-sm font-bold"
              >
                {isDemoPaused ? (
                  <>
                    <Play className="h-4 w-4" aria-hidden="true" />
                    <span>Resume Demo</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" aria-hidden="true" />
                    <span>Pause Demo</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onDemoNextStep}
                className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-lavender)] px-3 py-1.5 text-sm font-bold text-[#151515]"
              >
                <SkipForward className="h-4 w-4" aria-hidden="true" />
                <span>Next Step</span>
              </button>
            </>
          )}

          <button
            type="button"
            data-tour-id="classroom-highlights-catchup"
            onClick={onTriggerCatchMeUp}
            className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-pink)] px-3.5 py-1.5 text-sm font-bold text-[#151515]"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Catch Me Up</span>
          </button>

          <button
            type="button"
            data-tour-id="focus-mode-btn"
            aria-pressed={isFocusMode}
            onClick={() => onUpdateSettings({ ...settings, focusMode: !isFocusMode })}
            className={`nb-btn inline-flex min-h-10 items-center gap-1.5 px-3.5 py-1.5 text-sm font-bold ${
              isFocusMode
                ? 'bg-[var(--mv-lime)] text-[#151515]'
                : 'bg-[var(--mv-surface)] text-[var(--mv-text)]'
            }`}
          >
            {isFocusMode ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{isFocusMode ? 'Exit Focus Mode' : 'Focus Mode'}</span>
          </button>

          <button
            type="button"
            aria-pressed={!settings.autoScroll}
            onClick={() => onUpdateSettings({ ...settings, autoScroll: !settings.autoScroll })}
            className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-surface)] px-3 py-1.5 text-sm font-bold"
          >
            {settings.autoScroll ? 'Pause Auto-Scroll' : 'Resume Auto-Scroll'}
          </button>

          {(isListening || isReconnecting || recordingState === 'connecting') && (
            <button
              type="button"
              onClick={onStopRecording}
              className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-danger)] px-3.5 py-1.5 text-sm font-bold text-[#151515]"
            >
              <Square className="h-4 w-4" aria-hidden="true" />
              <span>Stop Recording</span>
            </button>
          )}

          <button
            type="button"
            onClick={onEndClassAndGenerateNotes}
            disabled={recordingState === 'generating_notes'}
            className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-lime)] px-4 py-1.5 text-sm font-bold text-[#151515] disabled:opacity-50"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>
              {recordingState === 'generating_notes'
                ? 'Preparing Notes...'
                : 'End Class & Prepare Notes'}
            </span>
          </button>
        </div>
      </section>

      {/* Bold Neo-Brutalist Voice Command Confirmation Stamp */}
      {commandFeedback && (
        <div
          key={commandFeedback.message}
          role="status"
          className={`nb-card mv-ack-enter px-4 py-3 text-sm font-bold text-[#151515] ${
            commandFeedback.tone === 'success'
              ? 'bg-[var(--mv-lime)]'
              : commandFeedback.tone === 'warning'
                ? 'bg-[var(--mv-amber)]'
                : 'bg-[var(--mv-lavender)]'
          }`}
        >
          {commandFeedback.message}
        </div>
      )}

      {/* Catch Me Up Editorial Panel */}
      {catchMeUp && (
        <section
          aria-label="Catch Me Up recent classroom summary"
          className="nb-card mv-ack-enter bg-[var(--mv-pink)] p-4 text-[#151515]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="nb-pill inline-block bg-white px-2.5 py-0.5 text-xs font-bold uppercase">
                Catch Me Up • {catchMeUp.isDemo ? 'Demo Transcript' : 'Evidence-Linked Excerpts'}
              </span>
              <h2 className="mt-2 text-base font-bold">{catchMeUp.headline}</h2>
            </div>
            <button
              type="button"
              onClick={onDismissCatchMeUp}
              aria-label="Dismiss Catch Me Up"
              className="nb-btn bg-white p-1.5 text-[#151515]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {catchMeUp.points.length > 0 && (
            <ul className="mt-3 space-y-2">
              {catchMeUp.points.map((pt) => (
                <li
                  key={pt.reference.segmentId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#151515] bg-white px-3 py-2 text-sm font-medium"
                >
                  <span>{pt.text}</span>
                  <a
                    href={`#segment-${pt.reference.segmentId}`}
                    className="nb-pill bg-[var(--mv-lime)] px-2.5 py-0.5 font-mono text-xs font-bold text-[#151515]"
                  >
                    #{pt.reference.segmentId} @ {formatTimestamp(pt.reference.timestampMs)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Main Layout: Captions First (2/3 width on desktop, full width in Focus Mode) */}
      <div className={`grid gap-4 ${isFocusMode ? '' : 'lg:grid-cols-3'}`}>
        <div
          data-tour-id="live-captions-panel"
          className={`nb-card-lg flex flex-col bg-[var(--mv-surface)] ${
            isFocusMode ? '' : 'lg:col-span-2'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-[2.5px] border-[var(--mv-border)] bg-[var(--mv-surface-alt)] px-4 py-2.5 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span>LIVE CAPTIONS</span>
              <span>•</span>
              <span className="font-mono">{settings.captionSize}px</span>
              {isFocusMode && (
                <span className="nb-pill bg-[var(--mv-lime)] px-2 py-0.5 text-[11px] text-[#151515]">
                  FOCUS MODE
                </span>
              )}
            </div>
            <div data-tour-id="translate-controls" className="flex flex-wrap items-center gap-2">
              <label htmlFor="translate-lang-select">Translate to:</label>
              <select
                id="translate-lang-select"
                value={translateTarget}
                onChange={(e) => onChangeTranslateTarget(e.target.value as TranslationLanguage)}
                className="rounded-lg border-2 border-[var(--mv-border)] bg-[var(--mv-surface)] px-2 py-1 text-xs font-bold"
              >
                <option value="te">Telugu (తెలుగు)</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="en">English</option>
              </select>
              <button
                type="button"
                aria-pressed={autoTranslateEnabled}
                onClick={onToggleAutoTranslate}
                className={`nb-btn inline-flex min-h-7 items-center px-2.5 py-0.5 text-[11px] font-bold ${
                  autoTranslateEnabled
                    ? 'bg-[var(--mv-lime)] text-[#151515]'
                    : 'bg-[var(--mv-surface)] text-[var(--mv-text)]'
                }`}
              >
                {autoTranslateEnabled ? 'Auto-Translate: ON' : 'Auto-Translate: OFF'}
              </button>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="h-[60vh] min-h-[360px] space-y-4 overflow-y-auto p-4 sm:p-6"
            tabIndex={0}
            aria-label="Live classroom transcript"
          >
            {session.segments.length === 0 && !interimText && (
              <p className="text-base font-semibold text-[var(--mv-text-muted)]">
                Listening for classroom speech... Speak naturally or say{' '}
                <code className="rounded bg-[var(--mv-surface-alt)] px-1.5 py-0.5">
                  &ldquo;VAAK, mark that as important.&rdquo;
                </code>
              </p>
            )}

            {session.segments.map((seg: TranscriptSegment) => {
              if (seg.isGapMarker) {
                return (
                  <div
                    key={seg.id}
                    className="nb-card bg-[var(--mv-amber)] px-4 py-2.5 text-sm font-bold text-[#151515]"
                  >
                    <span className="font-mono">[{formatTimestamp(seg.timestampMs)}]</span>{' '}
                    {seg.originalText}
                  </div>
                );
              }

              if (seg.isVoiceCommand) {
                return (
                  <div
                    key={seg.id}
                    className="rounded-xl border-2 border-[var(--mv-border)] bg-[var(--mv-lavender)] px-3.5 py-2 text-xs font-bold text-[#151515]"
                  >
                    <span className="font-mono">[{formatTimestamp(seg.timestampMs)}]</span>{' '}
                    <span>VOICE COMMAND:</span> {seg.originalText}
                  </div>
                );
              }

              const displayText = seg.correctedText ?? seg.originalText;
              const isEditing = editingId === seg.id;

              return (
                <article
                  key={seg.id}
                  id={`segment-${seg.id}`}
                  className={`nb-card p-4 transition-colors ${
                    seg.highlightType ? 'bg-[var(--mv-accent-soft)]' : 'bg-[var(--mv-bg)]'
                  }`}
                >
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="nb-pill bg-[var(--mv-surface)] px-2 py-0.5 font-mono">
                        {formatTimestamp(seg.timestampMs)}
                      </span>
                      <span className="rounded-md border border-[var(--mv-border)] bg-[var(--mv-surface)] px-1.5 py-0.5 font-mono">
                        #{seg.id}
                      </span>
                      {seg.languageDetected && (
                        <span className="rounded-md border border-[var(--mv-border)] bg-[var(--mv-surface)] px-1.5 py-0.5">
                          {seg.languageDetected}
                        </span>
                      )}
                      {!seg.hasConfidenceData && !seg.isUnclearAudio && (
                        <span className="text-[var(--mv-text-muted)]">Confidence unavailable</span>
                      )}
                      {seg.highlightType && (
                        <span className="nb-pill inline-flex items-center gap-1 bg-[var(--mv-lime)] px-2.5 py-0.5 text-[#151515]">
                          <Highlighter className="h-3 w-3" aria-hidden="true" />
                          Important
                        </span>
                      )}
                      {seg.isBookmarked && (
                        <span className="nb-pill inline-flex items-center gap-1 bg-[var(--mv-pink)] px-2.5 py-0.5 text-[#151515]">
                          <Bookmark className="h-3 w-3" aria-hidden="true" />
                          {seg.bookmarkLabel || 'Bookmarked'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleHighlight(seg.id)}
                        aria-pressed={Boolean(seg.highlightType)}
                        className={`nb-btn inline-flex min-h-8 items-center gap-1 px-2.5 py-1 text-xs font-bold ${
                          seg.highlightType
                            ? 'bg-[var(--mv-lime)] text-[#151515]'
                            : 'bg-[var(--mv-surface)]'
                        }`}
                      >
                        <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Highlight</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleBookmark(seg.id)}
                        aria-pressed={Boolean(seg.isBookmarked)}
                        className={`nb-btn inline-flex min-h-8 items-center gap-1 px-2.5 py-1 text-xs font-bold ${
                          seg.isBookmarked
                            ? 'bg-[var(--mv-pink)] text-[#151515]'
                            : 'bg-[var(--mv-surface)]'
                        }`}
                      >
                        <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Bookmark</span>
                      </button>

                      <button
                        type="button"
                        disabled={translatingId === seg.id || seg.isUnclearAudio}
                        onClick={() => void handleTranslate(seg.id)}
                        className="nb-btn inline-flex min-h-8 items-center gap-1 bg-[var(--mv-surface)] px-2.5 py-1 text-xs font-bold disabled:opacity-50"
                      >
                        <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{translatingId === seg.id ? 'Translating...' : 'Translate'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(seg.id);
                          setEditDraft(displayText);
                        }}
                        className="nb-btn inline-flex min-h-8 items-center gap-1 bg-[var(--mv-surface)] px-2.5 py-1 text-xs font-bold"
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Correct</span>
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <label htmlFor={`edit-${seg.id}`} className="block text-xs font-bold">
                        Correct Caption (original text will be preserved)
                      </label>
                      <textarea
                        id={`edit-${seg.id}`}
                        rows={2}
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="w-full rounded-xl border-2 border-[var(--mv-border)] bg-[var(--mv-surface)] p-2.5 text-base font-medium"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (editDraft.trim()) {
                              onCorrectSegment(seg.id, editDraft.trim());
                            }
                            setEditingId(null);
                          }}
                          className="nb-btn inline-flex min-h-9 items-center gap-1 bg-[var(--mv-lime)] px-3 py-1 text-xs font-bold text-[#151515]"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Save Correction</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="nb-btn min-h-9 bg-[var(--mv-surface)] px-3 py-1 text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: `${isFocusMode ? Math.max(32, settings.captionSize) : settings.captionSize}px`,
                        lineHeight: 1.35,
                      }}
                      className="font-semibold break-words"
                    >
                      {seg.isUnclearAudio ? (
                        <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--mv-amber-bg)] px-2 py-1 text-[var(--mv-amber-ink)]">
                          <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden="true" />
                          <span>{displayText}</span>
                        </span>
                      ) : seg.correctedText ? (
                        <>
                          <span>{seg.correctedText}</span>
                          <p className="mt-2 text-xs font-semibold text-[var(--mv-text-muted)]">
                            Original recognized: {seg.originalText}
                          </p>
                        </>
                      ) : seg.hasConfidenceData && seg.words.length > 0 ? (
                        <span>
                          {seg.words.map((w, idx) => {
                            const isUncertain =
                              w.confidence !== null && w.confidence < settings.confidenceThreshold;
                            return (
                              <span key={`${seg.id}-w-${idx}`}>
                                {isUncertain ? (
                                  <span
                                    className="uncertain-word inline-flex items-center gap-1"
                                    title={`Low confidence (${w.confidence?.toFixed(2)}) — click Correct to verify`}
                                  >
                                    <span>{w.punctuatedWord ?? w.word}</span>
                                    <AlertTriangle
                                      className="inline h-4 w-4 text-[var(--mv-amber-ink)]"
                                      aria-label="Uncertain word"
                                    />
                                  </span>
                                ) : (
                                  <span>{w.punctuatedWord ?? w.word}</span>
                                )}
                                {' '}
                              </span>
                            );
                          })}
                        </span>
                      ) : (
                        <span>{displayText}</span>
                      )}
                    </div>
                  )}

                  {seg.translations &&
                    Object.entries(seg.translations).map(([lang, tr]) =>
                      tr ? (
                        <div
                          key={lang}
                          className="mt-3 rounded-xl border-2 border-[var(--mv-border)] bg-[var(--mv-surface)] p-3 text-base"
                        >
                          <div className="mb-1 flex items-center justify-between text-xs font-bold">
                            <span className="nb-pill bg-[var(--mv-lavender)] px-2 py-0.5 text-[#151515]">
                              Translation ({lang.toUpperCase()}) •{' '}
                              {tr.isDemo ? 'Demo Translation' : 'AI Translation (Gemini)'}
                            </span>
                          </div>
                          <p className="mt-1.5 font-medium leading-relaxed">{tr.text}</p>
                        </div>
                      ) : null
                    )}
                </article>
              );
            })}

            {interimText && (
              <div
                aria-live="off"
                style={{ fontSize: `${settings.captionSize}px`, lineHeight: 1.35 }}
                className="rounded-2xl border-[2.5px] border-dashed border-[var(--mv-border)] bg-[var(--mv-surface-alt)] p-4 italic text-[var(--mv-text-muted)]"
              >
                <span className="nb-pill mr-2 inline-block bg-[var(--mv-surface)] px-2.5 py-0.5 text-xs font-bold not-italic text-[var(--mv-text)]">
                  Interim
                </span>
                {interimText}
              </div>
            )}
          </div>
        </div>

        {/* Secondary Panel (hidden in Focus Mode) */}
        {!isFocusMode && (
          <aside
            aria-label="Classroom tools and saved moments"
            className="nb-card-lg flex flex-col gap-4 bg-[var(--mv-surface)] p-4"
          >
            <div className="flex gap-2 border-b-[2px] border-[var(--mv-border)] pb-3">
              <button
                type="button"
                aria-pressed={activeSideTab === 'saved'}
                onClick={() => setActiveSideTab('saved')}
                className={`nb-btn flex-1 px-3 py-2 text-sm font-bold ${
                  activeSideTab === 'saved'
                    ? 'bg-[var(--mv-lime)] text-[#151515]'
                    : 'bg-[var(--mv-surface-alt)]'
                }`}
              >
                Saved ({savedMoments.length})
              </button>
              <button
                type="button"
                aria-pressed={activeSideTab === 'commands'}
                onClick={() => setActiveSideTab('commands')}
                className={`nb-btn flex-1 px-3 py-2 text-sm font-bold ${
                  activeSideTab === 'commands'
                    ? 'bg-[var(--mv-lavender)] text-[#151515]'
                    : 'bg-[var(--mv-surface-alt)]'
                }`}
              >
                Voice Commands
              </button>
            </div>

            {activeSideTab === 'saved' ? (
              <div className="max-h-[42vh] flex-1 space-y-2.5 overflow-y-auto">
                {savedMoments.length === 0 ? (
                  <p className="text-sm font-medium text-[var(--mv-text-muted)]">
                    Highlighted concepts and bookmarked moments appear here for instant review.
                  </p>
                ) : (
                  savedMoments.map((m) => (
                    <a
                      key={m.id}
                      href={`#segment-${m.id}`}
                      className="nb-btn block bg-[var(--mv-bg)] p-3 text-sm"
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="nb-pill bg-[var(--mv-pink)] px-2 py-0.5 text-[#151515]">
                          {m.isBookmarked ? m.bookmarkLabel || 'Bookmark' : 'Important'}
                        </span>
                        <span className="font-mono">{formatTimestamp(m.timestampMs)}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 font-medium text-[var(--mv-text)]">
                        {m.correctedText ?? m.originalText}
                      </p>
                    </a>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2.5 text-xs font-medium text-[var(--mv-text-muted)]">
                <label className="flex cursor-pointer items-center justify-between rounded-xl border-2 border-[var(--mv-border)] bg-[var(--mv-bg)] p-2.5 text-sm font-bold text-[var(--mv-text)]">
                  <span>Listen for &ldquo;VAAK,&rdquo;</span>
                  <input
                    type="checkbox"
                    checked={settings.commandListeningEnabled}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        commandListeningEnabled: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-[var(--mv-border)]"
                  />
                </label>
                <p className="pt-1 font-bold text-[var(--mv-text)]">
                  Supported Commands (also accepts &ldquo;MyVoice,&rdquo;):
                </p>
                <ul className="list-disc space-y-1.5 pl-4">
                  <li>&ldquo;VAAK, start today&apos;s class on photosynthesis.&rdquo;</li>
                  <li>&ldquo;VAAK, mark that definition as important.&rdquo;</li>
                  <li>&ldquo;VAAK, translate the last explanation into Telugu.&rdquo;</li>
                  <li>&ldquo;VAAK, bookmark this topic.&rdquo;</li>
                  <li>&ldquo;VAAK, catch me up.&rdquo; / &ldquo;summarize what we covered.&rdquo;</li>
                  <li>&ldquo;VAAK, end the class and prepare study notes.&rdquo;</li>
                </ul>
              </div>
            )}

            <div className="mt-auto border-t-[2px] border-[var(--mv-border)] pt-3">
              <button
                type="button"
                onClick={onOpenParticipation}
                className="nb-btn inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[var(--mv-lavender)] px-4 py-2.5 text-sm font-bold text-[#151515]"
              >
                <Volume2 className="h-5 w-5" aria-hidden="true" />
                <span>Student Participation (Speak Question)</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile Sticky Bottom Controls */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 border-t-[3px] border-[var(--mv-border)] bg-[var(--mv-surface)] px-3 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={onOpenParticipation}
          className="nb-btn inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 bg-[var(--mv-lavender)] px-3 py-2 text-xs font-bold text-[#151515]"
        >
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          <span>Speak Question</span>
        </button>

        {(isListening || isReconnecting || recordingState === 'connecting') && (
          <button
            type="button"
            onClick={onStopRecording}
            className="nb-btn inline-flex min-h-11 items-center justify-center gap-1.5 bg-[var(--mv-danger)] px-3.5 py-2 text-xs font-bold text-[#151515]"
          >
            <Square className="h-4 w-4" aria-hidden="true" />
            <span>Stop</span>
          </button>
        )}

        <button
          type="button"
          onClick={onEndClassAndGenerateNotes}
          disabled={recordingState === 'generating_notes'}
          className="nb-btn inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 bg-[var(--mv-lime)] px-3 py-2 text-xs font-bold text-[#151515] disabled:opacity-50"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          <span>End &amp; Notes</span>
        </button>
      </div>
    </div>
  );
}
