import type { ClientWsMessage, ServerWsMessage, SupportedLanguage } from '../types';

export interface SpeechCloseInfo {
  code: number;
  reason: string;
}

export interface SpeechSocketHandlers {
  onMessage: (msg: ServerWsMessage) => void;
  onUnexpectedClose: (info: SpeechCloseInfo) => void;
  onReconnectFailed?: (info: SpeechCloseInfo) => void;
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
    this.closeCurrentSocket();
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.currentLanguage = language;
    this.currentSampleRate = sampleRate;
    this.handlers = handlers;
    this.openSocket(false);
  }

  private closeCurrentSocket(): void {
    if (this.ws) {
      const existing = this.ws;
      this.ws = null;
      existing.onopen = null;
      existing.onmessage = null;
      existing.onclose = null;
      existing.onerror = null;
      try {
        if (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING) {
          existing.close(1000, 'Replacing connection');
        }
      } catch {
        // ignore close errors
      }
    }
  }

  private openSocket(isReconnect: boolean): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/transcribe`;
    const socket = new WebSocket(url);
    this.ws = socket;

    socket.onopen = () => {
      if (this.ws !== socket || this.intentionalClose) return;
      const startMsg: ClientWsMessage = {
        type: 'start',
        language: this.currentLanguage,
        sampleRate: this.currentSampleRate,
      };
      socket.send(JSON.stringify(startMsg));
      if (isReconnect) {
        this.reconnectAttempts = 0;
        this.handlers?.onReconnected();
      }
    };

    socket.onmessage = (event) => {
      if (this.ws !== socket) return;
      try {
        const msg = JSON.parse(event.data as string) as ServerWsMessage;
        this.handlers?.onMessage(msg);
      } catch {
        // ignore malformed frames
      }
    };

    socket.onclose = (event) => {
      if (this.ws !== socket || this.intentionalClose) return;
      const info: SpeechCloseInfo = {
        code: event.code,
        reason: event.reason || '',
      };
      this.handlers?.onUnexpectedClose(info);
      if (this.reconnectAttempts < this.maxReconnects) {
        this.reconnectAttempts += 1;
        setTimeout(() => {
          if (!this.intentionalClose && this.ws === socket) {
            this.openSocket(true);
          }
        }, 1200 * this.reconnectAttempts);
      } else {
        this.handlers?.onReconnectFailed?.(info);
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
