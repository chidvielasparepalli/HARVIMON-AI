import { GoogleGenAI, Modality } from "@google/genai";
import { DEFAULT_VOICE, resolveVoice } from "./voice-catalog.js";
import {
  buildSystemInstruction,
  SUPPORTED_LANGUAGES,
  SUPPORTED_PERSONAS,
} from "./system-prompt.js";

function isOpen(socket) {
  return socket.readyState === 1;
}

function safeSend(socket, payload) {
  if (isOpen(socket)) socket.send(JSON.stringify(payload));
}

function isSupported(value, supportedValues, fallback) {
  return supportedValues.includes(value) ? value : fallback;
}

function assertText(text) {
  if (typeof text !== "string") throw new Error("Text input must be a string");
  const value = text.trim();
  if (!value) throw new Error("Text input cannot be empty");
  if (value.length > 4000) throw new Error("Text input is too long");
  return value;
}

function assertAudio(data) {
  if (typeof data !== "string" || !data) throw new Error("Audio payload must contain base64 data");
  if (data.length > 300000) throw new Error("Audio chunk is too large");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) throw new Error("Audio payload is not valid base64");
  return data;
}

function appendTranscript(previous, next) {
  const incoming = String(next || "").trim();
  if (!incoming) return previous;
  if (!previous) return incoming;
  if (incoming === previous) return previous;
  if (incoming.startsWith(previous)) return incoming;
  if (previous.endsWith(incoming)) return previous;
  return (previous + " " + incoming).replace(/\s+/g, " ").trim();
}

export async function createHarvimonSession({
  apiKey,
  model,
  socket,
  conversationId,
  requestedVoice,
  requestedPersona,
  requestedLanguage,
  memory,
}) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server");

  const ai = new GoogleGenAI({ apiKey });
  const selectedVoice = resolveVoice(requestedVoice);
  const persona = isSupported(requestedPersona, SUPPORTED_PERSONAS, "warm");
  const language = isSupported(requestedLanguage, SUPPORTED_LANGUAGES, "auto");
  const memoryContext = memory?.getContext(conversationId) || "";

  let currentUserTranscript = "";
  let currentAssistantTranscript = "";
  const pushEvent = (payload) => safeSend(socket, payload);

  const session = await ai.live.connect({
    model,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: buildSystemInstruction({ persona, language, memoryContext }),
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: true,
        },
      },
    },
    callbacks: {
      onopen: () => pushEvent({
        type: "ready", conversationId, voice: selectedVoice, persona, language, model,
      }),
      onmessage: (message) => {
        const content = message.serverContent;
        if (!content) return;

        const inputText = content.inputTranscription?.text;
        if (inputText) {
          currentUserTranscript = appendTranscript(currentUserTranscript, inputText);
          memory?.updateUser(conversationId, inputText);
          pushEvent({ type: "user_transcript", text: inputText });
        }

        const outputText = content.outputTranscription?.text;
        if (outputText) {
          currentAssistantTranscript = appendTranscript(currentAssistantTranscript, outputText);
          memory?.updateAssistant(conversationId, outputText);
          pushEvent({ type: "assistant_transcript", text: outputText });
        }

        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            const audioData = part.inlineData?.data;
            if (!audioData) continue;
            pushEvent({
              type: "audio",
              data: audioData,
              mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
            });
          }
        }

        if (content.interrupted) pushEvent({ type: "interrupted" });

        if (content.turnComplete) {
          pushEvent({ type: "turn_complete" });
          if (currentUserTranscript || currentAssistantTranscript) {
            memory?.completeTurn(conversationId);
          }
          currentUserTranscript = "";
          currentAssistantTranscript = "";
        }
      },
      onerror: (error) => pushEvent({
        type: "error", message: error?.message || "Gemini Live session error",
      }),
      onclose: (event) => pushEvent({
        type: "closed", reason: event?.reason || "Live session closed",
      }),
    },
  });

  return {
    voice: selectedVoice,
    persona,
    language,
    sendText(text) {
      return session.sendRealtimeInput({ text: assertText(text) });
    },
    sendAudio(data, mimeType = "audio/pcm;rate=16000") {
      return session.sendRealtimeInput({
        audio: { data: assertAudio(data), mimeType },
      });
    },
    activityStart() {
      return session.sendRealtimeInput({ activityStart: {} });
    },
    activityEnd() {
      return session.sendRealtimeInput({ activityEnd: {} });
    },
    endAudio() {
      return session.sendRealtimeInput({ audioStreamEnd: true });
    },
    close() {
      try { session.close(); } catch {}
    },
    markClientInterrupted() {
      pushEvent({ type: "interrupted" });
    },
  };
}

export { DEFAULT_VOICE };