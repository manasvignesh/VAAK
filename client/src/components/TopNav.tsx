import { Accessibility, BookOpen, FolderOpen, Home, MessageSquare, Radio } from 'lucide-react';
import type { ScreenId } from '../types';
import { VaakMark } from './VaakMark';

interface TopNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onOpenAccessibility: () => void;
  isLiveOrDemoActive: boolean;
  isDemoMode: boolean;
}

export function TopNav({
  currentScreen,
  onNavigate,
  onOpenAccessibility,
  isLiveOrDemoActive,
  isDemoMode,
}: TopNavProps) {
  const navItems: Array<{ id: ScreenId; label: string; icon: typeof Home }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'classroom', label: 'Live Classroom', icon: Radio },
    { id: 'participation', label: 'Participate', icon: MessageSquare },
    { id: 'notes', label: 'Smart Notes', icon: BookOpen },
    { id: 'classes', label: 'My Classes', icon: FolderOpen },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--mv-border)] bg-[var(--mv-surface)] shadow-[var(--mv-shadow-sm)]">
      <a
        href="#main-content"
        className="visually-hidden rounded-lg bg-[var(--mv-accent)] px-4 py-2 font-semibold text-[var(--mv-accent-text)] focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 rounded-xl px-1 py-1 text-left"
          >
            <VaakMark className="h-9 w-9 shrink-0" />
            <span>
              <span className="block text-base font-bold tracking-tight leading-tight">VAAK</span>
              <span className="block text-xs text-[var(--mv-text-muted)]">
                Communication Without Barriers
              </span>
            </span>
          </button>

          {isLiveOrDemoActive && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mv-border)] bg-[var(--mv-surface-alt)] px-2.5 py-1 text-xs font-semibold">
              <span
                className={`h-2 w-2 rounded-full ${
                  isDemoMode ? 'bg-[var(--mv-amber)]' : 'bg-[var(--mv-danger)]'
                }`}
                aria-hidden="true"
              />
              {isDemoMode ? 'Demo Active' : 'Live Session'}
            </span>
          )}
        </div>

        <nav aria-label="Primary" className="flex flex-wrap items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-[var(--mv-accent)] text-[var(--mv-accent-text)]'
                    : 'text-[var(--mv-text)] hover:bg-[var(--mv-surface-alt)]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenAccessibility}
            aria-label="Open accessibility settings"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--mv-border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--mv-surface-alt)]"
          >
            <Accessibility className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Accessibility</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
