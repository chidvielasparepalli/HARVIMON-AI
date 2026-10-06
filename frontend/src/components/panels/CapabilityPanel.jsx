<<<<<<< HEAD
import {
  Brain,
  Eye,
  Monitor,
  Wrench
} from "lucide-react";

const capabilities = [
  [
    Eye,
    "Voice + vision",
    "Multimodal understanding"
  ],
  [
    Brain,
    "Persistent memory",
    "Context across sessions"
  ],
  [
    Monitor,
    "Desktop control",
    "Apps, files & browser"
  ],
  [
    Wrench,
    "App builder",
    "Build and verify apps"
  ]
];

export default function CapabilityPanel() {
  return (
    <section className="panel capabilities-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            CAPABILITIES
          </span>

          <h2>What I can do</h2>
        </div>
      </div>

      <div className="capability-list">
        {capabilities.map(
          ([Icon, title, text]) => (
            <div
              className="capability"
              key={title}
            >
              <div className="capability-icon">
                <Icon size={16} />
              </div>

              <div>
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
=======
import { Brain, Eye, Monitor, Wrench } from "lucide-react";
const capabilities=[[Eye,"Voice + vision","Multimodal understanding"],[Brain,"Persistent memory","Context across sessions"],[Monitor,"Desktop control","Apps, files & browser"],[Wrench,"App builder","Build and verify apps"]];
export default function CapabilityPanel(){return <section className="panel capabilities-panel"><div className="panel-heading"><div><span className="eyebrow">CAPABILITIES</span><h2>What I can do</h2></div></div><div className="capability-list">{capabilities.map(([Icon,title,text])=><div className="capability" key={title}><div className="capability-icon"><Icon size={16}/></div><div><strong>{title}</strong><span>{text}</span></div></div>)}</div></section>;}
>>>>>>> 57070ffd59a7a27277d805d90d61ab10b9852f32
