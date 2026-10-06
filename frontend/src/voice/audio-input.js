import {
  INPUT_SAMPLE_RATE,
  bytesToBase64,
  resampleToInputPcm16,
} from "./audio.js";

export class AudioInput {
  constructor({ onChunk }) {
    this.onChunk = onChunk;
    this.context = null;
    this.stream = null;
    this.source = null;
    this.processor = null;
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
      const input = event.inputBuffer.getChannelData(0);
      const { bytes, mimeType } = resampleToInputPcm16(
        input,
        this.context.sampleRate
      );

      this.onChunk?.({
        base64: bytesToBase64(bytes),
        mimeType,
        sampleRate: INPUT_SAMPLE_RATE,
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
  }
}
