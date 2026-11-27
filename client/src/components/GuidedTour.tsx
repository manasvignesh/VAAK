import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Play, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import type { ScreenId } from '../types';

export interface TourStep {
  id: string;
  targetId: string;
  screen: ScreenId;
  requiresDemoSession?: boolean;
  title: string;
  description: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'start-live-class',
    targetId: 'start-live-class',
    screen: 'home',
    title: 'Welcome to VAAK — Start Live Class',
    description:
      'VAAK unites live captions, speech participation, and voice navigation in one classroom workspace. Use Start Live Class when you are ready to stream real microphone speech.',
  },
  {
    id: 'interactive-demo',
    targetId: 'try-demo',
    screen: 'home',
    title: 'Key-Free Interactive Demo',
    description:
      'Explore a complete Photosynthesis lecture with live captions, highlights, translation, and study notes anytime—no API keys or microphone required.',
  },
  {
    id: 'voice-companion',
    targetId: 'voice-companion-bar',
    screen: 'home',
    title: 'Voice Companion & Mic Controls',
    description:
      'Activate Voice Mode for hands-free navigation and grounded lecture Q&A, or type commands here. Microphone access is only requested when you turn it on.',
  },
  {
    id: 'live-captions',
    targetId: 'live-captions-panel',
    screen: 'classroom',
    requiresDemoSession: true,
    title: 'Live Captions & Confidence',
    description:
      'Follow real-time multilingual captions (shown here with Demo Content). Words with lower speech confidence are underlined so you can spot unclear audio immediately.',
  },
  {
    id: 'language-translation',
    targetId: 'translate-controls',
    screen: 'classroom',
    requiresDemoSession: true,
    title: 'Instant Language Translation',
    description:
      'Translate any explanation into Telugu or Hindi right beside the original English so you never lose technical terms.',
  },
  {
    id: 'highlights-catchup',
    targetId: 'classroom-highlights-catchup',
    screen: 'classroom',
    requiresDemoSession: true,
    title: 'Highlights, Bookmarks & Catch Me Up',
    description:
      'Mark exam-critical moments, bookmark topics, or tap Catch Me Up for a concise summary of what was just explained.',
  },
  {
    id: 'focus-mode',
    targetId: 'focus-mode-btn',
    screen: 'classroom',
    requiresDemoSession: true,
    title: 'Focus Mode',
    description:
      'Hide side panels and enlarge captions for distraction-free reading during fast-paced lectures.',
  },
  {
    id: 'student-participation',
    targetId: 'participation-pad',
    screen: 'participation',
    title: 'Student Participation & Text-to-Speech',
    description:
      'Non-speaking students tap quick classroom phrases or type questions to speak aloud clearly—while safely pausing the room microphone.',
  },
  {
    id: 'smart-notes',
    targetId: 'smart-notes-panel',
    screen: 'notes',
    requiresDemoSession: true,
    title: 'Smart Notes & Source References',
    description:
      'Review structured summaries and definitions. Every timestamp chip links straight back to the exact moment the teacher explained it.',
  },
  {
    id: 'my-classes',
    targetId: 'my-classes-panel',
    screen: 'classes',
    title: 'My Classes',
    description:
      'Search saved lectures, revisit transcripts and notes, or export Markdown and JSON offline.',
  },
  {
    id: 'accessibility-finish',
    targetId: 'accessibility-btn',
    screen: 'home',
    title: 'Accessibility & Preferences',
    description:
      'Adjust caption sizes, high contrast, reduced motion, and Focus Mode anytime—without ever disclosing a disability.',
  },
];

interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface GuidedTourProps {
  open: boolean;
  stepIndex: number;
  reducedMotion: boolean;
  speakTourEnabled: boolean;
  onToggleSpeakTour: () => void;
  onStepChange: (nextIndex: number) => void;
  onSkip: () => void;
  onComplete: (launchDemo: boolean) => void;
}

export function GuidedTour({
  open,
  stepIndex,
  reducedMotion,
  speakTourEnabled,
  onToggleSpeakTour,
  onStepChange,
  onSkip,
  onComplete,
}: GuidedTourProps) {
  const step = TOUR_STEPS[stepIndex] ?? TOUR_STEPS[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
    placement: 'bottom' | 'top' | 'center';
    arrowLeft: number;
  }>({ top: 96, left: 16, placement: 'bottom', arrowLeft: 48 });

  const measureTarget = useCallback(() => {
    if (!open) return;
    const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.targetId}"]`);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setTargetRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
  }, [open, step.targetId]);

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const timer = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.targetId}"]`);
      if (el) {
        el.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
      raf = window.requestAnimationFrame(() => {
        measureTarget();
        window.setTimeout(measureTarget, reducedMotion ? 20 : 280);
        window.setTimeout(measureTarget, 480);
      });
    }, 80);

    const handleReposition = () => measureTarget();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, step.targetId, step.screen, reducedMotion, measureTarget]);

  useLayoutEffect(() => {
    if (!open) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tooltipW = Math.min(390, vw - 24);
    const tooltipH = tooltipRef.current?.offsetHeight ?? 230;
    const gap = 16;

    if (!targetRect) {
      setTooltipPos({
        top: Math.max(16, (vh - tooltipH) / 2),
        left: Math.max(12, (vw - tooltipW) / 2),
        placement: 'center',
        arrowLeft: tooltipW / 2,
      });
      return;
    }

    const pad = 8;
    const spaceBelow = vh - (targetRect.top + targetRect.height + pad);
    const spaceAbove = targetRect.top - pad;

    let placement: 'bottom' | 'top' | 'center' = 'bottom';
    let top = targetRect.top + targetRect.height + pad + gap;

    if (spaceBelow >= tooltipH + gap) {
      placement = 'bottom';
      top = targetRect.top + targetRect.height + pad + gap;
    } else if (spaceAbove >= tooltipH + gap) {
      placement = 'top';
      top = targetRect.top - pad - gap - tooltipH;
    } else {
      placement = 'center';
      top = Math.max(12, Math.min(vh - tooltipH - 12, vh - tooltipH - 16));
    }

    const targetCenterX = targetRect.left + targetRect.width / 2;
    const left = Math.max(12, Math.min(vw - tooltipW - 12, targetCenterX - tooltipW / 2));
    const arrowLeft = Math.max(24, Math.min(tooltipW - 24, targetCenterX - left));

    setTooltipPos({ top, left, placement, arrowLeft });
  }, [open, targetRect, stepIndex]);

  useEffect(() => {
    if (!open) return;
    tooltipRef.current?.focus();
  }, [open, stepIndex]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isLast) onComplete(false);
        else onStepChange(stepIndex + 1);
      } else if (e.key === 'ArrowLeft' && !isFirst) {
        e.preventDefault();
        onStepChange(stepIndex - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isFirst, isLast, stepIndex, onSkip, onComplete, onStepChange]);

  if (!open) return null;

  const pad = 8;
  const spotX = targetRect ? Math.max(4, targetRect.left - pad) : 0;
  const spotY = targetRect ? Math.max(4, targetRect.top - pad) : 0;
  const spotW = targetRect ? targetRect.width + pad * 2 : 0;
  const spotH = targetRect ? targetRect.height + pad * 2 : 0;
  const transitionCls = reducedMotion ? '' : 'transition-all duration-300 ease-out';
  const progressPct = Math.round(((stepIndex + 1) / TOUR_STEPS.length) * 100);

  return (
    <div className="fixed inset-0 z-50" aria-live="polite">
      {/* Dimmed spotlight backdrop */}
      <svg
        className="pointer-events-auto fixed inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <mask id="vaak-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={spotX}
                y={spotY}
                width={spotW}
                height={spotH}
                rx="14"
                fill="black"
                className={transitionCls}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(21, 21, 21, 0.72)"
          mask="url(#vaak-tour-mask)"
        />
      </svg>

      {/* Spotlight highlight ring */}
      {targetRect && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed rounded-2xl border-[3px] border-[var(--mv-lime)] shadow-[0_0_0_3px_#151515] ${transitionCls}`}
          style={{
            top: spotY,
            left: spotX,
            width: spotW,
            height: spotH,
          }}
        />
      )}

      {/* Neo-brutalist tooltip with directional arrow */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="vaak-tour-title"
        aria-describedby="vaak-tour-desc"
        tabIndex={-1}
        className={`fixed z-50 w-[min(390px,calc(100vw-24px))] rounded-2xl border-[3px] border-[var(--mv-border)] bg-[var(--mv-surface)] p-4 text-[var(--mv-text)] shadow-[6px_6px_0_#151515] outline-none ${transitionCls}`}
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
        }}
      >
        {tooltipPos.placement === 'bottom' && (
          <div
            aria-hidden="true"
            className="absolute -top-2.5 h-4 w-4 rotate-45 border-l-[3px] border-t-[3px] border-[var(--mv-border)] bg-[var(--mv-surface)]"
            style={{ left: tooltipPos.arrowLeft - 8 }}
          />
        )}
        {tooltipPos.placement === 'top' && (
          <div
            aria-hidden="true"
            className="absolute -bottom-2.5 h-4 w-4 rotate-45 border-b-[3px] border-r-[3px] border-[var(--mv-border)] bg-[var(--mv-surface)]"
            style={{ left: tooltipPos.arrowLeft - 8 }}
          />
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="nb-pill inline-flex items-center gap-1.5 bg-[var(--mv-lime)] px-2.5 py-0.5 font-mono text-xs font-bold text-[#151515]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Step {stepIndex + 1} of {TOUR_STEPS.length}
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleSpeakTour}
              aria-pressed={speakTourEnabled}
              title="Toggle spoken tour explanations"
              className="nb-btn inline-flex min-h-8 items-center gap-1 bg-[var(--mv-surface-alt)] px-2 py-1 text-xs font-bold"
            >
              {speakTourEnabled ? (
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{speakTourEnabled ? 'Voice On' : 'Voice Off'}</span>
            </button>
            <button
              type="button"
              onClick={onSkip}
              aria-label="Close guided tour"
              className="nb-btn inline-flex min-h-8 items-center justify-center bg-[var(--mv-surface)] p-1.5"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="mt-2.5 h-2 w-full overflow-hidden rounded-full border-2 border-[var(--mv-border)] bg-[var(--mv-surface-alt)]"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOUR_STEPS.length}
          aria-valuenow={stepIndex + 1}
        >
          <div
            className={`h-full bg-[var(--mv-lavender)] ${transitionCls}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <h2 id="vaak-tour-title" className="mt-3 text-lg font-bold leading-snug">
          {step.title}
        </h2>
        <p id="vaak-tour-desc" className="mt-1.5 text-sm font-medium text-[var(--mv-text-muted)]">
          {step.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-bold underline underline-offset-2 hover:opacity-80"
          >
            Skip Tour
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => onStepChange(stepIndex - 1)}
                className="nb-btn inline-flex min-h-9 items-center gap-1 bg-[var(--mv-surface)] px-3 py-1.5 text-xs font-bold"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Back</span>
              </button>
            )}

            {isLast ? (
              <>
                <button
                  type="button"
                  onClick={() => onComplete(true)}
                  className="nb-btn inline-flex min-h-9 items-center gap-1 bg-[var(--mv-lavender)] px-3 py-1.5 text-xs font-bold text-[#151515]"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Try Interactive Demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => onComplete(false)}
                  className="nb-btn inline-flex min-h-9 items-center gap-1 bg-[var(--mv-lime)] px-3.5 py-1.5 text-xs font-bold text-[#151515]"
                >
                  <span>Finish</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onStepChange(stepIndex + 1)}
                className="nb-btn inline-flex min-h-9 items-center gap-1 bg-[var(--mv-lime)] px-3.5 py-1.5 text-xs font-bold text-[#151515]"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
