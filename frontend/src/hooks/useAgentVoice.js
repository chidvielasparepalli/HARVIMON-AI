import {
  useEffect,
  useRef,
  useState
} from "react";

import { createVoiceSocket } from "../services/agentService.js";

export function useAgentVoice() {
  const ws = useRef(null);

  const [status, setStatus] = useState("offline");
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([]);

  const pushMessage = (role, text) => {
    setMessages((prev) => [
      ...prev,
      { role, text, id: Date.now() + Math.random() }
    ]);
  };

  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) return;
    setStatus("connecting");
    const socket = createVoiceSocket();
    ws.current = socket;

    socket.onopen = () => setStatus("ready");

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "ready") setStatus("ready");
        if (message.type === "error") setStatus("error");
        // AI text reply — handle common backend response shapes
        if (
          (message.type === "text" || message.type === "response") &&
          message.text
        ) {
          pushMessage("ai", message.text);
        }
      } catch {
        // Plain-string responses from the backend
        if (typeof event.data === "string" && event.data.trim()) {
          pushMessage("ai", event.data.trim());
        }
      }
    };

    socket.onclose = () => setStatus("offline");
    socket.onerror = () => setStatus("error");
  };

  const toggleMic = () => {
    if (!listening) {
      connect();
      setListening(true);
      return;
    }
    setListening(false);
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "audio_end" }));
    }
  };

  const sendText = (text) => {
    // Immediately echo user message in the thread
    pushMessage("user", text);

    connect();

    const send = () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: "text", text }));
      }
    };

    if (ws.current?.readyState === WebSocket.OPEN) {
      send();
    } else {
      ws.current?.addEventListener("open", send, { once: true });
    }
  };

  useEffect(() => {
    return () => { ws.current?.close(); };
  }, []);

  return { status, listening, messages, toggleMic, sendText };
}
