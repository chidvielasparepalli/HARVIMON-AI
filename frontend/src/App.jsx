import React, { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const WS = API.replace(/^http/, "ws") + "/ws/voice";

function base64ToBytes(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function pcm16ToFloat32(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Float32Array(bytes.byteLength / 2);
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
}

function floatToPcm16(float32) {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    out[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return new Uint8Array(out.buffer);
}

export default function App() {
  const ws = useRef(null);
  const audioContext = useRef(null);
  const micStream = useRef(null);
  const processor = useRef(null);
  const source = useRef(null);
  const nextPlayTime = useRef(0);

  const [status, setStatus] = useState("offline");
  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [messages, setMessages] = useState([]);

  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) return;
    setStatus("connecting");
    const socket = new WebSocket(WS);
    ws.current = socket;

    socket.onopen = () => setStatus("connected");
    socket.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "ready") setStatus("ready");
      if (msg.type === "user_transcript") setUserText((v) => v + msg.text);
      if (msg.type === "assistant_transcript") setAssistantText((v) => v + msg.text);
      if (msg.type === "turn_complete") {
        setMessages((items) => {
          const next = [...items];
          if (userText.trim()) next.push({ role: "user", text: userText.trim() });
          if (assistantText.trim()) next.push({ role: "assistant", text: assistantText.trim() });
          return next;
        });
        setUserText(""); setAssistantText("");
      }
      if (msg.type === "interrupted") {
        if (audioContext.current) nextPlayTime.current = audioContext.current.currentTime;
      }
      if (msg.type === "audio") await playPcm(msg.data);
      if (msg.type === "error") setStatus("error");
    };
    socket.onclose = () => setStatus("offline");
    socket.onerror = () => setStatus("error");
  };

  const ensureAudio = async () => {
    if (!audioContext.current) audioContext.current = new AudioContext({ sampleRate: 24000 });
    if (audioContext.current.state === "suspended") await audioContext.current.resume();
  };

  const playPcm = async (base64) => {
    await ensureAudio();
    const pcm = pcm16ToFloat32(base64ToBytes(base64));
    const buffer = audioContext.current.createBuffer(1, pcm.length, 24000);
    buffer.copyToChannel(pcm, 0);
    const node = audioContext.current.createBufferSource();
    node.buffer = buffer;
    node.connect(audioContext.current.destination);
    const start = Math.max(audioContext.current.currentTime, nextPlayTime.current);
    node.start(start);
    nextPlayTime.current = start + buffer.duration;
  };

  const startMic = async () => {
    connect();
    await ensureAudio();
    micStream.current = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });

    source.current = audioContext.current.createMediaStreamSource(micStream.current);
    processor.current = audioContext.current.createScriptProcessor(4096, 1, 1);
    processor.current.onaudioprocess = (event) => {
      if (ws.current?.readyState !== WebSocket.OPEN) return;
      const pcm = floatToPcm16(event.inputBuffer.getChannelData(0));
      ws.current.send(JSON.stringify({
        type: "audio",
        data: btoa(String.fromCharCode(...pcm)),
        mimeType: "audio/pcm;rate=16000"
      }));
    };
    source.current.connect(processor.current);
    processor.current.connect(audioContext.current.destination);
    setListening(true);
  };

  const stopMic = () => {
    processor.current?.disconnect();
    source.current?.disconnect();
    micStream.current?.getTracks().forEach((track) => track.stop());
    processor.current = null;
    source.current = null;
    setListening(false);
    ws.current?.send(JSON.stringify({ type: "audio_end" }));
  };

  const sendText = () => {
    const value = userText.trim();
    if (!value || ws.current?.readyState !== WebSocket.OPEN) return;
    ws.current.send(JSON.stringify({ type: "text", text: value }));
    setMessages((items) => [...items, { role: "user", text: value }]);
    setUserText("");
  };

  useEffect(() => () => {
    stopMic();
    ws.current?.close();
    audioContext.current?.close();
  }, []);

  return (
    <main className="app">
      <section className="shell">
        <header>
          <div>
            <div className="eyebrow">VOICE & CONVERSATIONAL INTELLIGENCE</div>
            <h1>HARVIMON<span>-AI</span></h1>
            <p>Talk naturally. HARVIMON listens, understands context, and responds with voice.</p>
          </div>
          <div className={`status ${status}`}><i />{status}</div>
        </header>

        <section className="orb-panel">
          <div className={`orb ${listening ? "listening" : ""}`}><div className="core" /></div>
          <strong>{listening ? "Listening…" : "Ready to talk"}</strong>
          <small>Natural conversation • English • Telugu • Mixed speech</small>
          <button onClick={listening ? stopMic : startMic}>{listening ? "Stop listening" : "Start conversation"}</button>
        </section>

        <section className="conversation">
          {messages.map((m, i) => <div className={`message ${m.role}`} key={i}><b>{m.role === "user" ? "YOU" : "HARVIMON"}</b><span>{m.text}</span></div>)}
          {userText && <div className="live-line"><b>YOU</b><span>{userText}</span></div>}
          {assistantText && <div className="live-line assistant"><b>HARVIMON</b><span>{assistantText}</span></div>}
        </section>

        <form onSubmit={(e) => { e.preventDefault(); sendText(); }} className="textbar">
          <input value={userText} onChange={(e) => setUserText(e.target.value)} placeholder="Or type naturally…" />
          <button>Send</button>
        </form>
      </section>
    </main>
  );
}
