import { describe, expect, it } from 'vitest';
import { routeGlobalVoiceCommand } from '../services/globalVoiceRouter';

describe('routeGlobalVoiceCommand', () => {
  it('routes navigation, playback, learning, and classroom commands deterministically', () => {
    expect(routeGlobalVoiceCommand('VAAK, go home.')).toEqual({ type: 'go_home' });
    expect(routeGlobalVoiceCommand('Open my classes.')).toEqual({ type: 'open_classes' });
    expect(routeGlobalVoiceCommand('Open the latest class.')).toEqual({ type: 'open_latest_class' });
    expect(routeGlobalVoiceCommand('Open Photosynthesis.')).toEqual({
      type: 'open_class_by_name',
      nameQuery: 'Photosynthesis',
    });
    expect(routeGlobalVoiceCommand('Open my study notes.')).toEqual({ type: 'open_notes' });
    expect(routeGlobalVoiceCommand('Open participation mode.')).toEqual({ type: 'open_participation' });
    expect(routeGlobalVoiceCommand('Where am I?')).toEqual({ type: 'where_am_i' });
    expect(routeGlobalVoiceCommand('What can I do here?')).toEqual({ type: 'what_can_i_do' });
    expect(routeGlobalVoiceCommand('Read my latest notes.')).toEqual({ type: 'read_latest_notes' });
    expect(routeGlobalVoiceCommand('Read the next section.')).toEqual({ type: 'read_next_section' });
    expect(routeGlobalVoiceCommand('Read the previous section.')).toEqual({ type: 'read_previous_section' });
    expect(routeGlobalVoiceCommand('Stop speaking.')).toEqual({ type: 'stop_speaking' });
    expect(routeGlobalVoiceCommand('Pause.')).toEqual({ type: 'pause_speaking' });
    expect(routeGlobalVoiceCommand('Continue.')).toEqual({ type: 'continue_speaking' });
    expect(routeGlobalVoiceCommand('Repeat that.')).toEqual({ type: 'repeat_that' });
    expect(routeGlobalVoiceCommand('Speak slowly.')).toEqual({ type: 'speak_slowly' });
    expect(routeGlobalVoiceCommand('Speak faster.')).toEqual({ type: 'speak_faster' });
    expect(routeGlobalVoiceCommand('VAAK, catch me up on the last two minutes.')).toEqual({
      type: 'catch_me_up',
      windowMinutes: 2,
    });
  });

  it('routes educational questions and follow-up translations', () => {
    expect(routeGlobalVoiceCommand('What did my teacher explain about chlorophyll?')).toEqual({
      type: 'ask_lecture',
      question: 'What did my teacher explain about chlorophyll',
    });

    expect(
      routeGlobalVoiceCommand('Explain that in Telugu.', { hasPreviousAnswer: true })
    ).toEqual({
      type: 'translate_previous_answer',
      targetLanguage: 'te',
    });
  });
});
