import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createVoiceSocket } from "../services/agentService.js";
import {
  base64ToBytes,
  bytesToBase64,
  float32ToPcm16,
  pcm16ToFloat32,
  resampleLinear,
} from "../audio/pcm.js";

const DEFAULTS = Object.freeze({
  voice: "Kore",
  persona: "warm",
  language: "auto",
});

function getConversationId() {
  const key = "harvimon-conversation-id";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;

    const generated = crypto.randomUUID();
    sessionStorage.setItem(key, generated);
    return generated;
  } catch {
    return crypto.randomUUID();
  }
}

function stopTracks(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

export function useAgentVoice(options = {}) {
  const config = useMemo(() => ({
    ...DEFAULTS,
    ...options,
    conversationId: options.conversationId || getConversationId(),
  }), [
    options.voice,
    options.persona,
    options.language,
    options.conversationId,
  ]);

  const ws = useRef(null);
  const wsGeneration = useRef(0);
  const audioContext = useRef(null);
  const micStream = useRef(null);
  const micSource = useRef(null);
  const processor = useRef(null);
  const playbackNodes = useRef(new Set());
  const nextPlayTime = useRef(0);
  const intentionalClose = useRef(false);

  const [status, setStatus] = useState("offline");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const ensureAudioContext = useCallback(async (sampleRate = 24000) => {
    if (!audioContext.current) {
      audioContext.current = new AudioContext({ sampleRate });
    }

    if (audioContext.current.state === "suspended") {
      await audioContext.current.resume();
    }

    return audioContext.current;
  }, []);

  const flushPlayback = useCallback(() => {
    playbackNodes.current.forEach((node) => {
      try { node.stop(); } catch {}
      try { node.disconnect(); } catch {}
    });
    playbackNodes.current.clear();

    if (audioContext.current) {
      nextPlayTime.current = audioContext.current.currentTime;
    } else {
      nextPlayTime.current = 0;
    }

    setSpeaking(false);
  }, []);

  const stopMicrophone = useCallback((sendEnd = true) => {
    processor.current?.disconnect?.();
    micSource.current?.disconnect?.();
    stopTracks(micStream.current);

    processor.current = null;
    micSource.current = null;
    micStream.current = null;

    setListening(false);

    if (sendEnd && ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "audio_end" }));
    }
  }, []);

  const connect = useCallback(() => {
    if (
      ws.current?.readyState === WebSocket.OPEN ||
      ws.current?.readyState === WebSocket.CONNECTING
    ) {
      return ws.current;
    }

    const generation = wsGeneration.current + 1;
    wsGeneration.current = generation;
    intentionalClose.current = false;
    setStatus("connecting");

    const socket = createVoiceSocket(config);
    ws.current = socket;

    socket.onopen = () => {
      if (generation !== wsGeneration.current) return;
      setStatus("ready");
    };

    socket.onmessage = async (event) => {
      if (generation !== wsGeneration.current) return;

      try {
        const message = JSON.parse(event.data);

        if (message.type === "ready") {
          setStatus("ready");
          return;
        }

        if (message.type === "audio" && message.data) {
          const context = await ensureAudioContext(24000);
          const bytes = base64ToBytes(message.data);
          const pcm = pcm16ToFloat32(bytes);
          const buffer = context.createBuffer(1, pcm.length, 24000);
          buffer.copyToChannel(pcm, 0);

          const node = context.createBufferSource();
          node.buffer = buffer;
          node.connect(context.destination);
          playbackNodes.current.add(node);

          const startTime = Math.max(
            context.currentTime,
            nextPlayTime.current
          );

          node.start(startTime);
          nextPlayTime.current = startTime + buffer.duration;
          setSpeaking(true);

          node.addEventListener("ended", () => {
            playbackNodes.current.delete(node);
            if (
              playbackNodes.current.size === 0 &&
              context.currentTime >= nextPlayTime.current - 0.02
            ) {
              setSpeaking(false);
            }
          }, { once: true });
          return;
        }

        if (message.type === "interrupted") {
          flushPlayback();
          return;
        }

        if (message.type === "closed") {
          setStatus("offline");
          flushPlayback();
          return;
        }

        if (message.type === "error") {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    socket.onclose = () => {
      if (generation !== wsGeneration.current) return;
      ws.current = null;
      setStatus(intentionalClose.current ? "offline" : "offline");
    };

    socket.onerror = () => {
      if (generation !== wsGeneration.current) return;
      setStatus("error");
    };

    return socket;
  }, [config, ensureAudioContext, flushPlayback]);

  const interrupt = useCallback(() => {
    flushPlayback();

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "interrupt" }));
    }
  }, [flushPlayback]);

  const startMicrophone = useCallback(async () => {
    const socket = connect();
    const context = await ensureAudioContext(24000);

    if (context.state === "closed") {
      throw new Error("AudioContext is closed");
    }

    if (!micStream.current) {
      micStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    }

    micSource.current = context.createMediaStreamSource(micStream.current);
    processor.current = context.createScriptProcessor(2048, 1, 1);

    processor.current.onaudioprocess = (event) => {
      if (socket !== ws.current || socket.readyState !== WebSocket.OPEN) return;

      const input = event.inputBuffer.getChannelData(0);
      const resampled = resampleLinear(input, context.sampleRate, 16000);
      const pcm16 = float32ToPcm16(resampled);

      socket.send(JSON.stringify({
        type: "audio",
        data: bytesToBase64(pcm16),
        mimeType: "audio/pcm;rate=16000",
      }));
    };

    micSource.current.connect(processor.current);
    processor.current.connect(context.destination);

    setListening(true);
    return socket;
  }, [connect, ensureAudioContext]);

  const stopMic = useCallback(() => {
    stopMicrophone(true);
  }, [stopMicrophone]);

  const sendText = useCallback((text) => {
    const value = String(text || "").trim();
    if (!value) return;

    const socket = connect();
    const send = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "text",
          text: value,
        }));
      }
    };

    if (socket.readyState === WebSocket.OPEN) {
      send();
    } else {
      socket.addEventListener("open", send, { once: true });
    }
  }, [connect]);

  const disconnect = useCallback(() => {
    intentionalClose.current = true;
    stopMicrophone(false);
    flushPlayback();

    if (ws.current) {
      wsGeneration.current += 1;
      try { ws.current.close(1000, "Voice session ended"); } catch {}
      ws.current = null;
    }
  }, [flushPlayback, stopMicrophone]);

  useEffect(() => {
    return () => {
      intentionalClose.current = true;
      stopMicrophone(false);
      flushPlayback();

      wsGeneration.current += 1;
      try { ws.current?.close(1000, "Voice hook cleanup"); } catch {}
      ws.current = null;

      audioContext.current?.close?.();
      audioContext.current = null;
    };
  }, [flushPlayback, stopMicrophone]);

  return {
    status,
    listening,
    speaking,
    toggleMic: listening ? stopMic : startMicrophone,
    startMicrophone,
    stopMic,
    interrupt,
    disconnect,
    sendText,
    conversationId: config.conversationId,
  };
}
