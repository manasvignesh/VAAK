import { Accessibility, BookOpen, Compass, FolderOpen, Home, MessageSquare, Radio } from 'lucide-react';
import type { ScreenId } from '../types';
import { VaakMark } from './VaakMark';

interface TopNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onOpenAccessibility: () => void;
  onStartTour?: () => void;
  isLiveOrDemoActive: boolean;
  isDemoMode: boolean;
}

export function TopNav({
  currentScreen,
  onNavigate,
  onOpenAccessibility,
  onStartTour,
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
    <header className="sticky top-0 z-30 border-b-[3px] border-[var(--mv-border)] bg-[var(--mv-surface)]">
      <a
        href="#main-content"
        className="nb-btn visually-hidden bg-[var(--mv-lime)] px-4 py-2 font-bold text-[#151515] focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50"
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
            <VaakMark className="h-10 w-10 shrink-0" />
            <span>
              <span className="block text-lg font-bold tracking-tight leading-none">VAAK</span>
              <span className="block text-xs font-semibold text-[var(--mv-text-muted)]">
                Communication Without Barriers
              </span>
            </span>
          </button>

          {isLiveOrDemoActive && (
            <span
              className={`nb-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-[#151515] ${
                isDemoMode ? 'bg-[var(--mv-lavender)]' : 'bg-[var(--mv-lime)]'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#151515]" aria-hidden="true" />
              {isDemoMode ? 'DEMO ACTIVE' : 'LIVE'}
            </span>
          )}
        </div>

        <nav aria-label="Primary" className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                className={`nb-btn inline-flex min-h-10 items-center gap-2 px-3.5 py-2 text-sm font-bold ${
                  active
                    ? 'bg-[var(--mv-lime)] text-[#151515]'
                    : 'bg-[var(--mv-surface)] text-[var(--mv-text)] hover:bg-[var(--mv-surface-alt)]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {onStartTour && (
            <button
              type="button"
              data-tour-id="take-tour-btn"
              onClick={onStartTour}
              aria-label="Take a guided product tour"
              className="nb-btn inline-flex min-h-10 items-center gap-2 bg-[var(--mv-lavender)] px-3.5 py-2 text-sm font-bold text-[#151515]"
            >
              <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Take a Tour</span>
            </button>
          )}

          <button
            type="button"
            data-tour-id="accessibility-btn"
            onClick={onOpenAccessibility}
            aria-label="Open accessibility settings"
            className="nb-btn inline-flex min-h-10 items-center gap-2 bg-[var(--mv-pink)] px-3.5 py-2 text-sm font-bold text-[#151515]"
          >
            <Accessibility className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Accessibility</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
