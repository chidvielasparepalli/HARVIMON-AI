import test from "node:test";
import assert from "node:assert/strict";
import { GEMINI_VOICES, DEFAULT_VOICE, resolveVoice } from "../src/ai/voice-catalog.js";
import { buildSystemInstruction, SUPPORTED_LANGUAGES, SUPPORTED_PERSONAS } from "../src/ai/system-prompt.js";
import { ConversationMemory } from "../src/ai/memory.js";

test("voice catalog contains the 30 supported prebuilt voices", () => {
  assert.equal(GEMINI_VOICES.length, 30);
  assert.ok(GEMINI_VOICES.some((voice) => voice.name === "Kore"));
});

test("voice resolution falls back safely", () => {
  assert.equal(resolveVoice("Kore"), "Kore");
  assert.equal(resolveVoice("not-a-real-voice"), DEFAULT_VOICE);
});

test("system prompt supports all configured personas and languages", () => {
  for (const persona of SUPPORTED_PERSONAS) {
    assert.match(buildSystemInstruction({ persona }), /HARVIMON/);
  }
  for (const language of SUPPORTED_LANGUAGES) {
    assert.match(buildSystemInstruction({ language }), /Language behavior/);
  }
});

test("conversation memory keeps recent context and can be cleared", () => {
  const memory = new ConversationMemory();
  memory.updateUser("demo", "Naku project idea gurinchi cheppu");
  memory.updateAssistant("demo", "Sure, let us continue from the project.");
  memory.completeTurn("demo");
  const context = memory.getContext("demo");
  assert.match(context, /project idea/);
  assert.match(context, /HARVIMON/);
  memory.clear("demo");
  assert.equal(memory.getContext("demo"), "");
});