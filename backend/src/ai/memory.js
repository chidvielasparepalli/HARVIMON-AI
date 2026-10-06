const MAX_TURNS = 12;
const MAX_CONTEXT_CHARS = 12000;
const TTL_MS = 30 * 60 * 1000;

function appendTranscript(previous, next) {
  const incoming = String(next || "").trim();
  if (!incoming) return previous;
  if (!previous) return incoming;
  if (incoming === previous) return previous;
  if (incoming.startsWith(previous)) return incoming;
  if (previous.endsWith(incoming)) return previous;
  return (previous + " " + incoming).replace(/\s+/g, " ").trim();
}

function createState() {
  return { user: "", assistant: "", turns: [], touchedAt: Date.now() };
}

export class ConversationMemory {
  #sessions = new Map();

  #getOrCreate(conversationId) {
    this.prune();
    let state = this.#sessions.get(conversationId);

    if (!state) {
      state = createState();
      this.#sessions.set(conversationId, state);
    }

    state.touchedAt = Date.now();
    return state;
  }

  updateUser(conversationId, text) {
    const state = this.#getOrCreate(conversationId);
    state.user = appendTranscript(state.user, text);
  }

  updateAssistant(conversationId, text) {
    const state = this.#getOrCreate(conversationId);
    state.assistant = appendTranscript(state.assistant, text);
  }

  completeTurn(conversationId) {
    const state = this.#getOrCreate(conversationId);

    if (state.user || state.assistant) {
      state.turns.push({ user: state.user, assistant: state.assistant });
      while (state.turns.length > MAX_TURNS) {
        state.turns.shift();
      }
    }

    state.user = "";
    state.assistant = "";
    state.touchedAt = Date.now();
  }

  getContext(conversationId) {
    const state = this.#sessions.get(conversationId);
    if (!state) return "";

    state.touchedAt = Date.now();

    const lines = [];
    for (const turn of state.turns) {
      if (turn.user) lines.push("User: " + turn.user);
      if (turn.assistant) lines.push("HARVIMON: " + turn.assistant);
    }

    return lines.join("\n").slice(-MAX_CONTEXT_CHARS);
  }

  clear(conversationId) {
    this.#sessions.delete(conversationId);
  }

  prune() {
    const now = Date.now();
    for (const [conversationId, state] of this.#sessions) {
      if (now - state.touchedAt > TTL_MS) {
        this.#sessions.delete(conversationId);
      }
    }
  }
}
