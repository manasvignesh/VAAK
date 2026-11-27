import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Check,
  Edit3,
  FileText,
  Highlighter,
  Languages,
  Mic,
  MicOff,
  Pause,
  Play,
  SkipForward,
  Square,
  Volume2,
} from 'lucide-react';
import type {
  AccessibilitySettings,
  ClassroomSession,
  RecordingState,
  TranscriptSegment,
  TranslationLanguage,
} from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface LiveClassroomScreenProps {
  session: ClassroomSession | null;
  interimText: string;
  recordingState: RecordingState;
  micLevel: number;
  statusMessage: string;
  commandFeedback: { tone: 'success' | 'warning' | 'info'; message: string } | null;
  settings: AccessibilitySettings;
  onUpdateSettings: (next: AccessibilitySettings) => void;
  onStopRecording: () => void;
  onEndClassAndGenerateNotes: () => void;
  onToggleHighlight: (segmentId: string) => void;
  onToggleBookmark: (segmentId: string) => void;
  onCorrectSegment: (segmentId: string, correctedText: string) => void;
  onTranslateSegment: (segmentId: string, targetLanguage: TranslationLanguage) => Promise<void>;
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
  statusMessage,
  commandFeedback,
  settings,
  onUpdateSettings,
  onStopRecording,
  onEndClassAndGenerateNotes,
  onToggleHighlight,
  onToggleBookmark,
  onCorrectSegment,
  onTranslateSegment,
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
  const [translateTarget, setTranslateTarget] = useState<TranslationLanguage>('te');
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
        <div className="rounded-2xl border border-[var(--mv-border)] bg-[var(--mv-surface)] p-8">
          <Mic className="mx-auto h-10 w-10 text-[var(--mv-accent)]" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold">No Active Classroom Session</h1>
          <p className="mt-2 text-sm text-[var(--mv-text-muted)]">
            Start a live class with your microphone or launch the key-free Interactive Photosynthesis
            Demo to see real-time captions, uncertainty flags, and voice commands.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onStartLiveClass}
              className="min-h-11 rounded-xl bg-[var(--mv-accent)] px-5 py-2.5 font-semibold text-[var(--mv-accent-text)] hover:bg-[var(--mv-accent-hover)]"
            >
              Start Live Class
            </button>
            <button
              type="button"
              onClick={onStartDemo}
              className="min-h-11 rounded-xl border border-[var(--mv-accent)] bg-[var(--mv-accent-soft)] px-5 py-2.5 font-semibold text-[var(--mv-accent)]"
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
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 pb-24 lg:pb-6">
      {/* Top Status & Controls Bar */}
      <section
        aria-label="Classroom session status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--mv-radius-md)] border border-[var(--mv-border)] bg-[var(--mv-surface)] px-4 py-3 shadow-[var(--mv-shadow-sm)]"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold leading-tight">{session.title}</h1>
              <span className="rounded-md bg-[var(--mv-surface-alt)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--mv-text-muted)]">
                {formatTimestamp(elapsedSec * 1000)}
              </span>
            </div>
            <p className="text-xs text-[var(--mv-text-muted)]">{statusMessage}</p>
          </div>

          {session.isDemo && <StatusBadge tone="demo" label="Interactive Demo Mode" />}
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
                  ? '"MyVoice," Ready'
                  : 'Commands Paused'
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Genuine Microphone Activity Meter */}
          {!session.isDemo && (
            <div
              className="flex items-center gap-2 rounded-xl border border-[var(--mv-border)] bg-[var(--mv-surface-alt)] px-3 py-1.5"
              aria-label={`Microphone activity level ${Math.round(micLevel * 100)} percent`}
            >
              {isListening ? (
                <Mic className="h-4 w-4 text-[var(--mv-accent)]" aria-hidden="true" />
              ) : (
                <MicOff className="h-4 w-4 text-[var(--mv-text-muted)]" aria-hidden="true" />
              )}
              <div className="h-2 w-16 overflow-hidden rounded-full bg-[var(--mv-border)]">
                <div
                  className="h-full bg-[var(--mv-accent)] transition-all duration-75"
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
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--mv-border)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--mv-surface-alt)]"
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
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--mv-border)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--mv-surface-alt)]"
              >
                <SkipForward className="h-4 w-4" aria-hidden="true" />
                <span>Next Step</span>
              </button>
            </>
          )}

          <button
            type="button"
            aria-pressed={!settings.autoScroll}
            onClick={() => onUpdateSettings({ ...settings, autoScroll: !settings.autoScroll })}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--mv-border)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--mv-surface-alt)]"
          >
            {settings.autoScroll ? 'Pause Auto-Scroll' : 'Resume Auto-Scroll'}
          </button>

          {(isListening || isReconnecting || recordingState === 'connecting') && (
            <button
              type="button"
              onClick={onStopRecording}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--mv-danger)] bg-[var(--mv-danger-bg)] px-3.5 py-1.5 text-sm font-semibold text-[var(--mv-danger)]"
            >
              <Square className="h-4 w-4" aria-hidden="true" />
              <span>Stop Recording</span>
            </button>
          )}

          <button
            type="button"
            onClick={onEndClassAndGenerateNotes}
            disabled={recordingState === 'generating_notes'}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--mv-accent)] px-4 py-1.5 text-sm font-semibold text-[var(--mv-accent-text)] hover:bg-[var(--mv-accent-hover)] disabled:opacity-50"
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

      {/* Voice Command Feedback Banner */}
      {commandFeedback && (
        <div
          key={commandFeedback.message}
          role="status"
          className={`mv-ack-enter rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-[var(--mv-shadow-sm)] ${
            commandFeedback.tone === 'success'
              ? 'border-[var(--mv-success)] bg-[var(--mv-success-bg)] text-[var(--mv-success)]'
              : commandFeedback.tone === 'warning'
                ? 'border-[var(--mv-amber)] bg-[var(--mv-amber-bg)] text-[var(--mv-amber)]'
                : 'border-[var(--mv-border)] bg-[var(--mv-surface)] text-[var(--mv-text)]'
          }`}
        >
          {commandFeedback.message}
        </div>
      )}

      {/* Main Layout: Captions First (2/3 width on desktop) + Secondary Panel (1/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col rounded-2xl border border-[var(--mv-border)] bg-[var(--mv-surface)] lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--mv-border)] px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-[var(--mv-text-muted)]">
              <span>LIVE CAPTIONS</span>
              <span>•</span>
              <span>Size: {settings.captionSize}px</span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="translate-lang-select" className="font-semibold">
                Translate to:
              </label>
              <select
                id="translate-lang-select"
                value={translateTarget}
                onChange={(e) => setTranslateTarget(e.target.value as TranslationLanguage)}
                className="rounded-lg border border-[var(--mv-border)] bg-[var(--mv-bg)] px-2 py-1 text-xs font-semibold"
              >
                <option value="te">Telugu (తెలుగు)</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="h-[58vh] min-h-[340px] space-y-4 overflow-y-auto p-4 sm:p-6"
            tabIndex={0}
            aria-label="Live classroom transcript"
          >
            {session.segments.length === 0 && !interimText && (
              <p className="text-base text-[var(--mv-text-muted)]">
                Listening for classroom speech... Speak naturally or say{' '}
                <code>&ldquo;MyVoice, mark that as important.&rdquo;</code>
              </p>
            )}

            {session.segments.map((seg: TranscriptSegment) => {
              if (seg.isGapMarker) {
                return (
                  <div
                    key={seg.id}
                    className="rounded-xl border border-dashed border-[var(--mv-amber)] bg-[var(--mv-amber-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--mv-amber)]"
                  >
                    [{formatTimestamp(seg.timestampMs)}] {seg.originalText}
                  </div>
                );
              }

              if (seg.isVoiceCommand) {
                return (
                  <div
                    key={seg.id}
                    className="rounded-xl border border-[var(--mv-border)] bg-[var(--mv-surface-alt)] px-3.5 py-2 text-xs text-[var(--mv-text-muted)]"
                  >
                    <span className="font-mono font-semibold">
                      [{formatTimestamp(seg.timestampMs)}]
                    </span>{' '}
                    <span className="font-semibold text-[var(--mv-accent)]">Voice Command:</span>{' '}
                    {seg.originalText}
                  </div>
                );
              }

              const displayText = seg.correctedText ?? seg.originalText;
              const isEditing = editingId === seg.id;

              return (
                <article
                  key={seg.id}
                  id={`segment-${seg.id}`}
                  className={`rounded-2xl border p-4 transition-colors ${
                    seg.highlightType
                      ? 'border-[var(--mv-accent)] bg-[var(--mv-accent-soft)]/50'
                      : 'border-[var(--mv-border)] bg-[var(--mv-bg)]'
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--mv-text-muted)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold">
                        [{formatTimestamp(seg.timestampMs)}]
                      </span>
                      <span className="rounded bg-[var(--mv-surface-alt)] px-1.5 py-0.5 font-mono">
                        #{seg.id}
                      </span>
                      {seg.languageDetected && (
                        <span className="rounded bg-[var(--mv-surface-alt)] px-1.5 py-0.5">
                          {seg.languageDetected}
                        </span>
                      )}
                      {!seg.hasConfidenceData && !seg.isUnclearAudio && (
                        <span>Confidence unavailable</span>
                      )}
                      {seg.highlightType && (
                        <span className="inline-flex items-center gap-1 font-semibold text-[var(--mv-accent)]">
                          <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
                          Important
                        </span>
                      )}
                      {seg.isBookmarked && (
                        <span className="inline-flex items-center gap-1 font-semibold text-[var(--mv-amber)]">
                          <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                          {seg.bookmarkLabel || 'Bookmarked'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleHighlight(seg.id)}
                        aria-pressed={Boolean(seg.highlightType)}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--mv-border)] bg-[var(--mv-surface)] px-2.5 py-1 font-semibold hover:bg-[var(--mv-surface-alt)]"
                      >
                        <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Highlight</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleBookmark(seg.id)}
                        aria-pressed={Boolean(seg.isBookmarked)}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--mv-border)] bg-[var(--mv-surface)] px-2.5 py-1 font-semibold hover:bg-[var(--mv-surface-alt)]"
                      >
                        <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Bookmark</span>
                      </button>

                      <button
                        type="button"
                        disabled={translatingId === seg.id || seg.isUnclearAudio}
                        onClick={() => void handleTranslate(seg.id)}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--mv-border)] bg-[var(--mv-surface)] px-2.5 py-1 font-semibold hover:bg-[var(--mv-surface-alt)] disabled:opacity-50"
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
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--mv-border)] bg-[var(--mv-surface)] px-2.5 py-1 font-semibold hover:bg-[var(--mv-surface-alt)]"
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Correct</span>
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <label htmlFor={`edit-${seg.id}`} className="block text-xs font-semibold">
                        Correct Caption (original text will be preserved)
                      </label>
                      <textarea
                        id={`edit-${seg.id}`}
                        rows={2}
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="w-full rounded-lg border border-[var(--mv-border)] bg-[var(--mv-surface)] p-2.5 text-base"
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
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[var(--mv-accent)] px-3 py-1 text-xs font-semibold text-[var(--mv-accent-text)]"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Save Correction</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="min-h-9 rounded-lg border border-[var(--mv-border)] px-3 py-1 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{ fontSize: `${settings.captionSize}px`, lineHeight: 1.38 }}
                      className="font-medium break-words"
                    >
                      {seg.isUnclearAudio ? (
                        <span className="inline-flex items-center gap-2 text-[var(--mv-amber)]">
                          <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden="true" />
                          <span>{displayText}</span>
                        </span>
                      ) : seg.correctedText ? (
                        <>
                          <span>{seg.correctedText}</span>
                          <p className="mt-1.5 text-xs font-normal text-[var(--mv-text-muted)]">
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
                                      className="inline h-4 w-4 text-[var(--mv-amber)]"
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

                  {/* Translations displayed alongside original caption */}
                  {seg.translations &&
                    Object.entries(seg.translations).map(([lang, tr]) =>
                      tr ? (
                        <div
                          key={lang}
                          className="mt-3 rounded-xl border border-[var(--mv-border)] bg-[var(--mv-surface)] p-3 text-base"
                        >
                          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[var(--mv-accent)]">
                            <span>
                              Translation ({lang.toUpperCase()}) •{' '}
                              {tr.isDemo ? 'Demo Translation' : 'AI Translation (Gemini)'}
                            </span>
                          </div>
                          <p className="leading-relaxed">{tr.text}</p>
                        </div>
                      ) : null
                    )}
                </article>
              );
            })}

            {interimText && (
              <div
                aria-live="off"
                style={{ fontSize: `${settings.captionSize}px`, lineHeight: 1.38 }}
                className="rounded-2xl border border-dashed border-[var(--mv-border)] bg-[var(--mv-surface-alt)] p-4 italic text-[var(--mv-text-muted)]"
              >
                <span className="mr-2 inline-block rounded bg-[var(--mv-surface)] px-2 py-0.5 text-xs font-semibold not-italic">
                  Interim
                </span>
                {interimText}
              </div>
            )}
          </div>
        </div>

        {/* Secondary Desktop Panel / Mobile Quick Controls */}
        <aside
          aria-label="Classroom tools and saved moments"
          className="flex flex-col gap-4 rounded-2xl border border-[var(--mv-border)] bg-[var(--mv-surface)] p-4"
        >
          <div className="flex gap-2 border-b border-[var(--mv-border)] pb-3">
            <button
              type="button"
              aria-pressed={activeSideTab === 'saved'}
              onClick={() => setActiveSideTab('saved')}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                activeSideTab === 'saved'
                  ? 'bg-[var(--mv-accent)] text-[var(--mv-accent-text)]'
                  : 'bg-[var(--mv-surface-alt)]'
              }`}
            >
              Saved ({savedMoments.length})
            </button>
            <button
              type="button"
              aria-pressed={activeSideTab === 'commands'}
              onClick={() => setActiveSideTab('commands')}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                activeSideTab === 'commands'
                  ? 'bg-[var(--mv-accent)] text-[var(--mv-accent-text)]'
                  : 'bg-[var(--mv-surface-alt)]'
              }`}
            >
              Voice Commands
            </button>
          </div>

          {activeSideTab === 'saved' ? (
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[42vh]">
              {savedMoments.length === 0 ? (
                <p className="text-sm text-[var(--mv-text-muted)]">
                  Highlighted concepts and bookmarked moments will appear here for quick review.
                </p>
              ) : (
                savedMoments.map((m) => (
                  <a
                    key={m.id}
                    href={`#segment-${m.id}`}
                    className="block rounded-xl border border-[var(--mv-border)] bg-[var(--mv-bg)] p-3 text-sm hover:border-[var(--mv-accent)]"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--mv-accent)]">
                      <span>{m.isBookmarked ? m.bookmarkLabel || 'Bookmark' : 'Important'}</span>
                      <span className="font-mono">{formatTimestamp(m.timestampMs)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[var(--mv-text)]">
                      {m.correctedText ?? m.originalText}
                    </p>
                  </a>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2 text-xs text-[var(--mv-text-muted)]">
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--mv-border)] p-2.5 text-sm font-semibold text-[var(--mv-text)]">
                <span>Listen for &ldquo;MyVoice,&rdquo;</span>
                <input
                  type="checkbox"
                  checked={settings.commandListeningEnabled}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      commandListeningEnabled: e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-[var(--mv-accent)]"
                />
              </label>
              <p className="pt-1 font-semibold text-[var(--mv-text)]">Supported Commands:</p>
              <ul className="list-disc space-y-1.5 pl-4">
                <li>&ldquo;MyVoice, start today&apos;s class on photosynthesis.&rdquo;</li>
                <li>&ldquo;MyVoice, mark that definition as important.&rdquo;</li>
                <li>&ldquo;MyVoice, translate the last explanation into Telugu.&rdquo;</li>
                <li>&ldquo;MyVoice, bookmark this topic.&rdquo;</li>
                <li>&ldquo;MyVoice, summarize what we covered so far.&rdquo;</li>
                <li>&ldquo;MyVoice, end the class and prepare study notes.&rdquo;</li>
              </ul>
            </div>
          )}

          <div className="mt-auto border-t border-[var(--mv-border)] pt-3">
            <button
              type="button"
              onClick={onOpenParticipation}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--mv-accent)] bg-[var(--mv-accent-soft)] px-4 py-2.5 text-sm font-bold text-[var(--mv-accent)] hover:opacity-90"
            >
              <Volume2 className="h-5 w-5" aria-hidden="true" />
              <span>Student Participation (Speak Question)</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile Sticky Bottom Controls */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 border-t border-[var(--mv-border)] bg-[var(--mv-surface)] px-3 py-2.5 shadow-[var(--mv-shadow-md)] lg:hidden">
        <button
          type="button"
          onClick={onOpenParticipation}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--mv-accent)] bg-[var(--mv-accent-soft)] px-3 py-2 text-xs font-bold text-[var(--mv-accent)]"
        >
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          <span>Speak Question</span>
        </button>

        {(isListening || isReconnecting || recordingState === 'connecting') && (
          <button
            type="button"
            onClick={onStopRecording}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--mv-danger)] bg-[var(--mv-danger-bg)] px-3.5 py-2 text-xs font-bold text-[var(--mv-danger)]"
          >
            <Square className="h-4 w-4" aria-hidden="true" />
            <span>Stop</span>
          </button>
        )}

        <button
          type="button"
          onClick={onEndClassAndGenerateNotes}
          disabled={recordingState === 'generating_notes'}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--mv-accent)] px-3 py-2 text-xs font-bold text-[var(--mv-accent-text)] disabled:opacity-50"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          <span>End &amp; Notes</span>
        </button>
      </div>
    </div>
  );
}
