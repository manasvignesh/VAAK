import type { TranslationLanguage, VoiceCommandMatch } from '../types';

const WAKE_PREFIX_REGEX = /^\s*(?:my\s*voice|myvoice)[\s,:\-–—]+(.+)$/i;
const STANDALONE_WAKE_REGEX = /^\s*(?:my\s*voice|myvoice)[\s,.:!?-]*$/i;

export function isStandaloneWakeWord(rawText: string): boolean {
  return STANDALONE_WAKE_REGEX.test(rawText.trim());
}

function detectTargetLanguage(text: string): TranslationLanguage | null {
  const lower = text.toLowerCase();
  if (/\b(telugu|తెలుగు)\b/i.test(lower)) return 'te';
  if (/\b(hindi|हिन्दी|हिंदी)\b/i.test(lower)) return 'hi';
  if (/\b(english)\b/i.test(lower)) return 'en';
  return null;
}

/**
 * Parses finalized utterances for explicit "MyVoice, ..." control commands.
 * Never triggers on words appearing mid-lecture without the leading wake prefix.
 */
export function parseVoiceCommand(
  rawText: string,
  commandListeningEnabled: boolean
): VoiceCommandMatch {
  const trimmed = rawText.trim();
  if (!commandListeningEnabled || !trimmed) {
    return { rawText: trimmed, recognized: false, requiresConfirmation: false };
  }

  const prefixMatch = trimmed.match(WAKE_PREFIX_REGEX);
  if (!prefixMatch) {
    return { rawText: trimmed, recognized: false, requiresConfirmation: false };
  }

  const body = prefixMatch[1].trim().replace(/[.!?]+$/, '').trim();
  const lower = body.toLowerCase();

  // 1. Start class (e.g., "start today's class on photosynthesis", "start today's physics class", "start class on biology")
  const startMatch = body.match(
    /^(?:start|begin)\s+(?:today'?s\s+)?(?:(.+?)\s+)?class(?:\s+(?:on|about)\s+(.+))?$/i
  );
  if (startMatch) {
    const topic = (startMatch[2] ?? startMatch[1])?.trim() || undefined;
    return {
      rawText: trimmed,
      recognized: true,
      requiresConfirmation: false,
      action: {
        type: 'start_class',
        topic,
      },
    };
  }

  // 2. Mark important / highlight
  if (
    /^(?:mark|highlight)\s+(?:that|this)(?:\s+(?:definition|explanation|concept|point))?(?:\s+as\s+important)?$/i.test(
      lower
    ) ||
    /^mark\s+important$/i.test(lower)
  ) {
    return {
      rawText: trimmed,
      recognized: true,
      requiresConfirmation: false,
      action: { type: 'mark_important' },
    };
  }

  // 3. Translate last explanation
  if (/\btranslate\b/i.test(lower)) {
    const targetLanguage = detectTargetLanguage(lower);
    if (!targetLanguage) {
      return {
        rawText: trimmed,
        recognized: false,
        requiresConfirmation: false,
        reason: 'Please specify a target language: English, Hindi, or Telugu.',
      };
    }
    return {
      rawText: trimmed,
      recognized: true,
      requiresConfirmation: false,
      action: { type: 'translate_last', targetLanguage },
    };
  }

  // 4. Bookmark topic
  const bookmarkMatch = body.match(
    /^bookmark\s+(?:this\s+topic|this|that)(?:\s+(?:as|labeled)\s+(.+))?$/i
  );
  if (bookmarkMatch) {
    return {
      rawText: trimmed,
      recognized: true,
      requiresConfirmation: false,
      action: {
        type: 'bookmark_topic',
        label: bookmarkMatch[1]?.trim() || undefined,
      },
    };
  }

  // 5. Summarize so far
  if (/\bsummarize\b/i.test(lower) && /\b(covered|so far|class|lesson)\b/i.test(lower)) {
    return {
      rawText: trimmed,
      recognized: true,
      requiresConfirmation: false,
      action: { type: 'summarize_so_far' },
    };
  }

  // 6. End class and prepare study notes (requires confirmation)
  if (
    /\bend\s+(?:the\s+)?class\b/i.test(lower) ||
    /\bprepare\s+study\s+notes\b/i.test(lower)
  ) {
    return {
      rawText: trimmed,
      recognized: true,
      requiresConfirmation: true,
      action: { type: 'end_class_and_notes' },
    };
  }

  return {
    rawText: trimmed,
    recognized: false,
    requiresConfirmation: false,
    reason: `Unrecognized MyVoice command: "${body}". Try "mark that as important", "translate into Telugu", "bookmark this topic", or "end the class and prepare study notes".`,
  };
}
