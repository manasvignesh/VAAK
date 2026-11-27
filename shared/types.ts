export type SupportedLanguage = 'multi' | 'en-IN' | 'hi' | 'te';
export type TranslationLanguage = 'en' | 'hi' | 'te';

export type ScreenId =
  | 'home'
  | 'classroom'
  | 'participation'
  | 'notes'
  | 'classes';

export type RecordingState =
  | 'idle'
  | 'requesting_permission'
  | 'connecting'
  | 'listening'
  | 'reconnecting'
  | 'paused_for_tts'
  | 'generating_notes'
  | 'completed'
  | 'error';

export type CaptionSize = 24 | 32 | 40;
export type ThemeMode = 'light' | 'dark';

export interface AccessibilitySettings {
  captionSize: CaptionSize;
  theme: ThemeMode;
  highContrast: boolean;
  reducedMotion: boolean;
  confidenceThreshold: number; // Default 0.6 (configurable, not a clinical threshold)
  autoScroll: boolean;
  commandListeningEnabled: boolean;
  focusMode?: boolean;
  voiceModeEnabled?: boolean;
  autoSpeakResponses?: boolean;
  speechRate?: number;
  preferredSpeechLang?: 'en-IN' | 'hi-IN' | 'te-IN';
  onboardingCompleted?: boolean;
}

export type VoiceTurnState =
  | 'idle'
  | 'listening'
  | 'recognizing'
  | 'processing'
  | 'speaking'
  | 'interrupted'
  | 'error';

export interface LectureQaResponse {
  answer: string;
  teacherGrounded: boolean;
  supplementaryExplanation?: string;
  notFoundInTranscript: boolean;
  references: EvidenceReference[];
  spokenSourcesSummary: string;
  isCached?: boolean;
  isDemo?: boolean;
}

export interface WordToken {
  word: string;
  punctuatedWord?: string;
  confidence: number | null; // null when provider does not supply confidence
  start?: number;
  end?: number;
  language?: string;
}

export interface TranscriptSegment {
  id: string; // Stable segment ID, e.g., "seg-001"
  sessionId: string;
  timestampMs: number; // Offset from session start
  createdAtIso: string;
  originalText: string;
  correctedText?: string;
  isFinal: boolean;
  words: WordToken[];
  hasConfidenceData: boolean;
  isUnclearAudio?: boolean; // True when audio was unrecognizable -> "Audio unclear — please check this section."
  isGapMarker?: boolean; // True for connection loss/recovery gap markers
  isVoiceCommand?: boolean; // True for recognized "MyVoice, ..." control commands (excluded from notes)
  languageDetected?: string;
  highlightType?: 'important' | 'definition' | 'explanation';
  isBookmarked?: boolean;
  bookmarkLabel?: string;
  translations?: Partial<Record<TranslationLanguage, {
    text: string;
    isDemo: boolean;
    translatedAtIso: string;
  }>>;
}

export type VoiceCommandAction =
  | { type: 'start_class'; topic?: string }
  | { type: 'mark_important' }
  | { type: 'translate_last'; targetLanguage: TranslationLanguage }
  | { type: 'bookmark_topic'; label?: string }
  | { type: 'summarize_so_far' }
  | { type: 'end_class_and_notes' };

export interface VoiceCommandMatch {
  rawText: string;
  recognized: boolean;
  requiresConfirmation: boolean;
  action?: VoiceCommandAction;
  reason?: string;
}

export interface EvidenceReference {
  segmentId: string;
  timestampMs: number;
  excerpt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  unverified: boolean;
  references: EvidenceReference[];
}

export interface StudyNotes {
  sessionId: string;
  generatedAtIso: string;
  isDemo: boolean;
  isLocalFallback?: boolean;
  notice?: string;
  topicHeadings: string[];
  keyConcepts: NoteItem[];
  importantDefinitions: NoteItem[];
  lessonSummary: NoteItem[];
  highlightedExplanations: NoteItem[];
  bookmarkedMoments: NoteItem[];
  unclearOrUnverified: NoteItem[];
}

export interface ClassroomSession {
  id: string;
  title: string;
  language: SupportedLanguage;
  createdAtIso: string;
  endedAtIso?: string;
  durationMs: number;
  isDemo: boolean;
  segments: TranscriptSegment[];
  notes?: StudyNotes;
}

export interface AppCapabilities {
  speechToTextConfigured: boolean;
  speechToTextProvider: string;
  aiNotesAndTranslationConfigured: boolean;
  aiProvider: string;
  demoModeAvailable: boolean;
  supportedLanguages: Array<{ code: SupportedLanguage; label: string }>;
}

// WebSocket messages: Client -> Server
export type ClientWsMessage =
  | { type: 'start'; language: SupportedLanguage; sampleRate: number }
  | { type: 'stop' }
  | { type: 'ping' };

// WebSocket messages: Server -> Client
export type ServerWsMessage =
  | { type: 'ready'; provider: string; language: SupportedLanguage }
  | {
      type: 'transcript';
      text: string;
      isFinal: boolean;
      words: WordToken[];
      hasConfidenceData: boolean;
      languageDetected?: string;
      isUnclearAudio?: boolean;
    }
  | { type: 'status'; status: 'connecting' | 'connected' | 'reconnecting' | 'closed'; message?: string }
  | { type: 'error'; code: string; message: string; recoverable: boolean }
  | { type: 'pong' };
