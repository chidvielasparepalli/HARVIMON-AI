import { createContext, useContext, useState, useEffect } from "react";

const AgentContext = createContext(null);

export function AgentProvider({ children }) {
  // Chat messages persisted to localStorage
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("harvimon_messages") || "[]");
    } catch { return []; }
  });

  // Voice settings
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState(
    localStorage.getItem("harvimon_voice") || "Aoede"
  );

  // Persist messages whenever they change
  useEffect(() => {
    localStorage.setItem("harvimon_messages", JSON.stringify(messages));
  }, [messages]);

  // Persist voice choice
  useEffect(() => {
    localStorage.setItem("harvimon_voice", selectedVoice);
  }, [selectedVoice]);

  const pushMessage = (role, text) => {
    const entry = { role, text, id: Date.now() + Math.random(), ts: new Date().toISOString() };
    setMessages((prev) => [...prev, entry]);
  };

  const clearMemory = () => {
    setMessages([]);
    localStorage.removeItem("harvimon_messages");
  };

  return (
    <AgentContext.Provider value={{
      messages,
      pushMessage,
      clearMemory,
      voiceEnabled, setVoiceEnabled,
      audioEnabled, setAudioEnabled,
      selectedVoice, setSelectedVoice,
    }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  return useContext(AgentContext);
}
