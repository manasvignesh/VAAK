import { useState } from 'react';
import {
  HelpCircle,
  History,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Send,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { VoiceTurnState } from '../types';

export interface CompanionTurn {
  id: string;
  userText: string;
  assistantText: string;
  sourceSummary?: string;
}

interface VoiceCompanionBarProps {
  voiceModeEnabled: boolean;
  turnState: VoiceTurnState;
  autoSpeakEnabled: boolean;
  currentResponse: string;
  currentSourceSummary?: string;
  errorMessage?: string | null;
  history: CompanionTurn[];
  onToggleVoiceMode: () => void;
  onRetryVoiceMode?: () => void;
  onSubmitCommandText: (text: string) => void;
  onStopSpeaking: () => void;
  onPauseSpeaking: () => void;
  onResumeSpeaking: () => void;
  onRepeatLast: () => void;
  onToggleAutoSpeak: () => void;
  onShowHelp: () => void;
}

export function VoiceCompanionBar({
  voiceModeEnabled,
  turnState,
  autoSpeakEnabled,
  currentResponse,
  currentSourceSummary,
  errorMessage,
  history,
  onToggleVoiceMode,
  onRetryVoiceMode,
  onSubmitCommandText,
  onStopSpeaking,
  onPauseSpeaking,
  onResumeSpeaking,
  onRepeatLast,
  onToggleAutoSpeak,
  onShowHelp,
}: VoiceCompanionBarProps) {
  const [commandDraft, setCommandDraft] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commandDraft.trim();
    if (!trimmed) return;
    setCommandDraft('');
    onSubmitCommandText(trimmed);
  };

  const stateBadgeColor =
    turnState === 'listening' || turnState === 'recognizing'
      ? 'bg-[var(--mv-lime)]'
      : turnState === 'speaking'
        ? 'bg-[var(--mv-lavender)]'
        : turnState === 'processing'
          ? 'bg-[var(--mv-pink)]'
          : turnState === 'interrupted' || turnState === 'error'
            ? 'bg-[var(--mv-amber)]'
            : 'bg-[var(--mv-surface-alt)]';

  return (
    <section
      aria-label="VAAK Voice Companion"
      data-tour-id="voice-companion-bar"
      className="border-b-[3px] border-[var(--mv-border)] bg-[var(--mv-surface-alt)] px-3 py-2 sm:px-4 sm:py-2.5"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              aria-pressed={voiceModeEnabled}
              onClick={onToggleVoiceMode}
              className={`nb-btn inline-flex min-h-9 items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#151515] sm:min-h-10 sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-xs ${
                voiceModeEnabled ? 'bg-[var(--mv-lime)]' : 'bg-[var(--mv-surface)] text-[var(--mv-text)]'
              }`}
            >
              {voiceModeEnabled ? (
                <>
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  <span>Voice Mode: ON (Stop Listening)</span>
                </>
              ) : (
                <>
                  <MicOff className="h-4 w-4" aria-hidden="true" />
                  <span>Activate Voice Mode</span>
                </>
              )}
            </button>

            <span
              className={`nb-pill px-2.5 py-1 font-mono text-xs font-bold uppercase text-[#151515] ${stateBadgeColor}`}
            >
              State: {turnState}
            </span>

            <button
              type="button"
              aria-pressed={autoSpeakEnabled}
              onClick={onToggleAutoSpeak}
              className="nb-btn inline-flex min-h-9 items-center gap-1.5 bg-[var(--mv-surface)] px-2.5 py-1 text-xs font-bold"
              title="Toggle automatic spoken responses (disable if using NVDA or another screen reader)"
            >
              {autoSpeakEnabled ? (
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{autoSpeakEnabled ? 'Spoken Replies On' : 'Spoken Replies Muted'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {turnState === 'speaking' && (
              <>
                <button
                  type="button"
                  onClick={onPauseSpeaking}
                  className="nb-btn inline-flex min-h-9 items-center gap-1 bg-[var(--mv-surface)] px-2.5 py-1 text-xs font-bold"
                >
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Pause</span>
                </button>
                <button
                  type="button"
                  onClick={onStopSpeaking}
                  className="nb-btn inline-flex min-h-9 items-center gap-1 bg-[var(--mv-danger)] px-2.5 py-1 text-xs font-bold text-[#151515]"
                >
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Stop Speaking</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onResumeSpeaking}
              className="nb-btn inline-flex min-h-8 items-center gap-1 bg-[var(--mv-surface)] px-2 py-1 text-[11px] font-bold sm:min-h-9 sm:px-2.5 sm:text-xs"
              title="Resume paused speech"
            >
              <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              <span>Continue</span>
            </button>

            <button
              type="button"
              onClick={onRepeatLast}
              className="nb-btn inline-flex min-h-8 items-center gap-1 bg-[var(--mv-surface)] px-2 py-1 text-[11px] font-bold sm:min-h-9 sm:px-2.5 sm:text-xs"
            >
              <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              <span>Repeat</span>
            </button>

            <button
              type="button"
              onClick={onShowHelp}
              className="nb-btn inline-flex min-h-8 items-center gap-1 bg-[var(--mv-lavender)] px-2 py-1 text-[11px] font-bold text-[#151515] sm:min-h-9 sm:px-2.5 sm:text-xs"
            >
              <HelpCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              <span>What Can I Do?</span>
            </button>

            <button
              type="button"
              aria-expanded={showHistory}
              onClick={() => setShowHistory((s) => !s)}
              className="nb-btn inline-flex min-h-8 items-center gap-1 bg-[var(--mv-surface)] px-2 py-1 text-[11px] font-bold sm:min-h-9 sm:px-2.5 sm:text-xs"
            >
              <History className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              <span>History ({history.length})</span>
            </button>
          </div>
        </div>

        {/* Accessible Command & Question Bar */}
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
          <label htmlFor="vaak-companion-input" className="visually-hidden">
            Speak or type a global VAAK command or lecture question
          </label>
          <input
            id="vaak-companion-input"
            type="text"
            value={commandDraft}
            onChange={(e) => setCommandDraft(e.target.value)}
            placeholder='Try: "Open my classes", "Read my latest notes", or "What did the teacher say about chlorophyll?"'
            className="min-h-10 flex-1 rounded-xl border-2 border-[var(--mv-border)] bg-[var(--mv-surface)] px-3 py-1.5 text-sm font-medium"
          />
          <button
            type="submit"
            className="nb-btn inline-flex min-h-10 items-center gap-1.5 bg-[var(--mv-pink)] px-4 py-1.5 text-xs font-bold text-[#151515]"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Send Command</span>
          </button>
        </form>

        {/* Accessible Error Banner & Recovery */}
        {(turnState === 'error' || errorMessage) && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[var(--mv-border)] bg-[var(--mv-amber)] px-3.5 py-2 text-sm font-bold text-[#151515]"
          >
            <span>
              {errorMessage ||
                'Voice recognition hit an unexpected error. Check microphone permission and server connection, then retry.'}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {onRetryVoiceMode && (
                <button
                  type="button"
                  onClick={onRetryVoiceMode}
                  className="nb-btn inline-flex min-h-9 items-center gap-1.5 bg-[var(--mv-lime)] px-3 py-1 text-xs font-bold text-[#151515]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Retry Voice Mode</span>
                </button>
              )}
              {voiceModeEnabled && (
                <button
                  type="button"
                  onClick={onToggleVoiceMode}
                  className="nb-btn inline-flex min-h-9 items-center gap-1.5 bg-[var(--mv-surface)] px-3 py-1 text-xs font-bold text-[var(--mv-text)]"
                >
                  <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Turn Off Voice Mode</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Visual Companion Response */}
        {currentResponse && turnState !== 'error' && !errorMessage && (
          <div
            role="status"
            className="rounded-xl border-2 border-[var(--mv-border)] bg-[var(--mv-surface)] px-3.5 py-2 text-sm font-semibold"
          >
            <span>{currentResponse}</span>
            {currentSourceSummary && (
              <span className="ml-2 font-mono text-xs text-[var(--mv-text-muted)]">
                ({currentSourceSummary})
              </span>
            )}
          </div>
        )}

        {showHistory && history.length > 0 && (
          <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border-2 border-[var(--mv-border)] bg-[var(--mv-surface)] p-3 text-xs">
            {history.slice(-6).map((item) => (
              <div key={item.id} className="border-b border-[var(--mv-border)]/20 pb-1.5 last:border-0">
                <p className="font-bold">You: {item.userText}</p>
                <p className="text-[var(--mv-text-muted)]">VAAK: {item.assistantText}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
