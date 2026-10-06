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