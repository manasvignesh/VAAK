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
} from './types';
import { fetchCapabilities, requestStudyNotes, requestTranslation } from './services/apiClient';
import { AudioCaptureService } from './services/audioCapture';
import { SpeechSocketClient } from './services/speechSocket';
import { isStandaloneWakeWord, parseVoiceCommand } from './services/voiceCommands';
import { TtsService, type TtsStatus } from './services/ttsService';
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

  // Demo mode state
  const [demoStepIdx, setDemoStepIdx] = useState(0);
  const [isDemoPaused, setIsDemoPaused] = useState(false);

  const audioCaptureRef = useRef(new AudioCaptureService());
  const speechSocketRef = useRef(new SpeechSocketClient());
  const ttsServiceRef = useRef(new TtsService());
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

    loadSettings().then(setSettings);
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

  const handleJumpToSegment = (segmentId: string) => {
    setScreen('classroom');
    setTimeout(() => {
      const el = document.getElementById(`segment-${segmentId}`);
      if (el) {
        el.scrollIntoView({ behavior: settings.reducedMotion ? 'auto' : 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[var(--mv-bg)] text-[var(--mv-text)]">
      <LiveRegion politeMessage={politeAnnouncement} assertiveMessage={assertiveAnnouncement} />

      <TopNav
        currentScreen={screen}
        onNavigate={setScreen}
        onOpenAccessibility={() => setA11yOpen(true)}
        isLiveOrDemoActive={recordingState === 'listening' || recordingState === 'reconnecting'}
        isDemoMode={Boolean(activeSession?.isDemo)}
      />

      <main id="main-content" tabIndex={-1}>
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
    </div>
  );
}

export default App;
