import { useEffect, useRef, useState } from "react";
import { useAgent } from "../context/AgentContext.jsx";
import { createVoiceSocket } from "../services/agentService.js";

export function useAgentVoice() {
  const ws = useRef(null);
  const agent = useAgent();
  const pushMessage = agent?.pushMessage || (() => {});
  const selectedVoice = agent?.selectedVoice || "Aoede";
  const messages = agent?.messages || [];

  const [status, setStatus] = useState("offline");
  const [listening, setListening] = useState(false);

  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) return;
    setStatus("connecting");
    const socket = createVoiceSocket(selectedVoice);
    ws.current = socket;

    socket.onopen = () => setStatus("ready");

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "ready") setStatus("ready");
        if (message.type === "error") setStatus("error");
        if (
          (message.type === "text" || message.type === "response") &&
          message.text
        ) {
          pushMessage("ai", message.text);
        }
      } catch {
        if (typeof event.data === "string" && event.data.trim()) {
          pushMessage("ai", event.data.trim());
        }
      }
    };

    socket.onclose = () => setStatus("offline");
    socket.onerror = () => setStatus("error");
  };

  const toggleMic = () => {
    if (!listening) { connect(); setListening(true); return; }
    setListening(false);
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "audio_end" }));
    }
  };

  const sendText = (text) => {
    pushMessage("user", text);
    connect();
    const send = () => {
      if (ws.current?.readyState === WebSocket.OPEN)
        ws.current.send(JSON.stringify({ type: "text", text }));
    };
    if (ws.current?.readyState === WebSocket.OPEN) send();
    else ws.current?.addEventListener("open", send, { once: true });
  };

  useEffect(() => { return () => { ws.current?.close(); }; }, []);

  return { status, listening, messages, toggleMic, sendText };
}
