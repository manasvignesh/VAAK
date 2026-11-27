import type { ClientWsMessage, ServerWsMessage, SupportedLanguage } from '../types';

export interface SpeechSocketHandlers {
  onMessage: (msg: ServerWsMessage) => void;
  onUnexpectedClose: () => void;
  onReconnected: () => void;
}

export class SpeechSocketClient {
  private ws: WebSocket | null = null;
  private intentionalClose = false;
  private reconnectAttempts = 0;
  private readonly maxReconnects = 3;
  private currentLanguage: SupportedLanguage = 'multi';
  private currentSampleRate = 16000;
  private handlers: SpeechSocketHandlers | null = null;

  public connect(
    language: SupportedLanguage,
    sampleRate: number,
    handlers: SpeechSocketHandlers
  ): void {
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.currentLanguage = language;
    this.currentSampleRate = sampleRate;
    this.handlers = handlers;
    this.openSocket(false);
  }

  private openSocket(isReconnect: boolean): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/transcribe`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      const startMsg: ClientWsMessage = {
        type: 'start',
        language: this.currentLanguage,
        sampleRate: this.currentSampleRate,
      };
      this.ws?.send(JSON.stringify(startMsg));
      if (isReconnect) {
        this.reconnectAttempts = 0;
        this.handlers?.onReconnected();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerWsMessage;
        this.handlers?.onMessage(msg);
      } catch {
        // ignore malformed frames
      }
    };

    this.ws.onclose = () => {
      if (this.intentionalClose) return;
      this.handlers?.onUnexpectedClose();
      if (this.reconnectAttempts < this.maxReconnects) {
        this.reconnectAttempts += 1;
        setTimeout(() => {
          if (!this.intentionalClose) {
            this.openSocket(true);
          }
        }, 1200 * this.reconnectAttempts);
      }
    };
  }

  public sendAudio(pcmBuffer: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(pcmBuffer);
    }
  }

  public stop(): void {
    this.intentionalClose = true;
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        const stopMsg: ClientWsMessage = { type: 'stop' };
        this.ws.send(JSON.stringify(stopMsg));
      }
      this.ws.close(1000, 'Session ended');
      this.ws = null;
    }
  }
}
