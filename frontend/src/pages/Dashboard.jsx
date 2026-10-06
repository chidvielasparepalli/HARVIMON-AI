import { useState } from "react";
<<<<<<< HEAD
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
=======
import { ChevronRight, CircleDot, ListTodo } from "lucide-react";
import AgentOrb from "../components/agent/AgentOrb.jsx";
import CommandComposer from "../components/agent/CommandComposer.jsx";
import QuickActions from "../components/agent/QuickActions.jsx";
import ActivityPanel from "../components/panels/ActivityPanel.jsx";
import CapabilityPanel from "../components/panels/CapabilityPanel.jsx";
import { useAgentVoice } from "../hooks/useAgentVoice.js";
export default function Dashboard(){const [command,setCommand]=useState("");const {status,listening,toggleMic,sendText}=useAgentVoice();const submit=()=>{if(!command.trim())return;sendText(command.trim());setCommand("");};return <><header className="topbar"><div><span className="eyebrow">COMMAND CENTER</span><h1>Good morning, User <span>✦</span></h1><p>I'm ready when you are. What should we work on?</p></div><div className="live-badge"><CircleDot size={12}/> VOICE READY <span>{status}</span></div></header><div className="dashboard-grid"><section className="hero panel"><div className="hero-label">HARVIMON IS <strong>{listening?"LISTENING":"READY"}</strong></div><AgentOrb listening={listening}/><h2>Your autonomous AI assistant</h2><p>Talk naturally, control your desktop, remember context, and let HARVIMON handle multi-step work.</p><CommandComposer value={command} onChange={setCommand} onSubmit={submit} listening={listening} onToggleMic={toggleMic}/><QuickActions onAction={label=>setCommand(label+": ")}/></section><aside className="right-column"><section className="panel task-card"><div className="panel-heading"><div><span className="eyebrow">AUTONOMOUS TASK</span><h2>Nothing running</h2></div><ListTodo size={17}/></div><p>Give HARVIMON a goal and it can break the work into steps and execute them.</p><button className="text-button">Create a task <ChevronRight size={15}/></button></section><CapabilityPanel/></aside></div><ActivityPanel/></>;}
>>>>>>> 57070ffd59a7a27277d805d90d61ab10b9852f32
