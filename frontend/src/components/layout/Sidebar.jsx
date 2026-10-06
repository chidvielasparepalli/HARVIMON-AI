<<<<<<< HEAD
import { NavLink } from "react-router-dom";

const links = [
  ["/", "Command Center"],
  ["/activity", "Activity"],
  ["/memory", "Memory"],
  ["/settings", "Settings"]
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <strong className="brand-title">
          HARVIMON- AI
          <span className="brand-dot"></span>
        </strong>
      </div>

      <nav className="sidebar-nav">
        {links.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="system-card">
          <div className="system-status">
            <span className="system-eyebrow">SYSTEM ONLINE</span>
            <div className="system-connection">
              <span>Gemini Live connected</span>
              <div className="online-dot" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
=======
import { Activity, Brain, Command, Settings, Sparkles, Wifi } from "lucide-react";
import { NavLink } from "react-router-dom";
const links=[["/","Command Center",Command],["/activity","Activity",Activity],["/memory","Memory",Brain],["/settings","Settings",Settings]];
export default function Sidebar(){return <aside className="sidebar"><div className="brand"><div className="brand-mark"><Sparkles size={17}/></div><div><strong>HARVIMON<span>-AI</span></strong><small>DESKTOP INTELLIGENCE</small></div></div><nav className="sidebar-nav">{links.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==="/"} className={({isActive})=>isActive?"nav-item active":"nav-item"}><Icon size={17} strokeWidth={1.8}/><span>{label}</span></NavLink>)}</nav><div className="sidebar-footer"><div className="system-card"><div className="online-dot"/><div><strong>System Online</strong><span><Wifi size={12}/> Gemini Live</span></div></div><span className="version">v0.1 • AI AGENT</span></div></aside>;}
>>>>>>> 57070ffd59a7a27277d805d90d61ab10b9852f32
