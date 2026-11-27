import { useEffect, useRef, useState } from 'react';
import { Eye, Mic, Volume2, X } from 'lucide-react';
import type { AccessibilitySettings } from '../types';

interface OnboardingDialogProps {
  open: boolean;
  settings: AccessibilitySettings;
  onSavePreferences: (next: AccessibilitySettings, activateVoiceNow: boolean) => void;
  onClose: () => void;
}

export function OnboardingDialog({
  open,
  settings,
  onSavePreferences,
  onClose,
}: OnboardingDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [voiceMode, setVoiceMode] = useState(Boolean(settings.voiceModeEnabled));
  const [autoSpeak, setAutoSpeak] = useState(settings.autoSpeakResponses ?? true);
  const [focusMode, setFocusMode] = useState(Boolean(settings.focusMode));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="onboarding-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="nb-pill inline-block bg-[var(--mv-lime)] px-2.5 py-0.5 text-xs font-bold text-[#151515]">
            Welcome to VAAK
          </span>
          <h1 id="onboarding-title" className="mt-2 text-2xl font-bold">
            Choose How You Interact
          </h1>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close onboarding guide"
          className="nb-btn bg-[var(--mv-surface)] p-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-2 text-sm font-medium text-[var(--mv-text-muted)]">
        Combine any modes below or switch anytime. No disability disclosure is ever required.
      </p>

      <div className="mt-4 space-y-3 text-sm">
        <div className="rounded-xl border-2 border-[var(--mv-border)] bg-[var(--mv-bg)] p-3.5">
          <div className="flex items-center gap-2 font-bold">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>Visual Mode (Always Available)</span>
          </div>
          <p className="mt-1 text-xs text-[var(--mv-text-muted)]">
            Live multilingual captions, uncertainty underlines, translations, and readable study
            notes.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[var(--mv-border)] bg-[var(--mv-lavender)]/35 p-3.5">
          <input
            type="checkbox"
            checked={voiceMode}
            onChange={(e) => setVoiceMode(e.target.checked)}
            className="mt-1 h-5 w-5 accent-[var(--mv-border)]"
          />
          <div>
            <span className="flex items-center gap-1.5 font-bold">
              <Mic className="h-4 w-4" aria-hidden="true" />
              <span>Voice Mode (Spoken Navigation &amp; Q&amp;A)</span>
            </span>
            <span className="mt-0.5 block text-xs text-[var(--mv-text-muted)]">
              Navigate screens, ask questions about saved classes, and listen to study notes.
              Browser microphone permission is requested only after you click Activate.
            </span>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[var(--mv-border)] bg-[var(--mv-pink)]/35 p-3.5">
          <input
            type="checkbox"
            checked={autoSpeak}
            onChange={(e) => setAutoSpeak(e.target.checked)}
            className="mt-1 h-5 w-5 accent-[var(--mv-border)]"
          />
          <div>
            <span className="flex items-center gap-1.5 font-bold">
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              <span>Speak Responses Aloud (Uncheck if using NVDA / Screen Reader)</span>
            </span>
            <span className="mt-0.5 block text-xs text-[var(--mv-text-muted)]">
              Press Stop Speaking or Escape anytime to interrupt playback.
            </span>
          </div>
        </label>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border-2 border-[var(--mv-border)] bg-[var(--mv-bg)] p-3">
          <span className="font-bold">Start in Focus Mode (Distraction-Free Captions)</span>
          <input
            type="checkbox"
            checked={focusMode}
            onChange={(e) => setFocusMode(e.target.checked)}
            className="h-5 w-5 accent-[var(--mv-border)]"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            onSavePreferences(
              {
                ...settings,
                voiceModeEnabled: false,
                autoSpeakResponses: autoSpeak,
                focusMode,
                onboardingCompleted: true,
              },
              false
            )
          }
          className="nb-btn min-h-11 bg-[var(--mv-surface)] px-4 py-2 font-bold"
        >
          Continue Visually
        </button>
        <button
          type="button"
          onClick={() =>
            onSavePreferences(
              {
                ...settings,
                voiceModeEnabled: true,
                autoSpeakResponses: autoSpeak,
                focusMode,
                onboardingCompleted: true,
              },
              true
            )
          }
          className="nb-btn min-h-11 bg-[var(--mv-lime)] px-5 py-2 font-bold text-[#151515]"
        >
          Save &amp; Activate Voice Mode
        </button>
      </div>
    </dialog>
  );
}
