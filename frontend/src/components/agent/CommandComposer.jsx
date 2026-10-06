<<<<<<< HEAD
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
=======
import { ArrowUp, Mic, Paperclip } from "lucide-react";
export default function CommandComposer({value,onChange,onSubmit,listening,onToggleMic}){return <form className="command-composer" onSubmit={e=>{e.preventDefault();onSubmit();}}><div className="composer-icon">✦</div><input value={value} onChange={e=>onChange(e.target.value)} placeholder="Ask HARVIMON anything..."/><div className="composer-actions"><button type="button" className={listening?"icon-button active":"icon-button"} onClick={onToggleMic}><Mic size={18}/></button><button type="button" className="icon-button"><Paperclip size={17}/></button><button type="submit" className="send-button"><ArrowUp size={18}/></button></div></form>;}
>>>>>>> 57070ffd59a7a27277d805d90d61ab10b9852f32
