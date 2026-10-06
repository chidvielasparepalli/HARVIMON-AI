import {
  OUTPUT_SAMPLE_RATE,
  base64ToBytes,
  pcm16ToFloat32,
} from "./audio.js";

export class AudioOutputQueue {
  constructor() {
    this.context = null;
    this.nextPlayTime = 0;
    this.sources = new Set();
  }

  get isPlaying() {
    return this.sources.size > 0;
  }

  async ensureContext() {
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    return this.context;
  }

  async playBase64Pcm(base64) {
    const context = await this.ensureContext();
    const pcm = pcm16ToFloat32(base64ToBytes(base64));

    if (!pcm.length) return;

    const buffer = context.createBuffer(
      1,
      pcm.length,
      OUTPUT_SAMPLE_RATE
    );
    buffer.copyToChannel(pcm, 0);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    const startAt = Math.max(
      context.currentTime,
      this.nextPlayTime
    );

    source.start(startAt);
    this.nextPlayTime = startAt + buffer.duration;
    this.sources.add(source);

    source.addEventListener("ended", () => {
      this.sources.delete(source);
    }, { once: true });
  }

  async flush() {
    if (!this.context) return;

    this.nextPlayTime = this.context.currentTime;

    for (const source of this.sources) {
      try {
        source.stop();
      } catch {}
      try {
        source.disconnect();
      } catch {}
    }

    this.sources.clear();

    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  async close() {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {}
      try {
        source.disconnect();
      } catch {}
    }

    this.sources.clear();
    this.nextPlayTime = 0;

    if (this.context) {
      try {
        await this.context.close();
      } catch {}
    }

    this.context = null;
  }
}
