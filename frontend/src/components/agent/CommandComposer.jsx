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
        placeholder="Tell me what to do..."
      />

      <div className="composer-actions">
        {/* Chain / Attach button */}
        <button
          type="button"
          className="icon-button"
          aria-label="Attach link"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.0607 8.11097L14.4749 6.69676C15.2561 5.91571 16.5224 5.91571 17.3034 6.69676C18.0845 7.47781 18.0845 8.74414 17.3034 9.52519L15.8892 10.9394C15.1821 11.6465 14.1213 12.7072C13.3403 13.4883 13.3403 14.7546 14.1213 15.5356C14.9024 16.3167 16.1687 16.3167 16.9498 15.5356L19.7782 12.7072C21.4053 11.0801 21.4053 8.41421 19.7782 6.78711C18.1511 5.16 15.4853 5.16 13.8582 6.78711L12.444 8.20132" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M10.9393 15.889L9.52513 17.3032C8.74408 18.0843 7.47775 18.0843 6.6967 17.3032C5.91565 16.5222 5.91565 15.2558 6.6967 14.4748L8.11091 13.0606C8.81802 12.3535 9.87868 11.2929C10.6597 10.5118 10.6597 9.24549 9.87868 8.46444C9.09763 7.68339 7.8313 7.68339 7.05025 8.46444L4.22183 11.2929C2.59472 12.92 2.59472 15.5858 4.22183 17.2129C5.84894 18.84 8.51472 18.84 10.1418 17.2129L11.556 15.7987" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Paper plane / Send button */}
        <button
          type="submit"
          className="send-button"
          aria-label="Send command"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.7 2.3C21.4 2 21 1.9 20.6 2.1L2.6 9.1C2.2 9.3 2 9.7 2 10.1C2.1 10.5 2.4 10.9 2.8 11L9 12.9L14.5 8.5L10.1 14L12 20.3C12.1 20.7 12.5 21 12.9 21H13C13.4 21 13.7 20.8 13.9 20.4L21.9 3.4C22.1 3 22 2.6 21.7 2.3Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </form>
  );
}
