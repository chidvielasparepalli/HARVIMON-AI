<<<<<<< HEAD
const actions = [
  "Open app",
  "Search web",
  "Remember this",
  "Run a task"
];

export default function QuickActions({ onAction }) {
  return (
    <div className="quick-actions">
      {actions.map((label) => (
        <button
          key={label}
          className="quick-action"
          onClick={() => onAction(label)}
        >
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
=======
import { Globe, MonitorUp, Plus, Search } from "lucide-react";
const actions=[["Open app",MonitorUp],["Search web",Globe],["Remember this",Plus],["Run a task",Search]];
export default function QuickActions({onAction}){return <div className="quick-actions">{actions.map(([label,Icon])=><button key={label} className="quick-action" onClick={()=>onAction(label)}><Icon size={16}/><span>{label}</span></button>)}</div>;}
>>>>>>> 57070ffd59a7a27277d805d90d61ab10b9852f32
