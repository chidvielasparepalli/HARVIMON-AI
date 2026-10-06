import {
  bytesToBase64,
  rms,
  resampleToInputPcm16,
} from "./audio.js";

const SPEECH_THRESHOLD = 0.018;
const SPEECH_COOLDOWN_MS = 250;

export class AudioInput {
  constructor({ onChunk, onSpeechStart } = {}) {
    this.onChunk = onChunk;
    this.onSpeechStart = onSpeechStart;
    this.context = null;
    this.stream = null;
    this.source = null;
    this.processor = null;
    this.lastSpeechAt = 0;
  }

  async start() {
    if (this.stream) return;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.context = new AudioContext();

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.source = this.context.createMediaStreamSource(this.stream);
    this.processor = this.context.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (!this.context) return;

      const input = event.inputBuffer.getChannelData(0);
      const now = performance.now();

      if (
        rms(input) >= SPEECH_THRESHOLD &&
        now - this.lastSpeechAt >= SPEECH_COOLDOWN_MS
      ) {
        this.lastSpeechAt = now;
        this.onSpeechStart?.();
      }

      const { bytes, mimeType, sampleRate } = resampleToInputPcm16(
        input,
        this.context.sampleRate
      );

      this.onChunk?.({
        base64: bytesToBase64(bytes),
        mimeType,
        sampleRate,
      });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.context.destination);
  }

  async stop() {
    this.processor?.disconnect();
    this.source?.disconnect();

    this.processor = null;
    this.source = null;

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;

    if (this.context) {
      try {
        await this.context.close();
      } catch {}
    }

    this.context = null;
    this.lastSpeechAt = 0;
  }
}
