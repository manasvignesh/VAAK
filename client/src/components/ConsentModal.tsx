import { useEffect, useRef, useState } from 'react';
import { Mic, ShieldCheck, X } from 'lucide-react';
import type { AppCapabilities, SupportedLanguage } from '../types';

interface ConsentModalProps {
  open: boolean;
  capabilities: AppCapabilities | null;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  onConfirm: (sessionTitle: string) => void;
  onUseDemo: () => void;
  onCancel: () => void;
}

export function ConsentModal({
  open,
  capabilities,
  selectedLanguage,
  onSelectLanguage,
  onConfirm,
  onUseDemo,
  onCancel,
}: ConsentModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [consented, setConsented] = useState(false);
  const [title, setTitle] = useState('Live Classroom Session');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setConsented(false);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const sttReady = capabilities?.speechToTextConfigured ?? false;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="consent-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--mv-accent-soft)] text-[var(--mv-accent)]">
            <Mic className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 id="consent-dialog-title" className="text-xl font-bold">
            Classroom Recording &amp; Consent
          </h1>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close consent dialog"
          className="rounded-lg border border-[var(--mv-border)] p-2 text-[var(--mv-text-muted)] hover:bg-[var(--mv-surface-alt)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {!sttReady && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-[var(--mv-amber)] bg-[var(--mv-amber-bg)] p-3.5 text-sm text-[var(--mv-amber)]"
        >
          <strong>Live Speech-to-Text API Key Not Configured:</strong> Server{' '}
          <code>DEEPGRAM_API_KEY</code> is not set. Live microphone transcription cannot connect to
          Deepgram right now. You can still launch <strong>Interactive Demo Mode</strong> to test
          the full classroom flow without API keys.
        </div>
      )}

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <label htmlFor="session-title-input" className="block font-semibold">
            Class Topic / Title
          </label>
          <input
            id="session-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[var(--mv-border)] bg-[var(--mv-bg)] px-3 py-2.5 text-base"
            placeholder="e.g., Photosynthesis & Plant Respiration"
          />
        </div>

        <div>
          <label htmlFor="session-language-select" className="block font-semibold">
            Spoken Classroom Language
          </label>
          <select
            id="session-language-select"
            value={selectedLanguage}
            onChange={(e) => onSelectLanguage(e.target.value as SupportedLanguage)}
            className="mt-1.5 w-full rounded-lg border border-[var(--mv-border)] bg-[var(--mv-bg)] px-3 py-2.5 text-base"
          >
            <option value="multi">Multilingual (English + Hindi + Telugu code-switching)</option>
            <option value="en-IN">Indian English (en-IN)</option>
            <option value="hi">Hindi (हिन्दी)</option>
            <option value="te">Telugu (తెలుగు)</option>
          </select>
        </div>

        <div className="rounded-xl border border-[var(--mv-border)] bg-[var(--mv-surface-alt)] p-3.5">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-[var(--mv-accent)]" aria-hidden="true" />
            <span>Privacy &amp; Classroom Notice</span>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--mv-text-muted)]">
            <li>Raw microphone audio is streamed for live captions and is never permanently stored.</li>
            <li>Audio and transcripts may be processed by configured external AI providers (Deepgram / Gemini).</li>
            <li>Transcripts, highlights, bookmarks, and notes are saved locally in your browser.</li>
          </ul>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--mv-border)] p-3">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--mv-accent)]"
          />
          <span className="text-sm leading-snug">
            I confirm that classroom participants have been informed and consent to live audio
            captioning for accessibility.
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-[var(--mv-border)] px-4 py-2 font-semibold hover:bg-[var(--mv-surface-alt)]"
        >
          Cancel
        </button>
        {!sttReady && (
          <button
            type="button"
            onClick={onUseDemo}
            className="min-h-11 rounded-xl border border-[var(--mv-accent)] bg-[var(--mv-accent-soft)] px-4 py-2 font-semibold text-[var(--mv-accent)] hover:opacity-90"
          >
            Try Interactive Demo Instead
          </button>
        )}
        <button
          type="button"
          disabled={!consented || !sttReady}
          onClick={() => onConfirm(title.trim() || 'Live Classroom Session')}
          className="min-h-11 rounded-xl bg-[var(--mv-accent)] px-5 py-2 font-semibold text-[var(--mv-accent-text)] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--mv-accent-hover)]"
        >
          Allow Microphone &amp; Start
        </button>
      </div>
    </dialog>
  );
}
