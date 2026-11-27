import { AlertTriangle, CheckCircle2, Info, Radio, WifiOff } from 'lucide-react';

export type BadgeTone = 'neutral' | 'live' | 'success' | 'warning' | 'danger' | 'demo';

interface StatusBadgeProps {
  tone: BadgeTone;
  label: string;
}

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  const toneStyles: Record<BadgeTone, string> = {
    neutral: 'bg-[var(--mv-surface)] text-[var(--mv-text)]',
    live: 'bg-[var(--mv-lime)] text-[#151515]',
    success: 'bg-[var(--mv-lime)] text-[#151515]',
    warning: 'bg-[var(--mv-amber)] text-[#151515]',
    danger: 'bg-[var(--mv-danger)] text-[#151515]',
    demo: 'bg-[var(--mv-lavender)] text-[#151515]',
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
      className={`nb-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold tracking-wide ${toneStyles[tone]}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
