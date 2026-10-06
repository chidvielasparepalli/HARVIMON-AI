import "dotenv/config";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";

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
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const MAX_WS_PAYLOAD = 256 * 1024;
const MAX_TEXT_LENGTH = 4_000;
const MAX_AUDIO_DATA_LENGTH = 200_000;
const MAX_CONNECTIONS = 20;
const RATE_WINDOW_MS = 10_000;
const MAX_MESSAGES_PER_WINDOW = 500;

const GEMINI_VOICES = [
  { name: "Zephyr", style: "Bright" },
  { name: "Puck", style: "Upbeat" },
  { name: "Charon", style: "Informative" },
  { name: "Kore", style: "Firm" },
  { name: "Fenrir", style: "Excitable" },
  { name: "Leda", style: "Youthful" },
  { name: "Orus", style: "Firm" },
  { name: "Aoede", style: "Breezy" },
  { name: "Callirrhoe", style: "Easy-going" },
  { name: "Autonoe", style: "Bright" },
  { name: "Enceladus", style: "Breathy" },
  { name: "Iapetus", style: "Clear" },
  { name: "Umbriel", style: "Easy-going" },
  { name: "Algieba", style: "Smooth" },
  { name: "Despina", style: "Smooth" },
  { name: "Erinome", style: "Clear" },
  { name: "Algenib", style: "Gravelly" },
  { name: "Rasalgethi", style: "Informative" },
  { name: "Laomedeia", style: "Upbeat" },
  { name: "Achernar", style: "Soft" },
  { name: "Alnilam", style: "Firm" },
  { name: "Schedar", style: "Even" },
  { name: "Gacrux", style: "Mature" },
  { name: "Pulcherrima", style: "Forward" },
  { name: "Achird", style: "Friendly" },
  { name: "Zubenelgenubi", style: "Casual" },
  { name: "Vindemiatrix", style: "Gentle" },
  { name: "Sadachbia", style: "Lively" },
  { name: "Sadaltager", style: "Knowledgeable" },
  { name: "Sulafat", style: "Warm" },
];

const VOICE_NAMES = new Set(GEMINI_VOICES.map((voice) => voice.name));

const SYSTEM_INSTRUCTION = `
You are HARVIMON, a voice-first conversational intelligence agent.
Your job is to have natural, useful, context-aware conversations.
Speak naturally and concisely. Do not sound like a command-line assistant.
Understand incomplete sentences, corrections, interruptions, and conversational references.
The user may speak English, Telugu, or mixed Telugu-English. Understand the user's language and respond naturally in the same language.
Never claim to have performed an action unless it actually happened.
This hackathon prototype focuses on conversation quality, context, multilingual voice interaction, and low-latency turn taking.
`;

const app = express();

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      // Browsers send Origin; allow non-browser health checks without an Origin header.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"));
    },
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "harvimon-ai",
    model,
    activeConnections: activeConnections.size,
  });
});

app.get("/api/voices", (_req, res) => {
  res.json({ voices: GEMINI_VOICES });
});

const server = app.listen(port, () => {
  console.log(`HARVIMON backend listening on :${port}`);
  console.log(`Allowed client origins: ${allowedOrigins.join(", ")}`);
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const activeConnections = new Set();

const wss = new WebSocketServer({
  server,
  path: "/ws/voice",
  maxPayload: MAX_WS_PAYLOAD,
  perMessageDeflate: false,
  verifyClient: ({ origin }, done) => {
    if (!origin || allowedOrigins.includes(origin)) {
      done(true);
      return;
    }

    done(false, 403, "Origin not allowed");
  },
});

const sendJson = (socket, payload) => {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(payload));
  }
};

const isValidBase64 = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= MAX_AUDIO_DATA_LENGTH &&
  value.length % 4 === 0 &&
  /^[A-Za-z0-9+/]*={0,2}$/.test(value);

const rejectMessage = (socket, message) => {
  sendJson(socket, { type: "error", message });
};

wss.on("connection", async (socket, request) => {
  if (activeConnections.size >= MAX_CONNECTIONS) {
    rejectMessage(socket, "HARVIMON is currently at connection capacity");
    socket.close(1013, "Server busy");
    return;
  }

  activeConnections.add(socket);

  let session;
  let closed = false;
  let messageCount = 0;
  let rateWindowStart = Date.now();

  const requestedVoice = new URL(
    request.url || "/ws/voice",
    "http://localhost",
  ).searchParams.get("voice");

  const selectedVoice = VOICE_NAMES.has(requestedVoice) ? requestedVoice : "Kore";

  const send = (payload) => sendJson(socket, payload);

  const closeConnection = () => {
    if (closed) return;
    closed = true;
    activeConnections.delete(socket);

    try {
      session?.close();
    } catch {
      // Session may already be closed by Gemini.
    }
  };

  try {
    session = await ai.live.connect({
      model,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: SYSTEM_INSTRUCTION,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => send({ type: "ready", voice: selectedVoice }),
        onmessage: (message) => {
          const content = message.serverContent;

          if (content?.inputTranscription?.text) {
            send({ type: "user_transcript", text: content.inputTranscription.text });
          }

          if (content?.outputTranscription?.text) {
            send({
              type: "assistant_transcript",
              text: content.outputTranscription.text,
            });
          }

          if (content?.modelTurn?.parts) {
            for (const part of content.modelTurn.parts) {
              if (part.inlineData?.data) {
                send({
                  type: "audio",
                  data: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
                });
              }
            }
          }

          if (content?.interrupted) send({ type: "interrupted" });
          if (content?.turnComplete) send({ type: "turn_complete" });
        },
        onerror: (error) => {
          send({
            type: "error",
            message: error?.message || "Live session error",
          });
        },
        onclose: () => {
          send({ type: "closed" });
          closeConnection();
        },
      },
    });
  } catch (error) {
    send({
      type: "error",
      message: error?.message || "Could not start HARVIMON",
    });
    closeConnection();
    socket.close(1011, "Live session unavailable");
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
      rejectMessage(socket, "Too many messages; slow down");
      socket.close(1008, "Rate limit exceeded");
      return;
    }

    try {
      const msg = JSON.parse(raw.toString());

      if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
        rejectMessage(socket, "Message must be a JSON object");
        return;
      }

      if (msg.type === "text") {
        if (typeof msg.text !== "string" || !msg.text.trim()) {
          rejectMessage(socket, "Text message must contain non-empty text");
          return;
        }

        const text = msg.text.trim();
        if (text.length > MAX_TEXT_LENGTH) {
          rejectMessage(socket, `Text must be at most ${MAX_TEXT_LENGTH} characters`);
          return;
        }

        await session.sendRealtimeInput({ text });
        return;
      }

      if (msg.type === "audio") {
        if (!isValidBase64(msg.data)) {
          rejectMessage(socket, "Audio data must be valid base64 within the allowed size");
          return;
        }

        const mimeType =
          typeof msg.mimeType === "string" && msg.mimeType.length <= 100
            ? msg.mimeType
            : "audio/pcm;rate=16000";

        if (!mimeType.startsWith("audio/")) {
          rejectMessage(socket, "Invalid audio mime type");
          return;
        }

        await session.sendRealtimeInput({
          audio: {
            data: msg.data,
            mimeType,
          },
        });
        return;
      }

      if (msg.type === "audio_end") {
        await session.sendRealtimeInput({ audioStreamEnd: true });
        return;
      }

      if (msg.type === "interrupt") {
        // Gemini Live VAD handles interruption natively; the client also stops playback.
        send({ type: "interrupted" });
        return;
      }

      rejectMessage(socket, `Unsupported message type: ${String(msg.type || "unknown")}`);
    } catch (error) {
      console.error("[ws] message handling error:", error);
      send({
        type: "error",
        message: error?.message || "Invalid message",
      });
    }
  });

  socket.on("error", (error) => {
    console.error("[ws] socket error:", error);
    closeConnection();
  });

  socket.on("close", closeConnection);
});

const shutdown = (signal) => {
  console.log(`[server] ${signal} received, shutting down...`);

  for (const socket of activeConnections) {
    try {
      socket.close(1001, "Server shutting down");
    } catch {
      // Ignore sockets that are already closed.
    }
  }

  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });

  setTimeout(() => process.exit(1), 5_000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
