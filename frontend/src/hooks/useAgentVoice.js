<<<<<<< HEAD
import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  createVoiceSocket
} from "../services/agentService.js";

export function useAgentVoice() {
  const ws = useRef(null);

  const [status, setStatus] =
    useState("offline");

  const [listening, setListening] =
    useState(false);

  const connect = () => {
    if (
      ws.current?.readyState ===
      WebSocket.OPEN
    ) {
      return;
    }

    setStatus("connecting");

    const socket = createVoiceSocket();

    ws.current = socket;

    socket.onopen = () => {
      setStatus("ready");
    };

    socket.onmessage = (event) => {
      try {
        const message =
          JSON.parse(event.data);

        if (message.type === "ready") {
          setStatus("ready");
        }

        if (message.type === "error") {
          setStatus("error");
        }
      } catch {
        // Ignore malformed messages.
      }
    };

    socket.onclose = () => {
      setStatus("offline");
    };

    socket.onerror = () => {
      setStatus("error");
    };
  };

  const toggleMic = () => {
    if (!listening) {
      connect();
      setListening(true);
      return;
    }

    setListening(false);

    if (
      ws.current?.readyState ===
      WebSocket.OPEN
    ) {
      ws.current.send(
        JSON.stringify({
          type: "audio_end"
        })
      );
    }
  };

  const sendText = (text) => {
    connect();

    const send = () => {
      if (
        ws.current?.readyState ===
        WebSocket.OPEN
      ) {
        ws.current.send(
          JSON.stringify({
            type: "text",
            text
          })
        );
      }
    };

    if (
      ws.current?.readyState ===
      WebSocket.OPEN
    ) {
      send();
    } else {
      ws.current?.addEventListener(
        "open",
        send,
        { once: true }
      );
    }
  };

  useEffect(() => {
    return () => {
      ws.current?.close();
    };
  }, []);

  return {
    status,
    listening,
    toggleMic,
    sendText
  };
}
=======
import { useEffect,useRef,useState } from "react";
import { createVoiceSocket } from "../services/agentService.js";
export function useAgentVoice(){const ws=useRef(null);const [status,setStatus]=useState("offline");const [listening,setListening]=useState(false);const connect=()=>{if(ws.current?.readyState===WebSocket.OPEN)return;setStatus("connecting");const socket=createVoiceSocket();ws.current=socket;socket.onopen=()=>setStatus("ready");socket.onmessage=e=>{const msg=JSON.parse(e.data);if(msg.type==="ready")setStatus("ready");if(msg.type==="error")setStatus("error")};socket.onclose=()=>setStatus("offline");socket.onerror=()=>setStatus("error")};const toggleMic=()=>{if(!listening){connect();setListening(true)}else{setListening(false);ws.current?.send(JSON.stringify({type:"audio_end"}))}};const sendText=text=>{connect();const send=()=>ws.current?.send(JSON.stringify({type:"text",text}));if(ws.current?.readyState===WebSocket.OPEN)send();else ws.current?.addEventListener("open",send,{once:true})};useEffect(()=>()=>ws.current?.close(),[]);return{status,listening,toggleMic,sendText};}
>>>>>>> 57070ffd59a7a27277d805d90d61ab10b9852f32
