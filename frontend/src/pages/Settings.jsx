import {
  Settings as SettingsIcon
} from "lucide-react";

export default function Settings() {
  const settings = [
    "Voice & audio",
    "Personality",
    "Memory",
    "Plugins",
    "Advanced"
  ];

  return (
    <div className="page">
      <span className="eyebrow">
        SETTINGS
      </span>

      <h1>Agent settings</h1>

      <p className="page-subtitle">
        Configure voice, personality,
        memory, plugins and advanced
        controls.
      </p>

      <section className="panel settings-list">
        {settings.map((item) => (
          <button key={item}>
            <span>{item}</span>

            <SettingsIcon size={16} />
          </button>
        ))}
      </section>
    </div>
  );
}