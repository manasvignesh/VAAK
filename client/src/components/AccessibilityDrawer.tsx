import { useEffect, useRef } from 'react';
import { Accessibility, X } from 'lucide-react';
import type { AccessibilitySettings, CaptionSize } from '../types';

interface AccessibilityDrawerProps {
  open: boolean;
  settings: AccessibilitySettings;
  onChange: (next: AccessibilitySettings) => void;
  onClose: () => void;
}

export function AccessibilityDrawer({
  open,
  settings,
  onChange,
  onClose,
}: AccessibilityDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const captionSizes: CaptionSize[] = [24, 32, 40];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="a11y-settings-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Accessibility className="h-5 w-5 text-[var(--mv-accent)]" aria-hidden="true" />
          <h1 id="a11y-settings-title" className="text-xl font-bold">
            Accessibility &amp; Display Settings
          </h1>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close accessibility settings"
          className="rounded-lg border border-[var(--mv-border)] p-2 hover:bg-[var(--mv-surface-alt)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 space-y-5 text-sm">
        <div>
          <span className="block font-semibold">Live Caption Size</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {captionSizes.map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={settings.captionSize === size}
                onClick={() => onChange({ ...settings, captionSize: size })}
                className={`min-h-11 rounded-xl border px-3 py-2 font-semibold ${
                  settings.captionSize === size
                    ? 'border-[var(--mv-accent)] bg-[var(--mv-accent-soft)] text-[var(--mv-accent)]'
                    : 'border-[var(--mv-border)] hover:bg-[var(--mv-surface-alt)]'
                }`}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block font-semibold">Color Theme</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(['light', 'dark'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                aria-pressed={settings.theme === theme}
                onClick={() => onChange({ ...settings, theme })}
                className={`min-h-11 rounded-xl border px-3 py-2 font-semibold capitalize ${
                  settings.theme === theme
                    ? 'border-[var(--mv-accent)] bg-[var(--mv-accent-soft)] text-[var(--mv-accent)]'
                    : 'border-[var(--mv-border)] hover:bg-[var(--mv-surface-alt)]'
                }`}
              >
                {theme} Theme
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--mv-border)] p-3">
          <div>
            <span className="block font-semibold">High-Contrast Mode</span>
            <span className="text-xs text-[var(--mv-text-muted)]">
              Increases border and text contrast across all screens.
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(e) => onChange({ ...settings, highContrast: e.target.checked })}
            className="h-5 w-5 accent-[var(--mv-accent)]"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border-[2px] border-[var(--mv-border)] bg-[var(--mv-bg)] p-3">
          <div>
            <span className="block font-bold">Automatic Spoken Responses</span>
            <span className="text-xs text-[var(--mv-text-muted)]">
              Disable if you prefer your own screen reader (e.g., NVDA) to read updates.
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.autoSpeakResponses ?? true}
            onChange={(e) => onChange({ ...settings, autoSpeakResponses: e.target.checked })}
            className="h-5 w-5 accent-[var(--mv-border)]"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border-[2px] border-[var(--mv-border)] bg-[var(--mv-bg)] p-3">
          <div>
            <span className="block font-bold">Focus Mode (Distraction-Free Captions)</span>
            <span className="text-xs text-[var(--mv-text-muted)]">
              Hides 3D visuals and sidebars during live classes so captions dominate.
            </span>
          </div>
          <input
            type="checkbox"
            checked={Boolean(settings.focusMode)}
            onChange={(e) => onChange({ ...settings, focusMode: e.target.checked })}
            className="h-5 w-5 accent-[var(--mv-border)]"
          />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border-[2px] border-[var(--mv-border)] bg-[var(--mv-bg)] p-3">
          <div>
            <span className="block font-bold">Reduced Motion</span>
            <span className="text-xs text-[var(--mv-text-muted)]">
              Minimizes transitions and animated status indicators.
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(e) => onChange({ ...settings, reducedMotion: e.target.checked })}
            className="h-5 w-5 accent-[var(--mv-accent)]"
          />
        </label>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="conf-threshold-range" className="font-semibold">
              Uncertainty Flag Threshold
            </label>
            <span className="font-mono text-xs font-semibold">
              {settings.confidenceThreshold.toFixed(2)}
            </span>
          </div>
          <input
            id="conf-threshold-range"
            type="range"
            min="0.3"
            max="0.9"
            step="0.05"
            value={settings.confidenceThreshold}
            onChange={(e) =>
              onChange({ ...settings, confidenceThreshold: Number.parseFloat(e.target.value) })
            }
            className="mt-2 w-full accent-[var(--mv-accent)]"
          />
          <p className="mt-1 text-xs text-[var(--mv-text-muted)]">
            Initial heuristic threshold (default 0.60) for flagging low-confidence words when
            provided by speech recognition.
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-xl bg-[var(--mv-accent)] px-5 py-2 font-semibold text-[var(--mv-accent-text)] hover:bg-[var(--mv-accent-hover)]"
        >
          Done
        </button>
      </div>
    </dialog>
  );
}
