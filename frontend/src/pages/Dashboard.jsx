import { useState } from "react";
import AgentOrb from "../components/agent/AgentOrb.jsx";
import CommandComposer from "../components/agent/CommandComposer.jsx";
import QuickActions from "../components/agent/QuickActions.jsx";
import { useAgentVoice } from "../hooks/useAgentVoice.js";

export default function Dashboard() {
  const [command, setCommand] = useState("");
  const { status, listening, toggleMic, sendText } = useAgentVoice();

  const submit = () => {
    const trimmed = command.trim();
    if (!trimmed) return;
    sendText(trimmed);
    setCommand("");
  };

  return (
    <>
      <header className="topbar">
        <h1>
          Good morning, User
          <span className="topbar-separator">·</span>
          <span className="live-badge">VOICE READY</span>
        </h1>
      </header>

      <div className="dashboard-grid">
        <section className="hero panel">
          <div className="hero-orb-wrapper">
            <AgentOrb listening={listening} />
          </div>

          <h2>Ready for your command</h2>
          <p>
            Voice, vision, memory, desktop control and autonomous tasks — all from one command box.
          </p>

          <CommandComposer
            value={command}
            onChange={setCommand}
            onSubmit={submit}
            listening={listening}
            onToggleMic={toggleMic}
          />

          <QuickActions
            onAction={(label) => setCommand(`${label}: `)}
          />
        </section>

        <aside className="right-column">
          <section className="panel side-panel">
            <h2>Autonomous task</h2>
            <p>No active tasks. Start one from the command box.</p>
          </section>

          <section className="panel side-panel">
            <h2>Agent capabilities</h2>
            <ul className="capability-list-simple">
              <li>Voice + vision</li>
              <li>Persistent memory</li>
              <li>Desktop control</li>
              <li>App builder</li>
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}