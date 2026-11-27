export type SpokenState = 'idle' | 'speaking' | 'paused' | 'stopped' | 'error';

export class SpokenResponseService {
  private lastUtteranceText = '';
  private lastLang: 'en-IN' | 'hi-IN' | 'te-IN' = 'en-IN';
  private rate = 1.0;
  private speechGen = 0;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public getRate(): number {
    return this.rate;
  }

  public setRate(nextRate: number): number {
    this.rate = Math.max(0.7, Math.min(1.4, Number(nextRate.toFixed(2))));
    return this.rate;
  }

  public isVoiceAvailableForLanguage(lang: 'en-IN' | 'hi-IN' | 'te-IN'): boolean {
    if (!this.isSupported()) return false;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return true; // Voices may load lazily
    const prefix = lang.slice(0, 2).toLowerCase();
    return voices.some((v) => v.lang.toLowerCase().startsWith(prefix));
  }

  public speak(
    text: string,
    options: {
      lang?: 'en-IN' | 'hi-IN' | 'te-IN';
      rate?: number;
      onStateChange?: (state: SpokenState, detail?: string) => void;
    } = {}
  ): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    this.lastUtteranceText = trimmed;
    const lang = options.lang ?? this.lastLang;
    this.lastLang = lang;
    if (typeof options.rate === 'number') {
      this.setRate(options.rate);
    }

    if (!this.isSupported()) {
      options.onStateChange?.('error', 'Browser speech synthesis is unavailable; response shown visually.');
      return;
    }

    this.speechGen += 1;
    const myGen = this.speechGen;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = lang;
    utterance.rate = this.rate;

    const voices = window.speechSynthesis.getVoices();
    const match =
      voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
    if (match) utterance.voice = match;

    utterance.onstart = () => {
      if (myGen === this.speechGen) options.onStateChange?.('speaking');
    };
    utterance.onpause = () => {
      if (myGen === this.speechGen) options.onStateChange?.('paused');
    };
    utterance.onresume = () => {
      if (myGen === this.speechGen) options.onStateChange?.('speaking');
    };
    utterance.onend = () => {
      if (myGen === this.speechGen) options.onStateChange?.('idle');
    };
    utterance.onerror = (e) => {
      if (myGen !== this.speechGen) return;
      if (e.error === 'canceled' || e.error === 'interrupted') {
        options.onStateChange?.('stopped');
      } else {
        options.onStateChange?.('error', `Speech error (${e.error}); response shown visually.`);
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  public pause(): void {
    if (this.isSupported() && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  public resume(): void {
    if (this.isSupported() && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  public stop(): void {
    this.speechGen += 1;
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  public repeatLast(onStateChange?: (state: SpokenState, detail?: string) => void): boolean {
    if (!this.lastUtteranceText) return false;
    this.speak(this.lastUtteranceText, { lang: this.lastLang, onStateChange });
    return true;
  }
}
