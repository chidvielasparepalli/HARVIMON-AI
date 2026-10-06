import "dotenv/config";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "harvimon-ai" }));

const port = Number(process.env.PORT || 5000);
const server = app.listen(port, () => console.log(`HARVIMON backend listening on :${port}`));

const wss = new WebSocketServer({ server, path: "/ws/voice" });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live";

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

wss.on("connection", async (socket) => {
  let session;

  const send = (payload) => {
    if (socket.readyState === 1) socket.send(JSON.stringify(payload));
  };

  try {
    session = await ai.live.connect({
      model,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: SYSTEM_INSTRUCTION,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => send({ type: "ready" }),
        onmessage: (message) => {
          const content = message.serverContent;

          if (content?.inputTranscription?.text) {
            send({ type: "user_transcript", text: content.inputTranscription.text });
          }

          if (content?.outputTranscription?.text) {
            send({ type: "assistant_transcript", text: content.outputTranscription.text });
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
        onerror: (error) => send({ type: "error", message: error?.message || "Live session error" }),
        onclose: () => send({ type: "closed" }),
      },
    });
  } catch (error) {
    send({ type: "error", message: error?.message || "Could not start HARVIMON" });
    socket.close();
    return;
  }

  socket.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "text" && msg.text?.trim()) {
        session.sendRealtimeInput({ text: msg.text.trim() });
        return;
      }

      if (msg.type === "audio" && msg.data) {
        session.sendRealtimeInput({
          audio: {
            data: msg.data,
            mimeType: msg.mimeType || "audio/pcm;rate=16000",
          },
        });
        return;
      }

      if (msg.type === "audio_end") {
        session.sendRealtimeInput({ audioStreamEnd: true });
        return;
      }

      if (msg.type === "interrupt") {
        // Gemini Live VAD handles interruption natively; the client also stops playback.
        send({ type: "interrupted" });
      }
    } catch (error) {
      send({ type: "error", message: error?.message || "Invalid message" });
    }
  });

  socket.on("close", () => {
    try { session?.close(); } catch {}
  });
});
