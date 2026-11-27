export type TtsStatus = 'idle' | 'speaking' | 'completed' | 'stopped' | 'error';

export interface TtsSpeakOptions {
  text: string;
  lang: 'en-IN' | 'hi-IN' | 'te-IN';
  rate: number;
  onStatusChange: (status: TtsStatus, detail?: string) => void;
}

export class TtsService {
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public speak(options: TtsSpeakOptions): void {
    if (!this.isSupported()) {
      options.onStatusChange(
        'error',
        'Text-to-speech is not supported in this browser. Your question remains visible on screen.'
      );
      return;
    }

    const trimmed = options.text.trim();
    if (!trimmed) {
      options.onStatusChange('error', 'Please enter or select a question before speaking.');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = options.lang;
    utterance.rate = Math.max(0.6, Math.min(1.5, options.rate));

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice =
      voices.find((v) => v.lang.toLowerCase() === options.lang.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(options.lang.slice(0, 2).toLowerCase()));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    let finished = false;
    utterance.onstart = () => {
      options.onStatusChange('speaking', 'Speaking question aloud...');
    };
    utterance.onend = () => {
      if (!finished) {
        finished = true;
        options.onStatusChange(
          'completed',
          'Browser confirmed audio playback finished. (Note: playback completion does not confirm the teacher heard or understood.)'
        );
      }
    };
    utterance.onerror = (event) => {
      if (!finished) {
        finished = true;
        if (event.error === 'interrupted' || event.error === 'canceled') {
          options.onStatusChange('stopped', 'Speech playback was stopped.');
        } else {
          options.onStatusChange(
            'error',
            `Speech playback failed (${event.error}). Your question is still displayed on screen.`
          );
        }
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  public stop(onStatusChange?: (status: TtsStatus, detail?: string) => void): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
    onStatusChange?.('stopped', 'Speech playback stopped.');
  }
}
