import type { RecordingState } from '../types';

interface VoiceSculptureProps {
  recordingState: RecordingState;
  micLevel: number;
  commandPulseKey: number;
  reducedMotion: boolean;
  compact?: boolean;
}

export function VoiceSculptureFallback({
  recordingState,
  micLevel,
  compact = false,
}: Pick<VoiceSculptureProps, 'recordingState' | 'micLevel' | 'compact'>) {
  const fill =
    recordingState === 'error'
      ? '#ff7a7a'
      : recordingState === 'reconnecting'
        ? '#ffd166'
        : recordingState === 'generating_notes'
          ? '#c5b8ff'
          : '#c5f36b';

  const scale = recordingState === 'listening' ? 1 + Math.min(0.18, micLevel * 0.25) : 1;

  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center rounded-2xl border-[2.5px] border-[var(--mv-border)] bg-[var(--mv-surface)] shadow-[4px_4px_0px_var(--mv-border)] ${
        compact ? 'h-24 w-24' : 'h-48 w-full sm:h-56'
      }`}
    >
      <svg
        viewBox="0 0 120 120"
        className={compact ? 'h-16 w-16' : 'h-36 w-36'}
        style={{ transform: `scale(${scale})` }}
        aria-hidden="true"
      >
        <rect x="18" y="22" width="52" height="52" rx="8" fill="#c5b8ff" stroke="#151515" strokeWidth="4" />
        <polygon points="62,16 104,42 92,92 44,84" fill={fill} stroke="#151515" strokeWidth="4" />
        <circle cx="42" cy="84" r="16" fill="#f8bae0" stroke="#151515" strokeWidth="4" />
      </svg>
    </div>
  );
}
