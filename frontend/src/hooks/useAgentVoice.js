import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { VoiceSession } from "../voice/session.js";
import { AudioInput } from "../voice/audio-input.js";
import { AudioOutputQueue } from "../voice/audio-output.js";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const DEFAULT_CONFIG = Object.freeze({
  voice: "Kore",
  persona: "warm",
  language: "auto",
});

export function useAgentVoice(options = {}) {
  const config = useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      ...options,
    }),
    [options.voice, options.persona, options.language]
  );

  const sessionRef = useRef(null);
  const inputRef = useRef(null);
  const outputRef = useRef(null);
  const speakingRef = useRef(false);

  const [status, setStatus] = useState("offline");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const flushPlayback = useCallback(async () => {
    await outputRef.current?.flush();
    speakingRef.current = false;
    setSpeaking(false);
  }, []);

  useEffect(() => {
    const session = new VoiceSession({
      apiBaseUrl: API,
      config,
      onEvent: async (event) => {
        switch (event.type) {
          case "socket_open":
            setStatus("connected");
            break;

          case "ready":
            setStatus("ready");
            break;

          case "audio":
            speakingRef.current = true;
            setSpeaking(true);
            try {
              await outputRef.current?.playBase64Pcm(event.data);
            } catch {
              setStatus("error");
            }
            break;

          case "interrupted":
            await flushPlayback();
            break;

          case "turn_complete":
            if (!outputRef.current?.isPlaying) {
              speakingRef.current = false;
              setSpeaking(false);
            }
            break;

          case "closed":
            await flushPlayback();
            break;

          case "socket_close":
            await flushPlayback();
            if (!event.intentional) {
              setStatus("offline");
            }
            break;

          case "socket_error":
          case "error":
            setStatus("error");
            break;

          default:
            break;
        }
      },
    });

    const output = new AudioOutputQueue();

    const input = new AudioInput({
      onSpeechStart: () => {
        if (!speakingRef.current) return;

        session.interrupt();
        void flushPlayback();
      },
      onChunk: ({ base64, mimeType }) => {
        void session.sendAudio(base64, mimeType).catch(() => {
          setStatus("error");
        });
      },
    });

    sessionRef.current = session;
    inputRef.current = input;
    outputRef.current = output;

    return () => {
      void input.stop();
      void output.close();
      session.close();
      sessionRef.current = null;
      inputRef.current = null;
      outputRef.current = null;
    };
  }, [config, flushPlayback]);

  const startMic = useCallback(async () => {
    const session = sessionRef.current;

    if (!session || !inputRef.current || !outputRef.current) {
      setStatus("error");
      return;
    }

    try {
      await outputRef.current.ensureContext();
      await session.connect();
      await inputRef.current.start();
      setListening(true);
      setStatus("ready");
    } catch (error) {
      setListening(false);
      setStatus("error");
      console.error("[voice] failed to start microphone:", error);
    }
  }, []);

  const stopMic = useCallback(async () => {
    try {
      await inputRef.current?.stop();
      await sessionRef.current?.endAudio();
    } finally {
      setListening(false);
    }
  }, []);

  const toggleMic = useCallback(() => {
    if (listening) {
      void stopMic();
    } else {
      void startMic();
    }
  }, [listening, startMic, stopMic]);

  const sendText = useCallback(async (text) => {
    try {
      await outputRef.current?.ensureContext();
      await sessionRef.current?.sendText(text);
    } catch (error) {
      setStatus("error");
      console.error("[voice] failed to send text:", error);
    }
  }, []);

  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt();
    void flushPlayback();
  }, [flushPlayback]);

  return {
    status,
    listening,
    speaking,
    toggleMic,
    startMic,
    stopMic,
    sendText,
    interrupt,
    conversationId: sessionRef.current?.conversationId || null,
  };
}
