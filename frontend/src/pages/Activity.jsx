import ActivityPanel from "../components/panels/ActivityPanel.jsx";

export default function Activity() {
  return (
    <div className="page">
      <span className="eyebrow">
        ACTIVITY
      </span>

      <h1>Recent activity</h1>

      <p className="page-subtitle">
        A timeline of commands, tasks
        and agent actions.
      </p>

      <ActivityPanel />
    </div>
  );
}
