import { lazy, Suspense } from 'react';
import type { RecordingState } from '../types';
import { VoiceSculptureFallback } from './VoiceSculptureFallback';

const LazySculpture3D = lazy(() => import('./VoiceSculpture3D'));

interface VoiceSculptureProps {
  recordingState: RecordingState;
  micLevel: number;
  commandPulseKey: number;
  reducedMotion: boolean;
  focusMode?: boolean;
  compact?: boolean;
}

export function VoiceSculpture({
  recordingState,
  micLevel,
  commandPulseKey,
  reducedMotion,
  focusMode = false,
  compact = false,
}: VoiceSculptureProps) {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion || prefersReduced || focusMode) {
    return (
      <VoiceSculptureFallback
        recordingState={recordingState}
        micLevel={micLevel}
        compact={compact}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <VoiceSculptureFallback
          recordingState={recordingState}
          micLevel={micLevel}
          compact={compact}
        />
      }
    >
      <LazySculpture3D
        recordingState={recordingState}
        micLevel={micLevel}
        commandPulseKey={commandPulseKey}
        compact={compact}
      />
    </Suspense>
  );
}
