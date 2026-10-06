import "dotenv/config";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import { ConversationMemory } from "./ai/memory.js";
import { createHarvimonSession } from "./ai/harvimon-engine.js";
import { DEFAULT_VOICE, GEMINI_VOICES } from "./ai/voice-catalog.js";
import { SUPPORTED_LANGUAGES, SUPPORTED_PERSONAS } from "./ai/system-prompt.js";

const app = express();
const configuredOrigin = process.env.CLIENT_ORIGIN || true;

app.use(cors({ origin: configuredOrigin }));
app.use(express.json({ limit: "1mb" }));

const port = Number(process.env.PORT || 5000);
const model = process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live";
const apiKey = process.env.GEMINI_API_KEY || "";
const memory = new ConversationMemory();

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "harvimon-ai",
    aiConfigured: Boolean(apiKey),
    model,
  });
});

app.get("/api/voices", (_req, res) => {
  res.json({
    voices: GEMINI_VOICES,
    defaultVoice: process.env.GEMINI_DEFAULT_VOICE || DEFAULT_VOICE,
    personas: SUPPORTED_PERSONAS,
    languages: SUPPORTED_LANGUAGES,
  });
});

const server = app.listen(port, () => {
  console.log("HARVIMON backend listening on :" + port);
});

const wss = new WebSocketServer({
  server,
  path: "/ws/voice",
  maxPayload: 1_000_000,
});

function safeQueryValue(value, fallback, maxLength = 64) {
  if (typeof value !== "string" || !value) return fallback;
  return value.slice(0, maxLength);
}

function createConversationId(value) {
  const supplied = safeQueryValue(value, "");
  if (!supplied) return randomUUID();
  const sanitized = supplied.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized || randomUUID();
}

wss.on("connection", async (socket, request) => {
  const params = new URL(request.url || "/ws/voice", "http://localhost").searchParams;

  const conversationId = createConversationId(params.get("conversationId"));
  const requestedVoice = safeQueryValue(params.get("voice"), process.env.GEMINI_DEFAULT_VOICE || DEFAULT_VOICE);
  const requestedPersona = safeQueryValue(params.get("persona"), process.env.GEMINI_DEFAULT_PERSONA || "warm");
  const requestedLanguage = safeQueryValue(params.get("language"), process.env.GEMINI_DEFAULT_LANGUAGE || "auto");

  let engine;

  const send = (payload) => {
    if (socket.readyState === 1) socket.send(JSON.stringify(payload));
  };

  try {
    engine = await createHarvimonSession({
      apiKey,
      model,
      socket,
      conversationId,
      requestedVoice,
      requestedPersona,
      requestedLanguage,
      memory,
    });
  } catch (error) {
    send({ type: "error", message: error?.message || "Could not start HARVIMON" });
    socket.close();
    return;
  }

  socket.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "text") {
        engine.sendText(msg.text);
        return;
      }

      if (msg.type === "audio") {
        engine.sendAudio(msg.data, msg.mimeType || "audio/pcm;rate=16000");
        return;
      }

      if (msg.type === "audio_end") {
        engine.endAudio();
        return;
      }

      if (msg.type === "interrupt") {
        engine.markClientInterrupted();
        return;
      }

      if (msg.type === "ping") {
        send({ type: "pong" });
        return;
      }

      send({ type: "error", message: "Unsupported message type" });
    } catch (error) {
      send({ type: "error", message: error?.message || "Invalid message" });
    }
  });

  socket.on("close", () => {
    engine.close();
  });
});