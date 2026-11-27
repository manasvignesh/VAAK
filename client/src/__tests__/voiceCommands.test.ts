import { describe, expect, it } from 'vitest';
import { isStandaloneWakeWord, parseVoiceCommand } from '../services/voiceCommands';

describe('parseVoiceCommand', () => {
  it('recognizes all standard MyVoice prefix commands', () => {
    const start = parseVoiceCommand("MyVoice, start today's class on photosynthesis.", true);
    expect(start.recognized).toBe(true);
    expect(start.action).toEqual({ type: 'start_class', topic: 'photosynthesis' });

    const mark = parseVoiceCommand('MyVoice, mark that definition as important.', true);
    expect(mark.recognized).toBe(true);
    expect(mark.action).toEqual({ type: 'mark_important' });

    const translate = parseVoiceCommand('MyVoice, translate the last explanation into Telugu.', true);
    expect(translate.recognized).toBe(true);
    expect(translate.action).toEqual({ type: 'translate_last', targetLanguage: 'te' });

    const bookmark = parseVoiceCommand('MyVoice, bookmark this topic.', true);
    expect(bookmark.recognized).toBe(true);
    expect(bookmark.action).toEqual({ type: 'bookmark_topic', label: undefined });

    const summarize = parseVoiceCommand('MyVoice, summarize what we covered so far.', true);
    expect(summarize.recognized).toBe(true);
    expect(summarize.action).toEqual({ type: 'summarize_so_far' });

    const end = parseVoiceCommand('MyVoice, end the class and prepare study notes.', true);
    expect(end.recognized).toBe(true);
    expect(end.requiresConfirmation).toBe(true);
    expect(end.action).toEqual({ type: 'end_class_and_notes' });
  });

  it('handles realistic punctuation, spacing, and phrasing variations', () => {
    const physics = parseVoiceCommand("MyVoice, start today's physics class.", true);
    expect(physics.recognized).toBe(true);
    expect(physics.action).toEqual({ type: 'start_class', topic: 'physics' });

    const noComma = parseVoiceCommand('MyVoice mark that as important.', true);
    expect(noComma.recognized).toBe(true);
    expect(noComma.action).toEqual({ type: 'mark_important' });

    const spacedWake = parseVoiceCommand('My Voice, bookmark this topic.', true);
    expect(spacedWake.recognized).toBe(true);
    expect(spacedWake.action).toEqual({ type: 'bookmark_topic', label: undefined });

    const shortTranslate = parseVoiceCommand('MyVoice, translate that into Telugu.', true);
    expect(shortTranslate.recognized).toBe(true);
    expect(shortTranslate.action).toEqual({ type: 'translate_last', targetLanguage: 'te' });

    const shortSummarize = parseVoiceCommand('MyVoice, summarize the class.', true);
    expect(shortSummarize.recognized).toBe(true);
    expect(shortSummarize.action).toEqual({ type: 'summarize_so_far' });

    const shortEnd = parseVoiceCommand('MyVoice, end the class.', true);
    expect(shortEnd.recognized).toBe(true);
    expect(shortEnd.requiresConfirmation).toBe(true);
    expect(shortEnd.action).toEqual({ type: 'end_class_and_notes' });

    const mixedCase = parseVoiceCommand('myvoice: translate into Hindi!', true);
    expect(mixedCase.recognized).toBe(true);
    expect(mixedCase.action).toEqual({ type: 'translate_last', targetLanguage: 'hi' });
  });

  it('ignores command words appearing mid-lecture without leading MyVoice prefix', () => {
    const midLecture = parseVoiceCommand(
      'In exams, students often bookmark this topic or end the class early.',
      true
    );
    expect(midLecture.recognized).toBe(false);
    expect(midLecture.reason).toBeUndefined();

    const midMention = parseVoiceCommand('Later we will use MyVoice to summarize the class.', true);
    expect(midMention.recognized).toBe(false);
    expect(midMention.reason).toBeUndefined();
  });

  it('does not execute commands when commandListeningEnabled is false', () => {
    const disabled = parseVoiceCommand('MyVoice, mark that as important.', false);
    expect(disabled.recognized).toBe(false);
  });

  it('explains ambiguous MyVoice commands without executing them', () => {
    const ambiguous = parseVoiceCommand('MyVoice, do something mysterious.', true);
    expect(ambiguous.recognized).toBe(false);
    expect(ambiguous.reason).toContain('Unrecognized MyVoice command');
  });

  it('detects standalone wake words when Deepgram splits "My voice," from the command body', () => {
    expect(isStandaloneWakeWord('My voice,')).toBe(true);
    expect(isStandaloneWakeWord('MyVoice!')).toBe(true);
    expect(isStandaloneWakeWord('This is my voice.')).toBe(false);
  });
});
