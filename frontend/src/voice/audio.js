export const INPUT_SAMPLE_RATE = 16000;
export const OUTPUT_SAMPLE_RATE = 24000;

export function downsampleFloat32(input, inputSampleRate, outputSampleRate = INPUT_SAMPLE_RATE) {
  if (!input?.length) return new Float32Array(0);
  if (!Number.isFinite(inputSampleRate) || !Number.isFinite(outputSampleRate)) {
    throw new Error("Invalid audio sample rate");
  }
  if (inputSampleRate <= 0 || outputSampleRate <= 0) {
    throw new Error("Audio sample rates must be positive");
  }
  if (inputSampleRate === outputSampleRate) return new Float32Array(input);
  if (inputSampleRate < outputSampleRate) {
    throw new Error("Input sample rate must be at least the target rate");
  }

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(
      Math.max(start + 1, Math.floor((i + 1) * ratio)),
      input.length
    );

    let sum = 0;
    for (let j = start; j < end; j += 1) {
      sum += input[j];
    }

    output[i] = sum / (end - start);
  }

  return output;
}

export function float32ToPcm16Bytes(samples) {
  const pcm = new Int16Array(samples.length);

  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }

  return new Uint8Array(pcm.buffer);
}

export function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export function pcm16ToFloat32(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(Math.floor(bytes.byteLength / 2));

  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = view.getInt16(i * 2, true) / 32768;
  }

  return samples;
}

export function rms(samples) {
  if (!samples?.length) return 0;

  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    sum += samples[i] * samples[i];
  }

  return Math.sqrt(sum / samples.length);
}

export function resampleToInputPcm16(input, inputSampleRate) {
  const samples = downsampleFloat32(
    input,
    inputSampleRate,
    INPUT_SAMPLE_RATE
  );

  return {
    bytes: float32ToPcm16Bytes(samples),
    mimeType: "audio/pcm;rate=16000",
    sampleRate: INPUT_SAMPLE_RATE,
  };
}
