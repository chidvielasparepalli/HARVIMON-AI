import test from "node:test";
import assert from "node:assert/strict";
import { INPUT_SAMPLE_RATE, downsampleFloat32, float32ToPcm16Bytes, resampleToInputPcm16 } from "../src/voice/audio.js";

test("downsampleFloat32 converts 48k audio to 16k", () => {
  const input = new Float32Array(480);
  const output = downsampleFloat32(input, 48000, 16000);
  assert.equal(output.length, 160);
});

test("same-rate conversion preserves length", () => {
  const input = new Float32Array([0, 0.5, -0.5, 1]);
  const output = downsampleFloat32(input, INPUT_SAMPLE_RATE, INPUT_SAMPLE_RATE);
  assert.deepEqual(Array.from(output), Array.from(input));
});

test("PCM16 conversion clamps samples", () => {
  const bytes = float32ToPcm16Bytes(new Float32Array([-2, -1, 0, 1, 2]));
  const values = Array.from(new Int16Array(bytes.buffer));
  assert.equal(values[0], -32768);
  assert.equal(values[1], -32768);
  assert.equal(values[2], 0);
  assert.equal(values[3], 32767);
  assert.equal(values[4], 32767);
});

test("resample helper returns Gemini input MIME type", () => {
  const result = resampleToInputPcm16(new Float32Array(480), 48000);
  assert.equal(result.bytes.length, 160 * 2);
  assert.equal(result.mimeType, "audio/pcm;rate=16000");
});