import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AccessibilitySettings,
  AppCapabilities,
  ClassroomSession,
  RecordingState,
  ScreenId,
  StudyNotes,
  SupportedLanguage,
  TranscriptSegment,
  TranslationLanguage,
  VoiceTurnState,
} from './types';
import {
  fetchCapabilities,
  requestLectureAnswer,
  requestStudyNotes,
  requestTranslation,
} from './services/apiClient';
import { AudioCaptureService } from './services/audioCapture';
import { SpeechSocketClient } from './services/speechSocket';
import { isStandaloneWakeWord, parseVoiceCommand } from './services/voiceCommands';
import { TtsService, type TtsStatus } from './services/ttsService';
import { SpokenResponseService } from './services/spokenResponseService';
import { routeGlobalVoiceCommand } from './services/globalVoiceRouter';
import { buildReadableSections } from './services/notesReader';
import {
  clearAllSessions,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  deleteSession,
  getAllSessions,
  loadSettings,
  saveSession,
  saveSettings,
} from './services/storage';
import {
  buildDemoStudyNotes,
  DEMO_PHOTOSYNTHESIS_STEPS,
  getDemoTranslation,
} from './services/demoEngine';
import { buildLocalBasicNotes } from './services/localNotesFallback';
import { buildDeterministicCatchMeUp, type CatchMeUpResult } from './services/catchMeUp';
import { TopNav } from './components/TopNav';
import { LiveRegion } from './components/LiveRegion';
import { ConsentModal } from './components/ConsentModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AccessibilityDrawer } from './components/AccessibilityDrawer';
import { VoiceCompanionBar, type CompanionTurn } from './components/VoiceCompanionBar';
import { OnboardingDialog } from './components/OnboardingDialog';
import { HomeScreen } from './screens/HomeScreen';
import { LiveClassroomScreen } from './screens/LiveClassroomScreen';
import { StudentParticipationScreen } from './screens/StudentParticipationScreen';
import { SmartNotesScreen } from './screens/SmartNotesScreen';
import { MyClassesScreen } from './screens/MyClassesScreen';

const SCREEN_TITLES: Record<ScreenId, string> = {
  home: 'Home | VAAK — Communication Without Barriers',
  classroom: 'Live Classroom | VAAK',
  participation: 'Student Participation | VAAK',
  notes: 'Smart Study Notes | VAAK',
  classes: 'My Classes | VAAK',
};

export function App() {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [capabilities, setCapabilities] = useState<AppCapabilities | null>(null);
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY_SETTINGS);
  const [savedSessions, setSavedSessions] = useState<ClassroomSession[]>([]);
  const [activeSession, setActiveSession] = useState<ClassroomSession | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('multi');

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [interimText, setInterimText] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [commandPulseKey, setCommandPulseKey] = useState(0);
  const [catchMeUp, setCatchMeUp] = useState<CatchMeUpResult | null>(null);
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [commandFeedback, setCommandFeedback] = useState<{
    tone: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const [politeAnnouncement, setPoliteAnnouncement] = useState('');
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState('');

  const [consentOpen, setConsentOpen] = useState(false);
  const [a11yOpen, setA11yOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    destructive: boolean;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    destructive: false,
    onConfirm: () => {},
  });

  const [notesError, setNotesError] = useState<string | null>(null);
  const [ttsStatus, setTtsStatus] = useState<TtsStatus>('idle');
  const [ttsDetail, setTtsDetail] = useState('');

  // Phase 7: Voice Companion & Reading Cursor state
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [turnState, setTurnState] = useState<VoiceTurnState>('idle');
  const [companionResponse, setCompanionResponse] = useState('');
  const [companionSource, setCompanionSource] = useState<string | undefined>(undefined);
  const [companionHistory, setCompanionHistory] = useState<CompanionTurn[]>([]);
  const [previousQaAnswer, setPreviousQaAnswer] = useState<string | undefined>(undefined);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [noteCursorIndex, setNoteCursorIndex] = useState(0);
  const [screenHistory, setScreenHistory] = useState<ScreenId[]>([]);

  // Demo mode state
  const [demoStepIdx, setDemoStepIdx] = useState(0);
  const [isDemoPaused, setIsDemoPaused] = useState(false);

  const audioCaptureRef = useRef(new AudioCaptureService());
  const speechSocketRef = useRef(new SpeechSocketClient());
  const ttsServiceRef = useRef(new TtsService());
  const spokenServiceRef = useRef(new SpokenResponseService());
  const qaAbortRef = useRef<AbortController | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const inactivityTimerRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const segmentCounterRef = useRef<number>(0);
  const activeSessionRef = useRef<ClassroomSession | null>(null);
  const interimTextRef = useRef<string>('');
  const pendingWakeUntilRef = useRef<number>(0);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    interimTextRef.current = interimText;
  }, [interimText]);

  // Apply theme, high contrast, and reduced motion
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false';
  }, [settings]);

  useEffect(() => {
    document.title = SCREEN_TITLES[screen];
  }, [screen]);

  // Load capabilities, settings, and saved sessions on mount
  useEffect(() => {
    fetchCapabilities()
      .then(setCapabilities)
      .catch(() => {
        setCapabilities({
          speechToTextConfigured: false,
          speechToTextProvider: 'Deepgram Nova-3 Multilingual',
          aiNotesAndTranslationConfigured: false,
          aiProvider: 'Google Gemini',
          demoModeAvailable: true,
          supportedLanguages: [
            { code: 'multi', label: 'Multilingual (English + Hindi + Telugu)' },
            { code: 'en-IN', label: 'Indian English (en-IN)' },
            { code: 'hi', label: 'Hindi (हिन्दी)' },
            { code: 'te', label: 'Telugu (తెలుగు)' },
          ],
        });
      });

    loadSettings().then((loaded) => {
      setSettings(loaded);
      if (!loaded.onboardingCompleted) {
        setOnboardingOpen(true);
      }
    });
    getAllSessions().then(setSavedSessions);
  }, []);

  const persistSession = useCallback(async (session: ClassroomSession) => {
    try {
      await saveSession(session);
      const all = await getAllSessions();
      setSavedSessions(all);
    } catch {
      // ignore storage quota errors silently
    }
  }, []);

  const updateSettings = useCallback((next: AccessibilitySettings) => {
    setSettings(next);
    void saveSettings(next);
  }, []);

  const nextSegmentId = () => {
    segmentCounterRef.current += 1;
    return `seg-${String(segmentCounterRef.current).padStart(3, '0')}`;
  };

  const stopLiveAudioAndSocket = useCallback(() => {
    audioCaptureRef.current.stop();
    speechSocketRef.current.stop();
    setMicLevel(0);
    setInterimText('');
  }, []);

  const handleTranslateSegment = useCallback(
    async (segmentId: string, targetLanguage: TranslationLanguage) => {
      const current = activeSessionRef.current;
      if (!current) return;
      const seg = current.segments.find((s) => s.id === segmentId);
      if (!seg) return;

      const textToTranslate = (seg.correctedText ?? seg.originalText).trim();
      try {
        let translatedText: string;
        let isDemo = false;

        if (current.isDemo) {
          translatedText = getDemoTranslation(textToTranslate, targetLanguage);
          isDemo = true;
        } else {
          const res = await requestTranslation(textToTranslate, targetLanguage);
          translatedText = res.translatedText;
          isDemo = res.isDemo;
        }

        const updated: ClassroomSession = {
          ...current,
          segments: current.segments.map((s) =>
            s.id === segmentId
              ? {
                  ...s,
                  translations: {
                    ...s.translations,
                    [targetLanguage]: {
                      text: translatedText,
                      isDemo,
                      translatedAtIso: new Date().toISOString(),
                    },
                  },
                }
              : s
          ),
        };
        setActiveSession(updated);
        void persistSession(updated);
        setPoliteAnnouncement(`Translated caption to ${targetLanguage.toUpperCase()}.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Translation failed.';
        setCommandFeedback({ tone: 'warning', message: msg });
        setAssertiveAnnouncement(msg);
      }
    },
    [capabilities?.aiNotesAndTranslationConfigured, persistSession]
  );

  const finalizeAndGenerateNotes = useCallback(async () => {
    const currentBeforeStop = activeSessionRef.current;
    if (!currentBeforeStop) return;

    // Stop microphone first and give live provider a brief window to flush final transcript
    audioCaptureRef.current.stop();
    setMicLevel(0);
    if (!currentBeforeStop.isDemo) {
      await new Promise((r) => setTimeout(r, 500));
    }

    const pendingInterim = interimTextRef.current.trim();
    speechSocketRef.current.stop();
    setInterimText('');

    const current = activeSessionRef.current ?? currentBeforeStop;
    let segmentsToFinalize = current.segments;
    if (pendingInterim) {
      const pendingSeg: TranscriptSegment = {
        id: nextSegmentId(),
        sessionId: current.id,
        timestampMs: Date.now() - sessionStartTimeRef.current,
        createdAtIso: new Date().toISOString(),
        originalText: `[Unverified interim speech] ${pendingInterim}`,
        isFinal: true,
        words: [],
        hasConfidenceData: false,
        isUnclearAudio: true,
      };
      segmentsToFinalize = [...segmentsToFinalize, pendingSeg];
    }

    setRecordingState('generating_notes');
    setStatusMessage('Generating evidence-linked study notes...');
    setNotesError(null);
    setScreen('notes');

    const finalizedSession: ClassroomSession = {
      ...current,
      segments: segmentsToFinalize,
      endedAtIso: new Date().toISOString(),
      durationMs: Math.max(1000, Date.now() - sessionStartTimeRef.current),
    };

    try {
      let notes: StudyNotes;
      if (finalizedSession.isDemo) {
        notes = buildDemoStudyNotes(finalizedSession.id, finalizedSession.segments);
      } else {
        notes = await requestStudyNotes(
          finalizedSession.id,
          finalizedSession.title,
          finalizedSession.segments
        );
      }

      const withNotes: ClassroomSession = { ...finalizedSession, notes };
      setActiveSession(withNotes);
      await persistSession(withNotes);
      setRecordingState('completed');
      setStatusMessage('Study notes ready');
      setPoliteAnnouncement('Study notes generated and saved.');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to generate AI study notes. Local basic notes were generated from your transcript.';
      const localNotes = buildLocalBasicNotes(
        finalizedSession.id,
        finalizedSession.title,
        finalizedSession.segments
      );
      const withLocalNotes: ClassroomSession = { ...finalizedSession, notes: localNotes };
      setActiveSession(withLocalNotes);
      await persistSession(withLocalNotes);
      setRecordingState('completed');
      setStatusMessage('Basic local study notes ready');
      setNotesError(msg);
      setAssertiveAnnouncement(msg);
    }
  }, [capabilities?.aiNotesAndTranslationConfigured, interimText, persistSession, stopLiveAudioAndSocket]);

  const applyVoiceCommandOrAppend = useCallback(
    (
      text: string,
      words: TranscriptSegment['words'],
      hasConfidenceData: boolean,
      languageDetected?: string,
      isUnclearAudio?: boolean
    ) => {
      const current = activeSessionRef.current;
      if (!current) return;

      if (settings.commandListeningEnabled && isStandaloneWakeWord(text)) {
        pendingWakeUntilRef.current = Date.now() + 6000;
        setCommandFeedback({
          tone: 'info',
          message: 'Wake word "VAAK" heard — listening for command...',
        });
        return;
      }

      let candidateText = text;
      if (settings.commandListeningEnabled && Date.now() <= pendingWakeUntilRef.current) {
        pendingWakeUntilRef.current = 0;
        candidateText = `VAAK, ${text}`;
      }

      const parsed = parseVoiceCommand(candidateText, settings.commandListeningEnabled);

      if (parsed.recognized && parsed.action) {
        setCommandPulseKey((k) => k + 1);
        const cmdSeg: TranscriptSegment = {
          id: nextSegmentId(),
          sessionId: current.id,
          timestampMs: Date.now() - sessionStartTimeRef.current,
          createdAtIso: new Date().toISOString(),
          originalText: text,
          isFinal: true,
          words: [],
          hasConfidenceData: false,
          isVoiceCommand: true,
        };

        const action = parsed.action;
        const educational = current.segments.filter(
          (s) => s.isFinal && !s.isVoiceCommand && !s.isGapMarker && !s.isUnclearAudio
        );
        const lastEdu = educational[educational.length - 1];

        if (action.type === 'start_class') {
          const nextTitle = action.topic ? `Class: ${action.topic}` : current.title;
          const updated = { ...current, title: nextTitle, segments: [...current.segments, cmdSeg] };
          setActiveSession(updated);
          void persistSession(updated);
          setCommandFeedback({ tone: 'success', message: `Started class: "${nextTitle}"` });
        } else if (action.type === 'mark_important') {
          if (!lastEdu) {
            setCommandFeedback({ tone: 'warning', message: 'No previous explanation to highlight.' });
            return;
          }
          const updated: ClassroomSession = {
            ...current,
            segments: [
              ...current.segments.map((s) =>
                s.id === lastEdu.id ? { ...s, highlightType: 'important' as const } : s
              ),
              cmdSeg,
            ],
          };
          setActiveSession(updated);
          void persistSession(updated);
          setCommandFeedback({ tone: 'success', message: `Marked #${lastEdu.id} as important.` });
        } else if (action.type === 'bookmark_topic') {
          if (!lastEdu) {
            setCommandFeedback({ tone: 'warning', message: 'No previous explanation to bookmark.' });
            return;
          }
          const label = action.label || 'Bookmarked Topic';
          const updated: ClassroomSession = {
            ...current,
            segments: [
              ...current.segments.map((s) =>
                s.id === lastEdu.id ? { ...s, isBookmarked: true, bookmarkLabel: label } : s
              ),
              cmdSeg,
            ],
          };
          setActiveSession(updated);
          void persistSession(updated);
          setCommandFeedback({ tone: 'success', message: `Bookmarked #${lastEdu.id} (${label}).` });
        } else if (action.type === 'translate_last') {
          const updated = { ...current, segments: [...current.segments, cmdSeg] };
          setActiveSession(updated);
          if (lastEdu) {
            setCommandFeedback({
              tone: 'info',
              message: `Translating #${lastEdu.id} into ${action.targetLanguage.toUpperCase()}...`,
            });
            void handleTranslateSegment(lastEdu.id, action.targetLanguage);
          } else {
            setCommandFeedback({ tone: 'warning', message: 'No previous explanation to translate.' });
          }
        } else if (action.type === 'summarize_so_far') {
          const updated = { ...current, segments: [...current.segments, cmdSeg] };
          setActiveSession(updated);
          setCatchMeUp(buildDeterministicCatchMeUp(updated.segments, updated.isDemo));
          setCommandFeedback({
            tone: 'info',
            message: 'Catch Me Up summary generated from recent classroom explanations.',
          });
        } else if (action.type === 'end_class_and_notes') {
          const updated = { ...current, segments: [...current.segments, cmdSeg] };
          setActiveSession(updated);
          setConfirmState({
            open: true,
            title: 'End Class & Prepare Study Notes?',
            message:
              'Voice command detected: "End the class and prepare study notes." Confirm to stop recording and generate evidence-linked notes.',
            confirmLabel: 'End Class & Generate Notes',
            destructive: false,
            onConfirm: () => {
              setConfirmState((prev) => ({ ...prev, open: false }));
              void finalizeAndGenerateNotes();
            },
          });
        }
        return;
      }

      if (parsed.reason) {
        setCommandFeedback({ tone: 'warning', message: parsed.reason });
        return;
      }

      const seg: TranscriptSegment = {
        id: nextSegmentId(),
        sessionId: current.id,
        timestampMs: Date.now() - sessionStartTimeRef.current,
        createdAtIso: new Date().toISOString(),
        originalText: text,
        isFinal: true,
        words,
        hasConfidenceData,
        languageDetected,
        isUnclearAudio,
      };
      const updated: ClassroomSession = {
        ...current,
        segments: [...current.segments, seg],
      };
      setActiveSession(updated);
      void persistSession(updated);
    },
    [
      finalizeAndGenerateNotes,
      handleTranslateSegment,
      persistSession,
      settings.commandListeningEnabled,
    ]
  );

  const startLiveClass = async (sessionTitle: string) => {
    setConsentOpen(false);
    setCommandFeedback(null);
    setNotesError(null);
    sessionStartTimeRef.current = Date.now();
    segmentCounterRef.current = 0;

    const newSession: ClassroomSession = {
      id: `sess-${Date.now()}`,
      title: sessionTitle,
      language: selectedLanguage,
      createdAtIso: new Date().toISOString(),
      durationMs: 0,
      isDemo: false,
      segments: [],
    };
    setActiveSession(newSession);
    setScreen('classroom');
    setRecordingState('requesting_permission');
    setStatusMessage('Requesting microphone permission...');

    try {
      await audioCaptureRef.current.start({
        onPcmChunk: (buf) => speechSocketRef.current.sendAudio(buf),
        onLevel: setMicLevel,
        onError: (msg) => {
          setRecordingState('error');
          setStatusMessage(msg);
        },
      });

      setRecordingState('connecting');
      setStatusMessage('Connecting to speech recognition...');

      speechSocketRef.current.connect(selectedLanguage, audioCaptureRef.current.getSampleRate(), {
        onMessage: (msg) => {
          if (msg.type === 'ready') {
            setRecordingState('listening');
            setStatusMessage(`Live captions active (${msg.provider})`);
            setPoliteAnnouncement('Live classroom captioning started.');
          } else if (msg.type === 'transcript') {
            if (!msg.isFinal) {
              setInterimText(msg.text);
            } else {
              setInterimText('');
              applyVoiceCommandOrAppend(
                msg.text,
                msg.words,
                msg.hasConfidenceData,
                msg.languageDetected,
                msg.isUnclearAudio
              );
            }
          } else if (msg.type === 'status') {
            if (msg.status === 'reconnecting') {
              setRecordingState('reconnecting');
              setStatusMessage(msg.message || 'Reconnecting...');
            } else if (msg.status === 'connected') {
              setRecordingState('listening');
              setStatusMessage(msg.message || 'Connected');
            }
          } else if (msg.type === 'error') {
            setRecordingState('error');
            setStatusMessage(msg.message);
            setAssertiveAnnouncement(msg.message);
            if (!msg.recoverable) {
              audioCaptureRef.current.stop();
            }
          }
        },
        onUnexpectedClose: () => {
          setRecordingState('reconnecting');
          setStatusMessage('Connection interrupted. Preserving finalized captions...');
          const cur = activeSessionRef.current;
          if (cur) {
            const gapSeg: TranscriptSegment = {
              id: nextSegmentId(),
              sessionId: cur.id,
              timestampMs: Date.now() - sessionStartTimeRef.current,
              createdAtIso: new Date().toISOString(),
              originalText: 'Connection interrupted — finalized captions preserved.',
              isFinal: true,
              words: [],
              hasConfidenceData: false,
              isGapMarker: true,
            };
            setActiveSession({ ...cur, segments: [...cur.segments, gapSeg] });
          }
        },
        onReconnected: () => {
          setRecordingState('listening');
          setStatusMessage('Reconnected to speech recognition.');
          const cur = activeSessionRef.current;
          if (cur) {
            const recSeg: TranscriptSegment = {
              id: nextSegmentId(),
              sessionId: cur.id,
              timestampMs: Date.now() - sessionStartTimeRef.current,
              createdAtIso: new Date().toISOString(),
              originalText: 'Connection restored.',
              isFinal: true,
              words: [],
              hasConfidenceData: false,
              isGapMarker: true,
            };
            setActiveSession({ ...cur, segments: [...cur.segments, recSeg] });
          }
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone setup failed.';
      setRecordingState('error');
      setStatusMessage(msg);
      setAssertiveAnnouncement(msg);
      audioCaptureRef.current.stop();
    }
  };

  const startDemoSession = () => {
    setConsentOpen(false);
    stopLiveAudioAndSocket();
    sessionStartTimeRef.current = Date.now();
    segmentCounterRef.current = 0;

    const demoSession: ClassroomSession = {
      id: `demo-${Date.now()}`,
      title: 'Photosynthesis (Interactive Demo)',
      language: 'multi',
      createdAtIso: new Date().toISOString(),
      durationMs: 0,
      isDemo: true,
      segments: [],
    };
    setActiveSession(demoSession);
    setDemoStepIdx(0);
    setIsDemoPaused(false);
    setCommandFeedback(null);
    setNotesError(null);
    setRecordingState('listening');
    setStatusMessage('Interactive Demo running (no API keys required)');
    setScreen('classroom');
    setPoliteAnnouncement('Interactive Photosynthesis demo started.');
  };

  const runDemoStep = useCallback(
    (idx: number) => {
      const step = DEMO_PHOTOSYNTHESIS_STEPS[idx];
      const current = activeSessionRef.current;
      if (!step || !current || !current.isDemo) return;

      if (step.kind === 'interim') {
        setInterimText(step.text ?? '');
      } else if (step.kind === 'final') {
        setInterimText('');
        const seg: TranscriptSegment = {
          id: nextSegmentId(),
          sessionId: current.id,
          timestampMs: Date.now() - sessionStartTimeRef.current,
          createdAtIso: new Date().toISOString(),
          originalText: step.text ?? '',
          isFinal: true,
          words: step.words ?? [],
          hasConfidenceData: Boolean(step.hasConfidenceData),
          isUnclearAudio: step.isUnclearAudio,
          languageDetected: step.languageDetected,
        };
        const updated = { ...current, segments: [...current.segments, seg] };
        setActiveSession(updated);
        void persistSession(updated);
      } else if (step.kind === 'command_highlight') {
        applyVoiceCommandOrAppend(step.text ?? '', [], false);
      } else if (step.kind === 'command_translate') {
        applyVoiceCommandOrAppend(step.text ?? '', [], false);
      } else if (step.kind === 'command_bookmark') {
        applyVoiceCommandOrAppend(step.text ?? '', [], false);
      } else if (step.kind === 'gap_drop') {
        setRecordingState('reconnecting');
        setStatusMessage('Simulated connection interruption — preserving captions...');
        const gapSeg: TranscriptSegment = {
          id: nextSegmentId(),
          sessionId: current.id,
          timestampMs: Date.now() - sessionStartTimeRef.current,
          createdAtIso: new Date().toISOString(),
          originalText: 'Simulated connection interruption — finalized captions preserved.',
          isFinal: true,
          words: [],
          hasConfidenceData: false,
          isGapMarker: true,
        };
        setActiveSession({ ...current, segments: [...current.segments, gapSeg] });
      } else if (step.kind === 'gap_recover') {
        setRecordingState('listening');
        setStatusMessage('Interactive Demo reconnected');
        const recSeg: TranscriptSegment = {
          id: nextSegmentId(),
          sessionId: current.id,
          timestampMs: Date.now() - sessionStartTimeRef.current,
          createdAtIso: new Date().toISOString(),
          originalText: 'Connection restored.',
          isFinal: true,
          words: [],
          hasConfidenceData: false,
          isGapMarker: true,
        };
        setActiveSession({ ...current, segments: [...current.segments, recSeg] });
      }
    },
    [applyVoiceCommandOrAppend, persistSession]
  );

  // Demo timer progression
  useEffect(() => {
    if (
      !activeSession?.isDemo ||
      isDemoPaused ||
      (recordingState !== 'listening' && recordingState !== 'reconnecting')
    ) {
      return;
    }
    if (demoStepIdx >= DEMO_PHOTOSYNTHESIS_STEPS.length) {
      setStatusMessage('Demo lecture complete — click "End Class & Prepare Notes" to view notes.');
      return;
    }
    const step = DEMO_PHOTOSYNTHESIS_STEPS[demoStepIdx];
    const timer = setTimeout(() => {
      runDemoStep(demoStepIdx);
      setDemoStepIdx((i) => i + 1);
    }, step.delayMs);
    return () => clearTimeout(timer);
  }, [activeSession?.isDemo, demoStepIdx, isDemoPaused, recordingState, runDemoStep]);

  const handleSpeakQuestion = (text: string, lang: 'en-IN' | 'hi-IN' | 'te-IN', rate: number) => {
    const wasListening = recordingState === 'listening';
    if (wasListening && !activeSession?.isDemo) {
      audioCaptureRef.current.setMuted(true);
      setRecordingState('paused_for_tts');
    }

    ttsServiceRef.current.speak({
      text,
      lang,
      rate,
      onStatusChange: (status, detail) => {
        setTtsStatus(status);
        setTtsDetail(detail ?? '');
        if (status === 'completed' || status === 'stopped' || status === 'error') {
          if (wasListening && !activeSession?.isDemo) {
            audioCaptureRef.current.setMuted(false);
            setRecordingState('listening');
          }
        }
      },
    });
  };

  const handleStopSpeaking = () => {
    ttsServiceRef.current.stop((status, detail) => {
      setTtsStatus(status);
      setTtsDetail(detail ?? '');
      if (recordingState === 'paused_for_tts') {
        audioCaptureRef.current.setMuted(false);
        setRecordingState('listening');
      }
    });
  };

  const handleJumpToSegment = useCallback((segmentId: string) => {
    setScreen('classroom');
    setTimeout(() => {
      const el = document.getElementById(`segment-${segmentId}`);
      if (el) {
        el.scrollIntoView({ behavior: settings.reducedMotion ? 'auto' : 'smooth', block: 'center' });
      }
    }, 100);
  }, [settings.reducedMotion]);

  const navigateTo = useCallback((nextScreen: ScreenId, focusMain = false) => {
    setScreen((prev) => {
      if (prev !== nextScreen) {
        setScreenHistory((h) => [...h.slice(-8), prev]);
      }
      return nextScreen;
    });
    if (focusMain) {
      setTimeout(() => mainRef.current?.focus(), 60);
    }
  }, []);

  const speakCompanionReply = useCallback(
    (
      userText: string,
      replyText: string,
      options: { lang?: 'en-IN' | 'hi-IN' | 'te-IN'; sourceSummary?: string; forceSpeak?: boolean } = {}
    ) => {
      setCompanionResponse(replyText);
      setCompanionSource(options.sourceSummary);
      setCompanionHistory((prev) => [
        ...prev.slice(-19),
        {
          id: `turn-${Date.now()}`,
          userText,
          assistantText: replyText,
          sourceSummary: options.sourceSummary,
        },
      ]);

      const shouldSpeak =
        options.forceSpeak || (voiceModeEnabled && (settings.autoSpeakResponses ?? true));
      if (!shouldSpeak) {
        setPoliteAnnouncement(replyText);
        setTurnState(voiceModeEnabled ? 'listening' : 'idle');
        return;
      }

      const lang = options.lang ?? settings.preferredSpeechLang ?? 'en-IN';
      let spokenText = replyText;
      if (lang !== 'en-IN' && !spokenServiceRef.current.isVoiceAvailableForLanguage(lang)) {
        spokenText = `Note: a ${lang} voice is unavailable on this device. ${replyText}`;
      }

      audioCaptureRef.current.setMuted(true);
      spokenServiceRef.current.speak(spokenText, {
        lang,
        rate: settings.speechRate ?? 1.0,
        onStateChange: (st) => {
          if (st === 'speaking') {
            setTurnState('speaking');
          } else if (st === 'paused') {
            setTurnState('interrupted');
          } else {
            audioCaptureRef.current.setMuted(false);
            setTurnState(voiceModeEnabled ? 'listening' : 'idle');
          }
        },
      });
    },
    [settings.autoSpeakResponses, settings.preferredSpeechLang, settings.speechRate, voiceModeEnabled]
  );

  const stopCompanionMic = useCallback(() => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (recordingState === 'idle' || recordingState === 'completed') {
      stopLiveAudioAndSocket();
    }
    setVoiceModeEnabled(false);
    setTurnState('idle');
  }, [recordingState, stopLiveAudioAndSocket]);

  const handleGlobalCommand = useCallback(
    async (rawInput: string) => {
      if (voiceModeEnabled) {
        if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = window.setTimeout(() => {
          stopCompanionMic();
          setPoliteAnnouncement('Voice Mode paused after 5 minutes of inactivity.');
        }, 5 * 60_000);
      }

      const action = routeGlobalVoiceCommand(rawInput, {
        hasPreviousAnswer: Boolean(previousQaAnswer),
      });

      if (!action) {
        speakCompanionReply(
          rawInput,
          `I didn't recognize "${rawInput}". Say "What can I do?" to hear available actions on this screen.`
        );
        return;
      }

      if (action.type === 'stop_speaking' || action.type === 'cancel') {
        qaAbortRef.current?.abort();
        spokenServiceRef.current.stop();
        audioCaptureRef.current.setMuted(false);
        setTurnState('interrupted');
        setCompanionResponse(action.type === 'cancel' ? 'Cancelled.' : 'Stopped speaking.');
        return;
      }
      if (action.type === 'stop_listening') {
        spokenServiceRef.current.stop();
        stopCompanionMic();
        setCompanionResponse('Voice listening stopped.');
        setPoliteAnnouncement('Voice listening stopped.');
        return;
      }
      if (action.type === 'pause_speaking') {
        spokenServiceRef.current.pause();
        setTurnState('interrupted');
        return;
      }
      if (action.type === 'continue_speaking') {
        spokenServiceRef.current.resume();
        return;
      }
      if (action.type === 'repeat_that') {
        if (!spokenServiceRef.current.repeatLast()) {
          speakCompanionReply(rawInput, 'There is nothing to repeat yet.');
        }
        return;
      }
      if (action.type === 'speak_slowly') {
        const next = spokenServiceRef.current.setRate(spokenServiceRef.current.getRate() - 0.15);
        updateSettings({ ...settings, speechRate: next });
        speakCompanionReply(rawInput, `Speaking speed set to ${next}x.`);
        return;
      }
      if (action.type === 'speak_faster') {
        const next = spokenServiceRef.current.setRate(spokenServiceRef.current.getRate() + 0.15);
        updateSettings({ ...settings, speechRate: next });
        speakCompanionReply(rawInput, `Speaking speed set to ${next}x.`);
        return;
      }

      if (action.type === 'go_home') {
        navigateTo('home', true);
        speakCompanionReply(rawInput, 'Home screen open. You can start a live class, try the demo, or open your saved classes.');
        return;
      }
      if (action.type === 'go_back') {
        const prev = screenHistory[screenHistory.length - 1] ?? 'home';
        setScreenHistory((h) => h.slice(0, -1));
        navigateTo(prev, true);
        speakCompanionReply(rawInput, `Returned to ${prev}.`);
        return;
      }
      if (action.type === 'where_am_i') {
        const activeName = activeSession ? ` Active class: ${activeSession.title}.` : '';
        speakCompanionReply(rawInput, `You are on the ${screen} screen.${activeName}`);
        return;
      }
      if (action.type === 'what_can_i_do') {
        speakCompanionReply(
          rawInput,
          'You can say: Open my classes, Open the latest class, Ask a question about the lecture, Read my latest notes, Read the next section, Catch me up, Stop speaking, or Go home.'
        );
        return;
      }
      if (action.type === 'open_classes') {
        navigateTo('classes', true);
        if (savedSessions.length === 0) {
          speakCompanionReply(rawInput, 'My Classes is open. You have no saved classes yet.');
        } else {
          speakCompanionReply(
            rawInput,
            `You have ${savedSessions.length} saved class${savedSessions.length === 1 ? '' : 'es'}. Your most recent class is ${savedSessions[0].title}. Say "Open the latest class" to select it.`
          );
        }
        return;
      }
      if (action.type === 'open_latest_class') {
        const target = activeSession ?? savedSessions[0];
        if (!target) {
          speakCompanionReply(rawInput, 'There are no saved classes yet. Say "Start a new class" or try the demo.');
          return;
        }
        setActiveSession(target);
        setRecordingState('completed');
        setNoteCursorIndex(0);
        navigateTo(target.notes ? 'notes' : 'classroom', true);
        speakCompanionReply(
          rawInput,
          `${target.title} is open. You can ask about the lecture, listen to your notes, or review your bookmarks.`
        );
        return;
      }
      if (action.type === 'open_notes') {
        const target = activeSession ?? savedSessions.find((s) => Boolean(s.notes));
        if (!target) {
          speakCompanionReply(rawInput, 'No study notes are available yet.');
          return;
        }
        setActiveSession(target);
        navigateTo('notes', true);
        speakCompanionReply(rawInput, `Study notes for ${target.title} are open. Say "Read my latest notes" to listen.`);
        return;
      }
      if (action.type === 'open_participation') {
        navigateTo('participation', true);
        speakCompanionReply(rawInput, 'Student Participation Console is open.');
        return;
      }

      if (
        action.type === 'read_latest_notes' ||
        action.type === 'read_next_section' ||
        action.type === 'read_previous_section' ||
        action.type === 'read_section'
      ) {
        const target = activeSession ?? savedSessions.find((s) => Boolean(s.notes));
        if (!target?.notes) {
          speakCompanionReply(rawInput, 'No study notes found. End a class or run the demo to generate notes first.');
          return;
        }
        setActiveSession(target);
        const sections = buildReadableSections(target.notes);
        if (sections.length === 0) {
          speakCompanionReply(rawInput, 'This study notes document has no readable sections yet.');
          return;
        }

        let nextIdx = noteCursorIndex;
        if (action.type === 'read_latest_notes') {
          nextIdx = 0;
        } else if (action.type === 'read_next_section') {
          nextIdx = Math.min(sections.length - 1, noteCursorIndex + 1);
        } else if (action.type === 'read_previous_section') {
          nextIdx = Math.max(0, noteCursorIndex - 1);
        } else if (action.type === 'read_section') {
          const foundIdx = sections.findIndex((s) => s.key === action.section);
          if (foundIdx === -1) {
            speakCompanionReply(rawInput, `There is no ${action.section} section in these notes.`);
            return;
          }
          nextIdx = foundIdx;
        }
        setNoteCursorIndex(nextIdx);
        navigateTo('notes', true);
        speakCompanionReply(rawInput, sections[nextIdx].spokenText, { forceSpeak: voiceModeEnabled });
        return;
      }

      if (action.type === 'open_source_explanation') {
        const target = activeSession ?? savedSessions.find((s) => Boolean(s.notes));
        const sections = target?.notes ? buildReadableSections(target.notes) : [];
        const segId = sections[noteCursorIndex]?.firstSegmentId;
        if (!segId || !target) {
          speakCompanionReply(rawInput, 'No source reference is linked to the current section.');
          return;
        }
        setActiveSession(target);
        handleJumpToSegment(segId);
        speakCompanionReply(rawInput, 'Opened the original classroom transcript explanation.');
        return;
      }

      if (action.type === 'catch_me_up') {
        const target = activeSession ?? savedSessions[0];
        if (!target) {
          speakCompanionReply(rawInput, 'No active or saved class to catch up on.');
          return;
        }
        setActiveSession(target);
        const res = buildDeterministicCatchMeUp(target.segments, target.isDemo, action.windowMinutes);
        setCatchMeUp(res);
        const spoken =
          res.points.length === 0
            ? res.headline
            : `${res.headline} ${res.points.map((p) => p.text).join(' ')}`;
        speakCompanionReply(rawInput, spoken);
        return;
      }

      if (action.type === 'mark_important' || action.type === 'bookmark_topic' || action.type === 'save_for_revision') {
        const target = activeSession ?? savedSessions[0];
        if (!target) {
          speakCompanionReply(rawInput, 'Open a class first before bookmarking.');
          return;
        }
        const educational = target.segments.filter(
          (s) => s.isFinal && !s.isVoiceCommand && !s.isGapMarker
        );
        const lastEdu = educational[educational.length - 1];
        if (!lastEdu) {
          speakCompanionReply(rawInput, 'There is no finalized explanation to mark yet.');
          return;
        }
        const isHl = action.type === 'mark_important';
        const updated: ClassroomSession = {
          ...target,
          segments: target.segments.map((s) =>
            s.id === lastEdu.id
              ? isHl
                ? { ...s, highlightType: 'important' }
                : { ...s, isBookmarked: true, bookmarkLabel: action.type === 'bookmark_topic' ? action.label || 'Bookmarked Topic' : 'Revision' }
              : s
          ),
        };
        setActiveSession(updated);
        void persistSession(updated);
        speakCompanionReply(
          rawInput,
          isHl ? 'Marked the latest explanation as important.' : 'Bookmarked the latest explanation for revision.'
        );
        return;
      }

      if (action.type === 'start_class') {
        setConsentOpen(true);
        speakCompanionReply(rawInput, 'Opening classroom consent and microphone setup.');
        return;
      }

      if (action.type === 'end_class_and_notes') {
        setConfirmState({
          open: true,
          title: 'End Class & Prepare Study Notes?',
          message: 'Confirm to stop recording and generate evidence-linked study notes.',
          confirmLabel: 'End Class & Generate Notes',
          destructive: false,
          onConfirm: () => {
            setConfirmState((prev) => ({ ...prev, open: false }));
            void finalizeAndGenerateNotes();
          },
        });
        speakCompanionReply(rawInput, 'Please confirm ending the class and generating study notes.');
        return;
      }

      if (action.type === 'translate_last') {
        const target = activeSession ?? savedSessions[0];
        const educational = target?.segments.filter((s) => s.isFinal && !s.isVoiceCommand && !s.isGapMarker) ?? [];
        const lastEdu = educational[educational.length - 1];
        if (!lastEdu) {
          speakCompanionReply(rawInput, 'No finalized explanation to translate.');
          return;
        }
        await handleTranslateSegment(lastEdu.id, action.targetLanguage);
        speakCompanionReply(rawInput, `Translated the latest explanation into ${action.targetLanguage.toUpperCase()}.`);
        return;
      }

      if (action.type === 'translate_previous_answer' && previousQaAnswer) {
        setTurnState('processing');
        try {
          let translated = '';
          if (activeSession?.isDemo || !capabilities?.aiNotesAndTranslationConfigured) {
            translated = getDemoTranslation(previousQaAnswer, action.targetLanguage);
          } else {
            const res = await requestTranslation(previousQaAnswer, action.targetLanguage);
            translated = res.translatedText;
          }
          const ttsLang =
            action.targetLanguage === 'te' ? 'te-IN' : action.targetLanguage === 'hi' ? 'hi-IN' : 'en-IN';
          speakCompanionReply(rawInput, translated, { lang: ttsLang });
        } catch (err) {
          speakCompanionReply(
            rawInput,
            err instanceof Error ? err.message : 'Unable to translate previous answer.'
          );
        }
        return;
      }

      if (action.type === 'ask_lecture') {
        const target = activeSession ?? savedSessions[0];
        if (!target || target.segments.length === 0) {
          speakCompanionReply(rawInput, "I couldn't find any saved classroom transcript to search.");
          return;
        }

        qaAbortRef.current?.abort();
        const controller = new AbortController();
        qaAbortRef.current = controller;
        setTurnState('processing');

        try {
          if (target.isDemo || !capabilities?.aiNotesAndTranslationConfigured) {
            const qWords = action.question
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .split(/\s+/)
              .filter((w) => w.length > 3);
            const educational = target.segments.filter(
              (s) => s.isFinal && !s.isVoiceCommand && !s.isGapMarker && !s.isUnclearAudio
            );
            const matched = educational.find((s) =>
              qWords.some((qw) => (s.correctedText ?? s.originalText).toLowerCase().includes(qw))
            );
            if (!matched) {
              speakCompanionReply(rawInput, "I couldn't find that explanation in your saved classroom transcript.");
              return;
            }
            const text = (matched.correctedText ?? matched.originalText).trim();
            setPreviousQaAnswer(text);
            const mins = Math.round(matched.timestampMs / 60000);
            const sourceDesc =
              matched.timestampMs < 60000
                ? `${Math.floor(matched.timestampMs / 1000)} seconds into the lecture`
                : `approximately ${mins} minute${mins === 1 ? '' : 's'} into the lecture`;
            speakCompanionReply(rawInput, text, {
              sourceSummary: `Teacher explained this ${sourceDesc}`,
            });
            return;
          }

          const qa = await requestLectureAnswer(
            target.title,
            action.question,
            target.segments,
            previousQaAnswer,
            controller.signal
          );
          if (controller.signal.aborted) return;
          if (!qa.notFoundInTranscript) {
            setPreviousQaAnswer(qa.answer);
          }
          const fullReply = qa.supplementaryExplanation
            ? `${qa.answer} (Clarifying note: ${qa.supplementaryExplanation})`
            : qa.answer;
          speakCompanionReply(rawInput, fullReply, {
            sourceSummary: qa.spokenSourcesSummary || undefined,
          });
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
          speakCompanionReply(
            rawInput,
            err instanceof Error ? err.message : 'Unable to answer that question right now.'
          );
        }
      }
    },
    [
      activeSession,
      capabilities?.aiNotesAndTranslationConfigured,
      finalizeAndGenerateNotes,
      handleJumpToSegment,
      handleTranslateSegment,
      noteCursorIndex,
      persistSession,
      previousQaAnswer,
      savedSessions,
      screen,
      screenHistory,
      settings,
      speakCompanionReply,
      stopCompanionMic,
      updateSettings,
      voiceModeEnabled,
    ]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && turnState === 'speaking') {
        spokenServiceRef.current.stop();
        audioCaptureRef.current.setMuted(false);
        setTurnState('interrupted');
        setCompanionResponse('Playback interrupted.');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [turnState]);

  const handleToggleVoiceMode = async () => {
    if (voiceModeEnabled) {
      stopCompanionMic();
      return;
    }
    if (!capabilities?.speechToTextConfigured) {
      setVoiceModeEnabled(true);
      setTurnState('idle');
      speakCompanionReply(
        'Activate Voice Mode',
        'Voice Mode visual & spoken controls are active. Live microphone streaming requires DEEPGRAM_API_KEY, or you can type any command in the Companion bar.',
        { forceSpeak: true }
      );
      return;
    }
    if (recordingState === 'listening') {
      setVoiceModeEnabled(true);
      setTurnState('listening');
      speakCompanionReply('Activate Voice Mode', 'Voice Mode active alongside live classroom.', {
        forceSpeak: true,
      });
      return;
    }

    try {
      setVoiceModeEnabled(true);
      setTurnState('listening');
      await audioCaptureRef.current.start({
        onPcmChunk: (buf) => speechSocketRef.current.sendAudio(buf),
        onLevel: setMicLevel,
        onError: (msg) => {
          setTurnState('error');
          setCompanionResponse(msg);
        },
      });
      speechSocketRef.current.connect('multi', audioCaptureRef.current.getSampleRate(), {
        onMessage: (msg) => {
          if (msg.type === 'transcript') {
            if (!msg.isFinal) {
              setTurnState('recognizing');
            } else {
              void handleGlobalCommand(msg.text);
            }
          } else if (msg.type === 'error') {
            setTurnState('error');
            setCompanionResponse(msg.message);
          }
        },
        onUnexpectedClose: () => setTurnState('error'),
        onReconnected: () => setTurnState('listening'),
      });
      speakCompanionReply(
        'Activate Voice Mode',
        'Voice Mode is listening. Say "What can I do?" to hear available actions.',
        { forceSpeak: true }
      );
    } catch (err) {
      setVoiceModeEnabled(false);
      setTurnState('error');
      setCompanionResponse(err instanceof Error ? err.message : 'Microphone access failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--mv-bg)] text-[var(--mv-text)]">
      <LiveRegion politeMessage={politeAnnouncement} assertiveMessage={assertiveAnnouncement} />

      <TopNav
        currentScreen={screen}
        onNavigate={(s) => navigateTo(s)}
        onOpenAccessibility={() => setA11yOpen(true)}
        isLiveOrDemoActive={recordingState === 'listening' || recordingState === 'reconnecting'}
        isDemoMode={Boolean(activeSession?.isDemo)}
      />

      <VoiceCompanionBar
        voiceModeEnabled={voiceModeEnabled}
        turnState={turnState}
        autoSpeakEnabled={settings.autoSpeakResponses ?? true}
        currentResponse={companionResponse}
        currentSourceSummary={companionSource}
        history={companionHistory}
        onToggleVoiceMode={() => void handleToggleVoiceMode()}
        onSubmitCommandText={(txt) => void handleGlobalCommand(txt)}
        onStopSpeaking={() => {
          qaAbortRef.current?.abort();
          spokenServiceRef.current.stop();
          audioCaptureRef.current.setMuted(false);
          setTurnState('interrupted');
          setCompanionResponse('Stopped speaking.');
        }}
        onPauseSpeaking={() => {
          spokenServiceRef.current.pause();
          setTurnState('interrupted');
        }}
        onResumeSpeaking={() => spokenServiceRef.current.resume()}
        onRepeatLast={() => {
          if (!spokenServiceRef.current.repeatLast()) {
            setCompanionResponse('Nothing to repeat yet.');
          }
        }}
        onToggleAutoSpeak={() =>
          updateSettings({
            ...settings,
            autoSpeakResponses: !(settings.autoSpeakResponses ?? true),
          })
        }
        onShowHelp={() => void handleGlobalCommand('What can I do?')}
      />

      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {screen === 'home' && (
          <HomeScreen
            capabilities={capabilities}
            savedSessions={savedSessions}
            reducedMotion={settings.reducedMotion}
            recordingState={recordingState}
            onStartLiveClass={() => setConsentOpen(true)}
            onStartDemo={startDemoSession}
            onOpenSession={(sess) => {
              setActiveSession(sess);
              setRecordingState('completed');
              setCatchMeUp(null);
              setScreen(sess.notes ? 'notes' : 'classroom');
            }}
            onNavigate={setScreen}
            onOpenAccessibility={() => setA11yOpen(true)}
          />
        )}

        {screen === 'classroom' && (
          <LiveClassroomScreen
            session={activeSession}
            interimText={interimText}
            recordingState={recordingState}
            micLevel={micLevel}
            commandPulseKey={commandPulseKey}
            statusMessage={statusMessage}
            commandFeedback={commandFeedback}
            catchMeUp={catchMeUp}
            onTriggerCatchMeUp={() => {
              if (!activeSession) return;
              setCatchMeUp(
                buildDeterministicCatchMeUp(activeSession.segments, activeSession.isDemo)
              );
              setPoliteAnnouncement('Catch Me Up summary updated.');
            }}
            onDismissCatchMeUp={() => setCatchMeUp(null)}
            settings={settings}
            onUpdateSettings={updateSettings}
            onStopRecording={() => {
              stopLiveAudioAndSocket();
              setRecordingState('completed');
              setStatusMessage('Recording stopped');
            }}
            onEndClassAndGenerateNotes={() => {
              setConfirmState({
                open: true,
                title: 'End Class & Prepare Study Notes?',
                message:
                  'This will stop audio capture, finalize the transcript, and generate evidence-linked study notes.',
                confirmLabel: 'End Class & Prepare Notes',
                destructive: false,
                onConfirm: () => {
                  setConfirmState((prev) => ({ ...prev, open: false }));
                  void finalizeAndGenerateNotes();
                },
              });
            }}
            onToggleHighlight={(segmentId) => {
              if (!activeSession) return;
              const updated: ClassroomSession = {
                ...activeSession,
                segments: activeSession.segments.map((s) =>
                  s.id === segmentId
                    ? { ...s, highlightType: s.highlightType ? undefined : 'important' }
                    : s
                ),
              };
              setActiveSession(updated);
              void persistSession(updated);
            }}
            onToggleBookmark={(segmentId) => {
              if (!activeSession) return;
              const updated: ClassroomSession = {
                ...activeSession,
                segments: activeSession.segments.map((s) =>
                  s.id === segmentId
                    ? {
                        ...s,
                        isBookmarked: !s.isBookmarked,
                        bookmarkLabel: !s.isBookmarked ? 'Bookmarked Moment' : undefined,
                      }
                    : s
                ),
              };
              setActiveSession(updated);
              void persistSession(updated);
            }}
            onCorrectSegment={(segmentId, correctedText) => {
              if (!activeSession) return;
              const updated: ClassroomSession = {
                ...activeSession,
                segments: activeSession.segments.map((s) =>
                  s.id === segmentId ? { ...s, correctedText } : s
                ),
              };
              setActiveSession(updated);
              void persistSession(updated);
            }}
            onTranslateSegment={handleTranslateSegment}
            onOpenParticipation={() => setScreen('participation')}
            onStartDemo={startDemoSession}
            onDemoNextStep={() => {
              if (demoStepIdx < DEMO_PHOTOSYNTHESIS_STEPS.length) {
                runDemoStep(demoStepIdx);
                setDemoStepIdx((i) => i + 1);
              }
            }}
            onToggleDemoPause={() => setIsDemoPaused((p) => !p)}
            isDemoPaused={isDemoPaused}
            onStartLiveClass={() => setConsentOpen(true)}
          />
        )}

        {screen === 'participation' && (
          <StudentParticipationScreen
            ttsSupported={ttsServiceRef.current.isSupported()}
            ttsStatus={ttsStatus}
            ttsStatusDetail={ttsDetail}
            onSpeak={handleSpeakQuestion}
            onStopSpeaking={handleStopSpeaking}
            onBackToClassroom={() => setScreen('classroom')}
            hasActiveSession={Boolean(activeSession)}
          />
        )}

        {screen === 'notes' && (
          <SmartNotesScreen
            session={activeSession}
            isGenerating={recordingState === 'generating_notes'}
            generationError={notesError}
            onRetryGenerate={() => void finalizeAndGenerateNotes()}
            onUpdateNotes={(notes) => {
              if (!activeSession) return;
              const updated = { ...activeSession, notes };
              setActiveSession(updated);
              void persistSession(updated);
            }}
            onJumpToSegment={handleJumpToSegment}
          />
        )}

        {screen === 'classes' && (
          <MyClassesScreen
            sessions={savedSessions}
            onOpenTranscript={(sess) => {
              setActiveSession(sess);
              setRecordingState('completed');
              setStatusMessage('Viewing saved transcript');
              setScreen('classroom');
            }}
            onOpenNotes={(sess) => {
              setActiveSession(sess);
              setRecordingState('completed');
              setScreen('notes');
            }}
            onDeleteSession={(id) => {
              setConfirmState({
                open: true,
                title: 'Delete Saved Class?',
                message: 'This will permanently remove this class transcript and study notes from your browser.',
                confirmLabel: 'Delete Class',
                destructive: true,
                onConfirm: () => {
                  setConfirmState((prev) => ({ ...prev, open: false }));
                  void deleteSession(id).then(() => getAllSessions().then(setSavedSessions));
                  if (activeSession?.id === id) setActiveSession(null);
                },
              });
            }}
            onClearAll={() => {
              setConfirmState({
                open: true,
                title: 'Clear All Saved Classes?',
                message: 'All locally saved classroom transcripts, highlights, bookmarks, and notes will be permanently deleted.',
                confirmLabel: 'Clear All Data',
                destructive: true,
                onConfirm: () => {
                  setConfirmState((prev) => ({ ...prev, open: false }));
                  void clearAllSessions().then(() => setSavedSessions([]));
                  setActiveSession(null);
                },
              });
            }}
          />
        )}
      </main>

      <ConsentModal
        open={consentOpen}
        capabilities={capabilities}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        onConfirm={(title) => void startLiveClass(title)}
        onUseDemo={startDemoSession}
        onCancel={() => setConsentOpen(false)}
      />

      <AccessibilityDrawer
        open={a11yOpen}
        settings={settings}
        onChange={updateSettings}
        onClose={() => setA11yOpen(false)}
      />

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />

      <OnboardingDialog
        open={onboardingOpen}
        settings={settings}
        onSavePreferences={(next, activateVoiceNow) => {
          updateSettings(next);
          setOnboardingOpen(false);
          if (activateVoiceNow) {
            void handleToggleVoiceMode();
          }
        }}
        onClose={() => {
          updateSettings({ ...settings, onboardingCompleted: true });
          setOnboardingOpen(false);
        }}
      />
    </div>
  );
}

export default App;
