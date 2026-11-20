export interface CapturedAudioSegment {
  wavBlob: Blob;
  base64Wav: string;
  mimeType: 'audio/wav';
  audioUrl: string;
  durationMs: number;
  rmsLevel: number;
}

export interface MicrophoneControllerOptions {
  onWaveform: (levels: number[], rms: number) => void;
  onSegmentCaptured: (segment: CapturedAudioSegment) => void;
  onError: (message: string, code: 'permission_denied' | 'no_microphone' | 'audio_error') => void;
  onStateChange: (listening: boolean) => void;
}

const TARGET_SAMPLE_RATE = 16000;

function downsampleTo16k(buffer: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === TARGET_SAMPLE_RATE) {
    const out = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }
  const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    const avg = count > 0 ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, avg));
    result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function encodeWavFromPcm16(samples: Int16Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    view.setInt16(offset, samples[i], true);
  }
  return new Blob([view], { type: 'audio/wav' });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export class MicrophoneCaptureSession {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private rafId: number | null = null;

  private pcmChunks: Float32Array[] = [];
  private speechDetected = false;
  private silenceStartMs: number | null = null;
  private segmentStartMs = 0;
  private maxRmsInSegment = 0;
  private isListening = false;
  private isPausedForProcessing = false;

  private opts: MicrophoneControllerOptions;

  constructor(opts: MicrophoneControllerOptions) {
    this.opts = opts;
  }

  public async start(): Promise<boolean> {
    if (this.isListening) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.opts.onError("Ushbu brauzerda mikrofon yozuvi qo'llab-quvvatlanmaydi.", 'no_microphone');
      return false;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        this.opts.onError(
          "Mikrofonga ruxsat berilmadi. Iltimos, brauzer yoki Android sozlamalaridan mikrofon ruxsatini yoqing.",
          'permission_denied'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        this.opts.onError('Qurilmada mikrofon topilmadi.', 'no_microphone');
      } else {
        this.opts.onError("Mikrofon audio oqimini ishga tushirib bo'lmadi.", 'audio_error');
      }
      return false;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;

      this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);
      const silentGain = this.audioCtx.createGain();
      silentGain.gain.value = 0;

      this.resetSegmentBuffer();
      this.isListening = true;
      this.isPausedForProcessing = false;

      this.processor.onaudioprocess = (ev) => {
        if (!this.isListening || this.isPausedForProcessing) return;
        const input = ev.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);

        let sumSq = 0;
        for (let i = 0; i < copy.length; i++) sumSq += copy[i] * copy[i];
        const rms = Math.sqrt(sumSq / copy.length);
        if (rms > this.maxRmsInSegment) this.maxRmsInSegment = rms;

        const now = performance.now();
        // Voice Activity Detection threshold
        if (rms > 0.018) {
          if (!this.speechDetected) {
            this.speechDetected = true;
            this.segmentStartMs = now;
          }
          this.silenceStartMs = null;
          this.pcmChunks.push(copy);
        } else if (this.speechDetected) {
          this.pcmChunks.push(copy);
          if (this.silenceStartMs === null) {
            this.silenceStartMs = now;
          } else if (now - this.silenceStartMs >= 1050 && now - this.segmentStartMs >= 450) {
            // Natural pause after reciting phrase -> flush segment automatically
            void this.flushSegment();
          }
        } else {
          // Keep tiny rolling pre-buffer (max 2 chunks) so initial consonant isn't clipped
          this.pcmChunks.push(copy);
          if (this.pcmChunks.length > 2) this.pcmChunks.shift();
        }

        // Max phrase duration guard (8.5s) to ensure prompt feedback
        if (this.speechDetected && now - this.segmentStartMs >= 8500) {
          void this.flushSegment();
        }
      };

      this.source.connect(this.analyser);
      this.source.connect(this.processor);
      this.processor.connect(silentGain);
      silentGain.connect(this.audioCtx.destination);

      this.opts.onStateChange(true);
      this.pumpWaveform();
      return true;
    } catch {
      this.stop();
      this.opts.onError('Audio engine failed to start. Please try again.', 'audio_error');
      return false;
    }
  }

  public setPaused(paused: boolean) {
    this.isPausedForProcessing = paused;
    if (!paused) {
      this.resetSegmentBuffer();
    }
  }

  private resetSegmentBuffer() {
    this.pcmChunks = [];
    this.speechDetected = false;
    this.silenceStartMs = null;
    this.segmentStartMs = performance.now();
    this.maxRmsInSegment = 0;
  }

  public async flushSegment(): Promise<void> {
    if (!this.audioCtx || this.pcmChunks.length === 0 || !this.speechDetected) {
      return;
    }
    const chunks = this.pcmChunks;
    const inputRate = this.audioCtx.sampleRate;
    const durationMs = Math.max(0, performance.now() - this.segmentStartMs);
    const rmsLevel = this.maxRmsInSegment;

    this.resetSegmentBuffer();

    const totalSamples = chunks.reduce((acc, c) => acc + c.length, 0);
    if (totalSamples < inputRate * 0.25) return;

    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    const pcm16 = downsampleTo16k(merged, inputRate);
    const wavBlob = encodeWavFromPcm16(pcm16, TARGET_SAMPLE_RATE);
    const arrayBuffer = await wavBlob.arrayBuffer();
    const base64Wav = arrayBufferToBase64(arrayBuffer);
    const audioUrl = URL.createObjectURL(wavBlob);

    this.opts.onSegmentCaptured({
      wavBlob,
      base64Wav,
      mimeType: 'audio/wav',
      audioUrl,
      durationMs,
      rmsLevel,
    });
  }

  public async stopAndFlush(): Promise<void> {
    if (this.speechDetected) {
      await this.flushSegment();
    }
    this.stop();
  }

  public stop(): void {
    this.isListening = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    if (this.audioCtx) {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
    this.opts.onWaveform(new Array(24).fill(0.06), 0);
    this.opts.onStateChange(false);
  }

  private pumpWaveform = () => {
    if (!this.isListening || !this.analyser) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);

    const bars = 24;
    const step = Math.max(1, Math.floor(data.length / bars));
    const levels: number[] = [];
    let sum = 0;
    for (let i = 0; i < bars; i++) {
      const val = data[i * step] / 255;
      sum += val;
      levels.push(Math.max(0.08, Math.min(1, val * 1.35)));
    }
    this.opts.onWaveform(levels, sum / bars);
    this.rafId = requestAnimationFrame(this.pumpWaveform);
  };
}
