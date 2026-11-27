import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            destructive
              ? 'bg-[var(--mv-danger-bg)] text-[var(--mv-danger)]'
              : 'bg-[var(--mv-amber-bg)] text-[var(--mv-amber)]'
          }`}
        >
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 id="confirm-dialog-title" className="text-lg font-bold">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--mv-text-muted)]">{message}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-[var(--mv-border)] px-4 py-2 font-semibold hover:bg-[var(--mv-surface-alt)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`min-h-11 rounded-xl px-5 py-2 font-semibold text-white ${
            destructive
              ? 'bg-[var(--mv-danger)] hover:opacity-90'
              : 'bg-[var(--mv-accent)] text-[var(--mv-accent-text)] hover:bg-[var(--mv-accent-hover)]'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
