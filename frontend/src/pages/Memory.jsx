import {
  Brain,
  ShieldCheck
} from "lucide-react";

export default function Memory() {
  return (
    <div className="page">
      <span className="eyebrow">
        MEMORY
      </span>

      <h1>Persistent memory</h1>

      <p className="page-subtitle">
        Review what HARVIMON can
        remember between sessions.
      </p>

      <section className="panel empty-state">
        <Brain size={28} />

        <h2>
          Memory management
        </h2>

        <p>
          Memory entries and controls
          will connect to the backend
          memory manager here.
        </p>

        <div className="memory-note">
          <ShieldCheck size={15} />
          Local-first controls
        </div>
      </section>
    </div>
  );
}
