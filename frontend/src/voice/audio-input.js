import {
  bytesToBase64,
  rms,
  resampleToInputPcm16,
} from "./audio.js";

const SPEECH_START_THRESHOLD = 0.012;
const SPEECH_END_THRESHOLD = 0.008;
const SPEECH_END_DELAY_MS = 700;

export class AudioInput {
  constructor({ onChunk, onSpeechStart, onSpeechEnd } = {}) {
    this.onChunk = onChunk;
    this.onSpeechStart = onSpeechStart;
    this.onSpeechEnd = onSpeechEnd;
    this.context = null;
    this.stream = null;
    this.source = null;
    this.processor = null;
    this.silentOutput = null;
    this.lastSpeechAt = 0;
    this.inSpeech = false;
    this.silenceStartedAt = 0;
  }

  async start() {
    if (this.stream) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access is not supported by this browser");
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioContextClass =
      globalThis.AudioContext || globalThis.webkitAudioContext;

    if (!AudioContextClass) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
      throw new Error("Web Audio API is not supported by this browser");
    }

    this.context = new AudioContextClass();

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.source = this.context.createMediaStreamSource(this.stream);
    this.processor = this.context.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (!this.context) return;

      const input = event.inputBuffer.getChannelData(0);
      const now = performance.now();
      const energy = rms(input);

      if (!this.inSpeech && energy >= SPEECH_START_THRESHOLD) {
        this.inSpeech = true;
        this.silenceStartedAt = 0;
        this.lastSpeechAt = now;
        this.onSpeechStart?.();
      }

      if (!this.inSpeech) return;

      const { bytes, mimeType, sampleRate } = resampleToInputPcm16(
        input,
        this.context.sampleRate
      );

      this.onChunk?.({
        base64: bytesToBase64(bytes),
        mimeType,
        sampleRate,
      });

      if (energy < SPEECH_END_THRESHOLD) {
        if (!this.silenceStartedAt) {
          this.silenceStartedAt = now;
        }

        if (now - this.silenceStartedAt >= SPEECH_END_DELAY_MS) {
          this.inSpeech = false;
          this.silenceStartedAt = 0;
          this.onSpeechEnd?.();
        }
      } else {
        this.silenceStartedAt = 0;
        this.lastSpeechAt = now;
      }
    };

    this.source.connect(this.processor);

    this.silentOutput = this.context.createGain();
    this.silentOutput.gain.value = 0;
    this.processor.connect(this.silentOutput);
    this.silentOutput.connect(this.context.destination);

    this.inSpeech = false;
    this.silenceStartedAt = 0;
  }

  async stop() {
    if (this.inSpeech) {
      this.inSpeech = false;
      this.silenceStartedAt = 0;
      this.onSpeechEnd?.();
    }

    this.processor?.disconnect();
    this.source?.disconnect();

    this.processor = null;
    this.source = null;

    this.silentOutput?.disconnect();
    this.silentOutput = null;

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;

    if (this.context) {
      try {
        await this.context.close();
      } catch {}
    }

    this.context = null;
    this.lastSpeechAt = 0;
    this.inSpeech = false;
    this.silenceStartedAt = 0;
  }
}
