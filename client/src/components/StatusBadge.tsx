import { AlertTriangle, CheckCircle2, Info, Radio, WifiOff } from 'lucide-react';

export type BadgeTone = 'neutral' | 'live' | 'success' | 'warning' | 'danger' | 'demo';

interface StatusBadgeProps {
  tone: BadgeTone;
  label: string;
}

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  const toneStyles: Record<BadgeTone, string> = {
    neutral: 'border-[var(--mv-border)] bg-[var(--mv-surface-alt)] text-[var(--mv-text)]',
    live: 'border-[var(--mv-accent)] bg-[var(--mv-accent-soft)] text-[var(--mv-accent)]',
    success: 'border-[var(--mv-success)] bg-[var(--mv-success-bg)] text-[var(--mv-success)]',
    warning: 'border-[var(--mv-amber)] bg-[var(--mv-amber-bg)] text-[var(--mv-amber)]',
    danger: 'border-[var(--mv-danger)] bg-[var(--mv-danger-bg)] text-[var(--mv-danger)]',
    demo: 'border-[var(--mv-amber)] bg-[var(--mv-amber-bg)] text-[var(--mv-amber)]',
  };

  const Icon =
    tone === 'live'
      ? Radio
      : tone === 'success'
        ? CheckCircle2
        : tone === 'warning' || tone === 'demo'
          ? AlertTriangle
          : tone === 'danger'
            ? WifiOff
            : Info;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${toneStyles[tone]}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
