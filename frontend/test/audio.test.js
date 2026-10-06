import test from "node:test";
import assert from "node:assert/strict";

import {
  INPUT_SAMPLE_RATE,
  OUTPUT_SAMPLE_RATE,
  downsampleFloat32,
  float32ToPcm16Bytes,
  resampleToInputPcm16,
  rms,
} from "../src/voice/audio.js";

test("voice pipeline uses Gemini input/output sample rates", () => {
  assert.equal(INPUT_SAMPLE_RATE, 16000);
  assert.equal(OUTPUT_SAMPLE_RATE, 24000);
});

test("downsampleFloat32 converts 48 kHz to 16 kHz", () => {
  const input = new Float32Array(480);
  const output = downsampleFloat32(input, 48000, 16000);
  assert.equal(output.length, 160);
});

test("same-rate conversion preserves the samples", () => {
  const input = new Float32Array([0, 0.5, -0.5, 1]);
  const output = downsampleFloat32(input, 16000, 16000);
  assert.deepEqual(Array.from(output), Array.from(input));
});

test("PCM16 conversion clamps signed samples correctly", () => {
  const bytes = float32ToPcm16Bytes(
    new Float32Array([-2, -1, 0, 1, 2])
  );
  const values = Array.from(new Int16Array(bytes.buffer));

  assert.equal(values[0], -32768);
  assert.equal(values[1], -32768);
  assert.equal(values[2], 0);
  assert.equal(values[3], 32767);
  assert.equal(values[4], 32767);
});

test("microphone output is declared as actual 16 kHz PCM", () => {
  const result = resampleToInputPcm16(
    new Float32Array(480),
    48000
  );

  assert.equal(result.bytes.length, 320);
  assert.equal(result.sampleRate, 16000);
  assert.equal(result.mimeType, "audio/pcm;rate=16000");
});

test("RMS distinguishes silence from non-zero energy", () => {
  assert.equal(rms(new Float32Array(32)), 0);
  assert.ok(rms(new Float32Array(32).fill(0.2)) > 0.1);
});
