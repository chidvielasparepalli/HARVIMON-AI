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
  const {
    autoStart = false,
    voice,
    persona,
    language,
  } = options;

  const config = useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      ...(voice ? { voice } : {}),
      ...(persona ? { persona } : {}),
      ...(language ? { language } : {}),
    }),
    [voice, persona, language]
  );

  const sessionRef = useRef(null);
  const inputRef = useRef(null);
  const outputRef = useRef(null);
  const speakingRef = useRef(false);
  const listeningRef = useRef(false);
  const outboundRef = useRef(Promise.resolve());

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
              await outputRef.current?.playBase64Pcm(
                event.data,
                event.mimeType || "audio/pcm;rate=24000"
              );
            } catch (error) {
              console.error("[voice] audio playback failed:", error);
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
            if (listeningRef.current && !event.intentional) {
              setStatus("reconnecting");
              try {
                await session.connect();
                setStatus("ready");
              } catch (error) {
                console.error("[voice] reconnect failed:", error);
                setStatus("offline");
              }
            } else if (!event.intentional) {
              setStatus("offline");
            }
            break;

          case "socket_error":
          case "error":
            console.error("[voice]", event.message || "Voice session error");
            setStatus("error");
            break;

          default:
            break;
        }
      },
    });

    const output = new AudioOutputQueue();

    const queue = (operation) => {
      const next = outboundRef.current
        .catch(() => {})
        .then(operation);

      outboundRef.current = next.catch(() => {});
      return next;
    };

    const input = new AudioInput({
      onSpeechStart: () => {
        if (speakingRef.current) {
          session.interrupt();
          void flushPlayback();
        }

        queue(() => session.activityStart()).catch((error) => {
          console.error("[voice] failed to start audio activity:", error);
          setStatus("error");
        });
      },
      onSpeechEnd: () => {
        queue(() => session.activityEnd()).catch((error) => {
          console.error("[voice] failed to end audio activity:", error);
          setStatus("error");
        });
      },
      onChunk: ({ base64, mimeType }) => {
        queue(() => session.sendAudio(base64, mimeType)).catch((error) => {
          console.error("[voice] failed to send microphone audio:", error);
          setStatus("error");
        });
      },
    });

    sessionRef.current = session;
    inputRef.current = input;
    outputRef.current = output;

    return () => {
      listeningRef.current = false;
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
    const input = inputRef.current;
    const output = outputRef.current;

    if (!session || !input || !output) {
      setStatus("error");
      return;
    }

    if (listeningRef.current) return;

    try {
      await session.connect();
      await input.start();
      listeningRef.current = true;
      setListening(true);
      setStatus("ready");

      // Create/resume playback after the microphone is live. If the browser
      // blocks autoplay, the AudioOutputQueue unlock listeners will resume it
      // on the first user interaction without stopping the microphone.
      await output.ensureContext();
    } catch (error) {
      listeningRef.current = false;
      setListening(false);
      setStatus("error");
      console.error("[voice] failed to start continuous microphone:", error);
    }
  }, []);

  const stopMic = useCallback(async () => {
    listeningRef.current = false;

    try {
      await inputRef.current?.stop();
      await outboundRef.current.catch(() => {});
      await sessionRef.current?.endAudio();
      await flushPlayback();
    } finally {
      setListening(false);
    }
  }, [flushPlayback]);

  const toggleMic = useCallback(() => {
    if (listeningRef.current) {
      void stopMic();
    } else {
      void startMic();
    }
  }, [startMic, stopMic]);

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

  useEffect(() => {
    if (!autoStart) return undefined;

    const timer = setTimeout(() => {
      void startMic();
    }, 0);

    return () => clearTimeout(timer);
  }, [autoStart, startMic]);

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
