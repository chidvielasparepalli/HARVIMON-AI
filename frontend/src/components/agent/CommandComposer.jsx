export default function CommandComposer({
  value,
  onChange,
  onSubmit,
  listening,
  onToggleMic
}) {
  return (
    <form
      className="command-composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tell CHIDVI what to do..."
      />

      <div className="composer-actions">
        <button
          type="button"
          className={
            listening
              ? "icon-button active"
              : "icon-button"
          }
          onClick={onToggleMic}
          aria-label="Toggle microphone"
        >
        </button>

        <button
          type="submit"
          className="send-button"
          aria-label="Send command"
        >
        </button>
      </div>
    </form>
  );
}