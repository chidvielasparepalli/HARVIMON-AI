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
