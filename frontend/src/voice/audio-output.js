import {
  OUTPUT_SAMPLE_RATE,
  base64ToBytes,
  pcm16ToFloat32,
} from "./audio.js";

function parseSampleRate(mimeType) {
  const match = String(mimeType || "").match(/rate=(\d+)/i);
  const rate = match ? Number(match[1]) : OUTPUT_SAMPLE_RATE;
  return Number.isFinite(rate) && rate > 0 ? rate : OUTPUT_SAMPLE_RATE;
}

export class AudioOutputQueue {
  constructor() {
    this.context = null;
    this.nextPlayTime = 0;
    this.sources = new Set();
    this.unlockHandler = () => {
      if (!this.context) return;
      void this.context.resume();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("pointerdown", this.unlockHandler, {
        passive: true,
      });
      window.addEventListener("keydown", this.unlockHandler, {
        passive: true,
      });
      window.addEventListener("touchstart", this.unlockHandler, {
        passive: true,
      });
    }
  }

  get isPlaying() {
    return this.sources.size > 0;
  }

  async ensureContext() {
    if (!this.context) {
      const AudioContextClass =
        globalThis.AudioContext || globalThis.webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported by this browser");
      }

      this.context = new AudioContextClass({
        sampleRate: OUTPUT_SAMPLE_RATE,
        latencyHint: "interactive",
      });
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    return this.context;
  }

  async playBase64Pcm(base64, mimeType = "audio/pcm;rate=24000") {
    const context = await this.ensureContext();
    const pcm = pcm16ToFloat32(base64ToBytes(base64));

    if (!pcm.length) return;

    const sampleRate = parseSampleRate(mimeType);
    const buffer = context.createBuffer(
      1,
      pcm.length,
      sampleRate
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

    source.addEventListener(
      "ended",
      () => {
        this.sources.delete(source);
      },
      { once: true }
    );
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

    if (typeof window !== "undefined") {
      window.removeEventListener("pointerdown", this.unlockHandler);
      window.removeEventListener("keydown", this.unlockHandler);
      window.removeEventListener("touchstart", this.unlockHandler);
    }

    if (this.context) {
      try {
        await this.context.close();
      } catch {}
    }

    this.context = null;
  }
}
