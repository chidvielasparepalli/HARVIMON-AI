import { Globe, MonitorUp, Plus, Search } from "lucide-react";
const actions=[["Open app",MonitorUp],["Search web",Globe],["Remember this",Plus],["Run a task",Search]];
export default function QuickActions({onAction}){return <div className="quick-actions">{actions.map(([label,Icon])=><button key={label} className="quick-action" onClick={()=>onAction(label)}><Icon size={16}/><span>{label}</span></button>)}</div>;}
