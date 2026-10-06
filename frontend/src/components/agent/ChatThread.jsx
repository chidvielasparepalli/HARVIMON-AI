import { useEffect, useRef } from "react";

export default function ChatThread({ messages }) {
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!messages || messages.length === 0) return null;

  return (
    <div className="chat-thread">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`chat-bubble chat-bubble--${msg.role}`}
        >
          {msg.role === "ai" && (
            <div className="chat-avatar">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="1.5"/>
                <path d="M12 2 C15 8, 9 12, 12 22" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
          <div className="chat-text">{msg.text}</div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
