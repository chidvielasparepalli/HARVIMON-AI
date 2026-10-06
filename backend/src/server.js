import "dotenv/config";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import { ConversationMemory } from "./ai/memory.js";
import { createHarvimonSession } from "./ai/harvimon-engine.js";
import { DEFAULT_VOICE, GEMINI_VOICES } from "./ai/voice-catalog.js";
import { SUPPORTED_LANGUAGES, SUPPORTED_PERSONAS } from "./ai/system-prompt.js";

const REQUIRED_ENV = ["GEMINI_API_KEY"];
for (const name of REQUIRED_ENV) {
  if (!process.env[name]?.trim()) {
    console.error(`[config] Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("[config] PORT must be an integer between 1 and 65535");
  process.exit(1);
}

const model = process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live";
const apiKey = process.env.GEMINI_API_KEY;
const defaultVoice = process.env.GEMINI_DEFAULT_VOICE || DEFAULT_VOICE;
const defaultPersona = process.env.GEMINI_DEFAULT_PERSONA || "warm";
const defaultLanguage = process.env.GEMINI_DEFAULT_LANGUAGE || "auto";
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

const MAX_WS_PAYLOAD = 1_000_000;
const MAX_CONNECTIONS = 20;
const MAX_QUERY_LENGTH = 128;
const RATE_WINDOW_MS = 10_000;
const MAX_MESSAGES_PER_WINDOW = 500;

const app = express();
app.disable("x-powered-by");
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  },
}));
app.use(express.json({ limit: "1mb" }));

const memory = new ConversationMemory();
const activeConnections = new Set();

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "harvimon-ai",
    aiConfigured: Boolean(apiKey),
    model,
    activeConnections: activeConnections.size,
  });
});

app.get("/api/voices", (_req, res) => {
  res.json({
    voices: GEMINI_VOICES,
    defaultVoice,
    personas: SUPPORTED_PERSONAS,
    languages: SUPPORTED_LANGUAGES,
  });
});

const server = app.listen(port, () => {
  console.log(`HARVIMON backend listening on :${port}`);
});

const wss = new WebSocketServer({
  server,
  path: "/ws/voice",
  maxPayload: MAX_WS_PAYLOAD,
  perMessageDeflate: false,
  verifyClient: ({ origin }, done) => {
    if (!origin || allowedOrigins.includes(origin)) return done(true);
    return done(false, 403, "Origin not allowed");
  },
});

function queryValue(params, name, fallback) {
  const value = params.get(name);
  if (!value) return fallback;
  return value.slice(0, MAX_QUERY_LENGTH);
}

function createConversationId(params) {
  const supplied = queryValue(params, "conversationId", "");
  if (!supplied) return randomUUID();
  const sanitized = supplied.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized || randomUUID();
}

wss.on("connection", async (socket, request) => {
  if (activeConnections.size >= MAX_CONNECTIONS) {
    socket.close(1013, "Server busy");
    return;
  }

  activeConnections.add(socket);
  let closed = false;
  let messageCount = 0;
  let rateWindowStart = Date.now();
  let engine;

  const params = new URL(request.url || "/ws/voice", "http://localhost").searchParams;
  const conversationId = createConversationId(params);
  const requestedVoice = queryValue(params, "voice", defaultVoice);
  const requestedPersona = queryValue(params, "persona", defaultPersona);
  const requestedLanguage = queryValue(params, "language", defaultLanguage);

  const send = (payload) => {
    if (socket.readyState === 1) socket.send(JSON.stringify(payload));
  };

  const cleanup = () => {
    if (closed) return;
    closed = true;
    activeConnections.delete(socket);
    try { engine?.close(); } catch {}
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
    cleanup();
    socket.close(1011, "Voice session unavailable");
    return;
  }

  socket.on("message", async (raw) => {
    if (closed) return;

    const now = Date.now();
    if (now - rateWindowStart >= RATE_WINDOW_MS) {
      rateWindowStart = now;
      messageCount = 0;
    }
    messageCount += 1;
    if (messageCount > MAX_MESSAGES_PER_WINDOW) {
      send({ type: "error", message: "Too many messages; slow down" });
      socket.close(1008, "Rate limit exceeded");
      return;
    }

    try {
      const msg = JSON.parse(raw.toString());
      if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
        throw new Error("Message must be a JSON object");
      }

      switch (msg.type) {
        case "text":
          await engine.sendText(msg.text);
          break;
        case "audio":
          await engine.sendAudio(msg.data, msg.mimeType || "audio/pcm;rate=16000");
          break;
        case "audio_end":
          await engine.endAudio();
          break;
        case "activity_start":
          await engine.activityStart();
          break;
        case "activity_end":
          await engine.activityEnd();
          break;
        case "interrupt":
          engine.markClientInterrupted();
          break;
        case "ping":
          send({ type: "pong" });
          break;
        default:
          send({ type: "error", message: "Unsupported message type" });
      }
    } catch (error) {
      console.error("[ws] message handling error:", error);
      send({ type: "error", message: error?.message || "Invalid message" });
    }
  });

  socket.on("error", (error) => {
    console.error("[ws] socket error:", error);
    cleanup();
  });

  socket.on("close", cleanup);
});

const shutdown = (signal) => {
  console.log(`[server] ${signal} received, shutting down...`);
  for (const socket of activeConnections) {
    try { socket.close(1001, "Server shutting down"); } catch {}
  }
  wss.close(() => {
    server.close(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 5000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
