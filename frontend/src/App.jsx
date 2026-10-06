import React, { useEffect, useRef, useState } from "react";
import { AudioInput } from "./voice/audio-input.js";
import { AudioOutputQueue } from "./voice/audio-output.js";
import { VoiceSession } from "./voice/session.js";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const VOICE_CONFIG = Object.freeze({ persona: "warm", language: "auto" });

export default function App() {
  const voiceSession = useRef(null);
  const audioInput = useRef(null);
  const audioOutput = useRef(null);
  const userTranscriptRef = useRef("");
  const assistantTranscriptRef = useRef("");

  const [status, setStatus] = useState("offline");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [userText, setUserText] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [messages, setMessages] = useState([]);
  const [voices, setVoices] = useState([]);
  const [voice, setVoice] = useState("Kore");

  useEffect(() => {
    fetch(API + "/api/voices")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load voice catalog");
        return res.json();
      })
      .then((data) => {
        setVoices(data.voices || []);
        setVoice(data.defaultVoice || "Kore");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const session = new VoiceSession({
      apiBaseUrl: API,
      config: { ...VOICE_CONFIG, voice },
      onEvent: handleVoiceEvent,
    });

    voiceSession.current = session;
    audioInput.current = new AudioInput({
      onChunk: ({ base64, mimeType }) => {
        session.sendAudio(base64, mimeType).catch(() => {});
      },
    });
    audioOutput.current = new AudioOutputQueue();

    return () => {
      audioInput.current?.stop();
      audioOutput.current?.close();
      session.close();
      voiceSession.current = null;
    };
  }, []);

  function handleVoiceEvent(event) {
    switch (event.type) {
      case "socket_open":
        setStatus("connected");
        break;
      case "ready":
        setStatus("ready");
        break;
      case "socket_error":
      case "error":
        setStatus("error");
        break;
      case "socket_close":
        setSpeaking(false);
        if (!event.intentional) setStatus("offline");
        break;
      case "user_transcript":
        userTranscriptRef.current = appendTranscript(userTranscriptRef.current, event.text);
        setUserText(userTranscriptRef.current);
        if (speaking) {
          audioOutput.current?.flush();
          voiceSession.current?.interrupt();
          setSpeaking(false);
        }
        break;
      case "assistant_transcript":
        assistantTranscriptRef.current = appendTranscript(assistantTranscriptRef.current, event.text);
        setAssistantText(assistantTranscriptRef.current);
        setSpeaking(true);
        break;
      case "audio":
        setSpeaking(true);
        audioOutput.current?.playBase64Pcm(event.data).catch(() => {});
        break;
      case "interrupted":
        setSpeaking(false);
        audioOutput.current?.flush();
        break;
      case "turn_complete":
        commitCurrentTurn();
        setSpeaking(false);
        break;
      case "closed":
        setSpeaking(false);
        break;
      default:
        break;
    }
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

  function commitCurrentTurn() {
    const user = userTranscriptRef.current.trim();
    const assistant = assistantTranscriptRef.current.trim();
    if (user || assistant) {
      setMessages((items) => {
        const next = [...items];
        if (user) next.push({ role: "user", text: user });
        if (assistant) next.push({ role: "assistant", text: assistant });
        return next;
      });
    }
    userTranscriptRef.current = "";
    assistantTranscriptRef.current = "";
    setUserText("");
    setAssistantText("");
  }

  async function ensureSession() {
    const session = voiceSession.current;
    if (!session) throw new Error("Voice session is unavailable");
    await audioOutput.current?.ensureContext();
    await session.connect();
    setStatus("connected");
  }

  async function startMic() {
    try {
      await ensureSession();
      await audioInput.current?.start();
      setListening(true);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      console.error("[voice] failed to start microphone:", error);
    }
  }

  async function stopMic() {
    await audioInput.current?.stop();
    await voiceSession.current?.endAudio();
    setListening(false);
  }

  async function changeVoice(nextVoice) {
    const wasListening = listening;
    setVoice(nextVoice);
    await audioInput.current?.stop();
    await audioOutput.current?.flush();
    voiceSession.current?.updateConfig({ voice: nextVoice });
    if (wasListening) {
      try {
        await voiceSession.current?.connect();
        await audioInput.current?.start();
        setListening(true);
      } catch {
        setStatus("error");
      }
    }
  }

  function interruptAssistant() {
    voiceSession.current?.interrupt();
    audioOutput.current?.flush();
    setSpeaking(false);
  }

  async function sendText() {
    const value = userText.trim();
    if (!value) return;
    try {
      await ensureSession();
      await voiceSession.current.sendText(value);
      setMessages((items) => [...items, { role: "user", text: value }]);
      setUserText("");
      userTranscriptRef.current = "";
    } catch (error) {
      setStatus("error");
      console.error("[voice] failed to send text:", error);
    }
  }

  return (
    <main className="app">
      <section className="shell">
        <header>
          <div>
            <div className="eyebrow">VOICE & CONVERSATIONAL INTELLIGENCE</div>
            <h1>HARVIMON<span>-AI</span></h1>
            <p>Talk naturally. HARVIMON listens, understands context, and responds with voice.</p>
          </div>
          <div className={"status " + status}><i />{status}</div>
        </header>
        <section className="voice-picker">
          <label htmlFor="voice">Gemini Voice</label>
          <select id="voice" value={voice} onChange={(event) => changeVoice(event.target.value)}>
            {voices.map((item) => (
              <option key={item.name} value={item.name}>{item.name} — {item.style}</option>
            ))}
          </select>
        </section>
        <section className="orb-panel">
          <div className={"orb " + (listening ? "listening" : "")}
            onDoubleClick={speaking ? interruptAssistant : undefined}
            role={speaking ? "button" : undefined}
            tabIndex={speaking ? 0 : undefined}
            title={speaking ? "Double-click to interrupt HARVIMON" : undefined}>
            <div className="core" />
          </div>
          <strong>{listening ? "Listening…" : "Ready to talk"}</strong>
          <small>Natural conversation • English • Telugu • Mixed speech</small>
          <button onClick={listening ? stopMic : startMic}>{listening ? "Stop listening" : "Start conversation"}</button>
        </section>
        <section className="conversation">
          {messages.map((message, index) => (
            <div className={'message ' + message.role} key={message.role + '-' + index}>
              <b>{message.role === "user" ? "YOU" : "HARVIMON"}</b>
              <span>{message.text}</span>
            </div>
          ))}
          {userText && <div className="live-line"><b>YOU</b><span>{userText}</span></div>}
          {assistantText && <div className="live-line assistant"><b>HARVIMON</b><span>{assistantText}</span></div>}
        </section>
        <form onSubmit={(event) => { event.preventDefault(); sendText(); }} className="textbar">
          <input value={userText} onChange={(event) => setUserText(event.target.value)} placeholder="Or type naturally…" />
          <button type="submit">Send</button>
        </form>
      </section>
    </main>
  );
}