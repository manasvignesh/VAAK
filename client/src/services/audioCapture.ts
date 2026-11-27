export interface AudioCaptureCallbacks {
  onPcmChunk: (pcmBuffer: ArrayBuffer) => void;
  onLevel: (rmsLevel: number) => void;
  onError: (message: string) => void;
}

export class AudioCaptureService {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private muted = false;
  private targetSampleRate = 16000;

  public isSupported(): boolean {
    return Boolean(
      typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function' &&
        typeof AudioContext !== 'undefined'
    );
  }

  public getSampleRate(): number {
    return this.targetSampleRate;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public async start(callbacks: AudioCaptureCallbacks): Promise<void> {
    this.stop();

    if (!this.isSupported()) {
      throw new Error(
        'Your browser does not support microphone audio capture. Use Interactive Demo Mode or a modern Chromium/Firefox/Safari browser.'
      );
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        throw new Error(
          'Microphone permission was denied. Allow microphone access in your browser settings, then select Retry Voice Mode.'
        );
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        throw new Error(
          'No microphone was detected on this device. Connect a microphone or use the text command bar.'
        );
      }
      if (name === 'NotReadableError' || name === 'TrackStartError') {
        throw new Error(
          'Your microphone is busy in another application or tab. Close the other audio app and select Retry Voice Mode.'
        );
      }
      throw new Error('Unable to access the microphone. Please check device permissions and retry.');
    }

    this.targetSampleRate = 16000;
    this.audioContext = new AudioContext({ sampleRate: this.targetSampleRate });
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.targetSampleRate = this.audioContext.sampleRate;
    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
      if (this.muted) {
        callbacks.onLevel(0);
        return;
      }

      const input = event.inputBuffer.getChannelData(0);
      let sumSquares = 0;
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const sample = Math.max(-1, Math.min(1, input[i]));
        sumSquares += sample * sample;
        pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      const rms = Math.sqrt(sumSquares / input.length);
      callbacks.onLevel(Math.min(1, rms * 4));
      callbacks.onPcmChunk(pcm.buffer);
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
  }

  public stop(): void {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
    this.muted = false;
  }
}
