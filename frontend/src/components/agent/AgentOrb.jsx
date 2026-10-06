export default function AgentOrb({ listening = false }) {
  return (
    <div className={listening ? "agent-orb listening" : "agent-orb"}>
      <svg viewBox="0 0 100 100" className="agent-orb-svg" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="50" cy="50" r="48" />
        <path d="M 50 2 C 70 30, 20 60, 50 98" />
        <path d="M 85 15 L 20 80" />
      </svg>
    </div>
  );
}
