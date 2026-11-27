import type { TranslationLanguage } from '../types';

export type GlobalVoiceAction =
  // Navigation
  | { type: 'go_home' }
  | { type: 'open_classes' }
  | { type: 'open_latest_class' }
  | { type: 'open_notes' }
  | { type: 'open_participation' }
  | { type: 'go_back' }
  | { type: 'where_am_i' }
  | { type: 'what_can_i_do' }
  // Classroom
  | { type: 'start_class'; topic?: string }
  | { type: 'mark_important' }
  | { type: 'bookmark_topic'; label?: string }
  | { type: 'translate_last'; targetLanguage: TranslationLanguage }
  | { type: 'catch_me_up'; windowMinutes?: number }
  | { type: 'end_class_and_notes' }
  // Learning & Notes Reading
  | { type: 'read_latest_notes' }
  | { type: 'read_next_section' }
  | { type: 'read_previous_section' }
  | { type: 'read_section'; section: 'summary' | 'definitions' | 'highlights' | 'bookmarks' }
  | { type: 'open_source_explanation' }
  | { type: 'save_for_revision' }
  | { type: 'ask_lecture'; question: string }
  | { type: 'translate_previous_answer'; targetLanguage: TranslationLanguage }
  // Playback & Turn Control
  | { type: 'stop_speaking' }
  | { type: 'pause_speaking' }
  | { type: 'continue_speaking' }
  | { type: 'repeat_that' }
  | { type: 'speak_slowly' }
  | { type: 'speak_faster' }
  | { type: 'stop_listening' }
  | { type: 'cancel' };

const STRIP_WAKE_PREFIX = /^\s*(?:vaak|vak|voc|my\s*voice|myvoice)[\s,.:;\-–—]+/i;

function detectLanguage(text: string): TranslationLanguage | null {
  const lower = text.toLowerCase();
  if (/\b(telugu|తెలుగు)\b/i.test(lower)) return 'te';
  if (/\b(hindi|हिन्दी|हिंदी)\b/i.test(lower)) return 'hi';
  if (/\b(english)\b/i.test(lower)) return 'en';
  return null;
}

function parseMinutesWindow(text: string): number | undefined {
  const numMatch = text.match(/\b(\d+)\s+minute/i);
  if (numMatch) return Number.parseInt(numMatch[1], 10);
  if (/\b(one|a)\s+minute\b/i.test(text)) return 1;
  if (/\btwo\s+minute/i.test(text)) return 2;
  if (/\bthree\s+minute/i.test(text)) return 3;
  if (/\bfive\s+minute/i.test(text)) return 5;
  return undefined;
}

/**
 * Deterministic router for Voice Companion / Global Voice Mode utterances.
 * Never calls Gemini for navigation, playback, bookmarking, or known classroom controls.
 */
export function routeGlobalVoiceCommand(
  rawInput: string,
  options: { hasPreviousAnswer?: boolean } = {}
): GlobalVoiceAction | null {
  const cleaned = rawInput.trim().replace(STRIP_WAKE_PREFIX, '').trim().replace(/[.!?]+$/, '');
  if (!cleaned) return null;
  const lower = cleaned.toLowerCase();

  // Playback & turn control (highest priority)
  if (/^(?:stop|stop\s+speaking|quiet|be\s+quiet)$/i.test(lower)) {
    return { type: 'stop_speaking' };
  }
  if (/^(?:stop\s+listening|turn\s+off\s+voice(?:\s+mode)?|exit\s+voice(?:\s+mode)?)$/i.test(lower)) {
    return { type: 'stop_listening' };
  }
  if (/^(?:cancel|never\s+mind|forget\s+it)$/i.test(lower)) {
    return { type: 'cancel' };
  }
  if (/^pause(?:\s+speaking|\s+reading)?$/i.test(lower)) {
    return { type: 'pause_speaking' };
  }
  if (/^(?:continue|resume)(?:\s+speaking|\s+reading)?$/i.test(lower)) {
    return { type: 'continue_speaking' };
  }
  if (/^(?:repeat|repeat\s+that|say\s+that\s+again)$/i.test(lower)) {
    return { type: 'repeat_that' };
  }
  if (/\bspeak\s+(?:more\s+)?slowly\b|\bslower\b/i.test(lower)) {
    return { type: 'speak_slowly' };
  }
  if (/\bspeak\s+faster\b|\bfaster\b/i.test(lower)) {
    return { type: 'speak_faster' };
  }

  // Navigation
  if (/^(?:go\s+home|open\s+home|home)$/i.test(lower)) {
    return { type: 'go_home' };
  }
  if (/^(?:go\s+back|back)$/i.test(lower)) {
    return { type: 'go_back' };
  }
  if (/^where\s+am\s+i$/i.test(lower)) {
    return { type: 'where_am_i' };
  }
  if (/^(?:what\s+can\s+i\s+do(?:\s+here)?|help|what\s+actions\s+are\s+available|available\s+commands)$/i.test(lower)) {
    return { type: 'what_can_i_do' };
  }
  if (/^(?:open|show|go\s+to)\s+(?:my\s+|saved\s+)?classes$/i.test(lower)) {
    return { type: 'open_classes' };
  }
  if (/^(?:open|select)\s+(?:the\s+)?(?:latest|most\s+recent|last)\s+class(?:room)?$/i.test(lower)) {
    return { type: 'open_latest_class' };
  }
  if (/^(?:open|show|go\s+to)\s+(?:my\s+)?(?:study\s+)?notes$/i.test(lower)) {
    return { type: 'open_notes' };
  }
  if (/^(?:open|show|go\s+to)\s+(?:student\s+)?participation(?:\s+mode)?$/i.test(lower)) {
    return { type: 'open_participation' };
  }

  // Notes reading & cursor
  if (/^(?:read\s+(?:my\s+)?(?:latest\s+)?notes|read\s+notes)$/i.test(lower)) {
    return { type: 'read_latest_notes' };
  }
  if (/^(?:read\s+(?:the\s+)?next\s+section|next\s+section)$/i.test(lower)) {
    return { type: 'read_next_section' };
  }
  if (/^(?:read\s+(?:the\s+)?previous\s+section|previous\s+section)$/i.test(lower)) {
    return { type: 'read_previous_section' };
  }
  if (/^read\s+(?:the\s+)?(?:lesson\s+)?summary$/i.test(lower)) {
    return { type: 'read_section', section: 'summary' };
  }
  if (/^read\s+(?:the\s+)?definitions$/i.test(lower)) {
    return { type: 'read_section', section: 'definitions' };
  }
  if (/^read\s+(?:the\s+)?highlights$/i.test(lower)) {
    return { type: 'read_section', section: 'highlights' };
  }
  if (/^read\s+(?:the\s+)?bookmarks$/i.test(lower)) {
    return { type: 'read_section', section: 'bookmarks' };
  }
  if (/^open\s+(?:the\s+)?source(?:\s+explanation)?$/i.test(lower)) {
    return { type: 'open_source_explanation' };
  }
  if (/^save\s+(?:this\s+)?for\s+revision$/i.test(lower)) {
    return { type: 'save_for_revision' };
  }

  // Classroom controls
  const startMatch = cleaned.match(
    /^(?:start|begin)\s+(?:a\s+new\s+|today'?s\s+)?(?:(.+?)\s+)?class(?:\s+(?:on|about)\s+(.+))?$/i
  );
  if (startMatch) {
    return { type: 'start_class', topic: (startMatch[2] ?? startMatch[1])?.trim() || undefined };
  }
  if (/^(?:mark|highlight)\s+(?:that|this)(?:\s+(?:definition|explanation|concept|point))?(?:\s+as\s+important)?$/i.test(lower)) {
    return { type: 'mark_important' };
  }
  const bmMatch = cleaned.match(/^bookmark\s+(?:this\s+(?:topic|explanation)|this|that)(?:\s+(?:as|labeled)\s+(.+))?$/i);
  if (bmMatch) {
    return { type: 'bookmark_topic', label: bmMatch[1]?.trim() || undefined };
  }
  if (/\bcatch\s+me\s+up\b/i.test(lower) || /\bsummarize\s+(?:what\s+we\s+covered|the\s+class)\b/i.test(lower)) {
    return { type: 'catch_me_up', windowMinutes: parseMinutesWindow(lower) };
  }
  if (/\bend\s+(?:the\s+)?class\b/i.test(lower) || /\bprepare\s+(?:study\s+)?notes\b/i.test(lower)) {
    return { type: 'end_class_and_notes' };
  }

  // Follow-up translation of previous answer vs translating last caption
  if (/\b(?:translate|explain)\s+that\s+(?:in|into)\b/i.test(lower)) {
    const lang = detectLanguage(lower);
    if (lang) {
      return options.hasPreviousAnswer
        ? { type: 'translate_previous_answer', targetLanguage: lang }
        : { type: 'translate_last', targetLanguage: lang };
    }
  }
  if (/\btranslate\b/i.test(lower)) {
    const lang = detectLanguage(lower);
    if (lang) {
      return { type: 'translate_last', targetLanguage: lang };
    }
  }

  // Conversational educational question about saved/active lecture
  if (
    /^(?:what|why|how|when|which|explain|summarize|tell\s+me)\b/i.test(lower) ||
    /\?$/.test(rawInput.trim())
  ) {
    return { type: 'ask_lecture', question: cleaned };
  }

  return null;
}
