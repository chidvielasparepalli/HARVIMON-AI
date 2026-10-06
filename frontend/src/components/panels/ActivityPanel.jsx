<<<<<<< HEAD
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Mic2
} from "lucide-react";

const activity = [
  [
    Mic2,
    "Voice session",
    "Today • 10:42 AM"
  ],
  [
    ArrowUpRight,
    "Opened VS Code",
    "Today • 10:35 AM"
  ],
  [
    CheckCircle2,
    "Saved preference",
    "Yesterday • 6:18 PM"
  ]
];

export default function ActivityPanel() {
  return (
    <section className="panel activity-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            RECENT ACTIVITY
          </span>

          <h2>
            What HARVIMON has been doing
          </h2>
        </div>

        <Clock3 size={17} />
      </div>

      <div className="activity-list">
        {activity.map(([Icon, title, meta]) => (
          <div
            className="activity-row"
            key={title}
          >
            <div className="activity-icon">
              <Icon size={15} />
            </div>

            <div>
              <strong>{title}</strong>
              <span>{meta}</span>
            </div>

            <em>Completed</em>
          </div>
        ))}
      </div>
    </section>
  );
}
=======
import { ArrowUpRight, CheckCircle2, Clock3, Mic2 } from "lucide-react";
const activity=[[Mic2,"Voice session","Today • 10:42 AM"],[ArrowUpRight,"Opened VS Code","Today • 10:35 AM"],[CheckCircle2,"Saved preference","Yesterday • 6:18 PM"]];
export default function ActivityPanel(){return <section className="panel activity-panel"><div className="panel-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>What HARVIMON has been doing</h2></div><Clock3 size={17}/></div><div className="activity-list">{activity.map(([Icon,title,meta])=><div className="activity-row" key={title}><div className="activity-icon"><Icon size={15}/></div><div><strong>{title}</strong><span>{meta}</span></div><em>Completed</em></div>)}</div></section>;}
>>>>>>> 57070ffd59a7a27277d805d90d61ab10b9852f32
