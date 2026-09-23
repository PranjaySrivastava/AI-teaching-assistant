/**
 * AssemblyAI Real-Time Streaming WebSocket Client
 * Captures microphone audio using the Web Audio API, downsamples and encodes to 16-bit linear PCM,
 * and streams directly to AssemblyAI's real-time WebSocket.
 */

export interface AssemblyAiStreamCallbacks {
  onPartialTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
  onStateChange?: (isStreaming: boolean) => void;
}

export class AssemblyAiStream {
  private socket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isStreaming = false;

  public getIsStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Request a temporary token from backend and establish WebSocket connection.
   */
  public async start(backendUrl: string, callbacks: AssemblyAiStreamCallbacks = {}): Promise<void> {
    if (this.isStreaming) return;

    // 1. Fetch temporary token from backend
    const tokenRes = await fetch(`${backendUrl}/api/transcribe/token`);
    if (!tokenRes.ok) {
      throw new Error(`Failed to retrieve token from backend: HTTP ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json();
    if (!tokenData.token || tokenData.mode === 'mock' || tokenData.error) {
      throw new Error(
        tokenData.error ||
          'AssemblyAI token not provisioned (no API key configured or mock mode active).'
      );
    }

    const token = tokenData.token;

    // 2. Request microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // 3. Connect to AssemblyAI Universal Streaming v3 WebSocket
    const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&token=${encodeURIComponent(
      token
    )}`;

    return new Promise<void>((resolve, reject) => {
      try {
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          this.isStreaming = true;
          callbacks.onStateChange?.(true);

          // 4. Start Web Audio streaming pipeline at 16kHz PCM
          this.startAudioStreaming();
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // AssemblyAI v3 Universal Streaming format
            if (data.type === 'Turn') {
              const text = data.transcript || '';
              if (data.end_of_turn) {
                callbacks.onFinalTranscript?.(text);
              } else {
                callbacks.onPartialTranscript?.(text);
              }
            } else if (data.message_type === 'PartialTranscript') {
              callbacks.onPartialTranscript?.(data.text || '');
            } else if (data.message_type === 'FinalTranscript') {
              callbacks.onFinalTranscript?.(data.text || '');
            } else if (data.type === 'Termination' || data.message_type === 'SessionTerminated') {
              this.cleanup();
            }
          } catch (err) {
            console.warn('Error parsing AssemblyAI WebSocket message:', err);
          }
        };

        this.socket.onerror = (err) => {
          console.warn('AssemblyAI WebSocket error:', err);
          const error = new Error('AssemblyAI streaming WebSocket error');
          callbacks.onError?.(error);
          this.cleanup();
          reject(error);
        };

        this.socket.onclose = () => {
          this.cleanup();
          callbacks.onStateChange?.(false);
        };
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  /**
   * Convert audio stream to 16kHz 16-bit PCM and send to WebSocket
   */
  private startAudioStreaming() {
    if (!this.mediaStream) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx({ sampleRate: 16000 });

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    // Buffer size 4096 gives ~256ms chunk latency at 16kHz
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isStreaming || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);
      // Convert Float32 to 16-bit signed PCM
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      this.socket.send(pcm16.buffer);
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  /**
   * Gracefully stop recording and terminate AssemblyAI session
   */
  public stop(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: 'Terminate' }));
      } catch {}
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isStreaming = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.socket) {
      if (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      ) {
        this.socket.close();
      }
      this.socket = null;
    }
  }
}

export const assemblyAiStream = new AssemblyAiStream();
