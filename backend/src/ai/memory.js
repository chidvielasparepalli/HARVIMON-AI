import fs from "node:fs";
import path from "node:path";

const MAX_TURNS = 50;
const MAX_CONTEXT_CHARS = 12000;
const DEFAULT_MEMORY_FILE = path.resolve(
  process.env.HARVIMON_MEMORY_FILE || path.join(process.cwd(), "data", "conversations.json")
);

function appendTranscript(previous, next) {
  const incoming = String(next || "").trim();
  if (!incoming) return previous;
  if (!previous) return incoming;
  if (incoming === previous) return previous;
  if (incoming.startsWith(previous)) return incoming;
  if (previous.endsWith(incoming)) return previous;
  return (previous + " " + incoming).replace(/\s+/g, " ").trim();
}

function createState(input = {}) {
  return {
    user: String(input.user || ""),
    assistant: String(input.assistant || ""),
    turns: Array.isArray(input.turns)
      ? input.turns
          .slice(-MAX_TURNS)
          .map((turn) => ({
            user: String(turn?.user || ""),
            assistant: String(turn?.assistant || ""),
          }))
      : [],
    touchedAt: Number.isFinite(input.touchedAt) ? input.touchedAt : Date.now(),
  };
}

export class ConversationMemory {
  #sessions = new Map();

  constructor({ filePath = DEFAULT_MEMORY_FILE } = {}) {
    this.filePath = filePath;
    this.#load();
  }

  #load() {
    try {
      if (!fs.existsSync(this.filePath)) return;

      const raw = fs.readFileSync(this.filePath, "utf8");
      if (!raw.trim()) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      for (const [conversationId, state] of Object.entries(parsed)) {
        this.#sessions.set(conversationId, createState(state));
      }
    } catch (error) {
      console.warn("[memory] Could not load persistent memory:", error?.message || error);
    }
  }

  #persist() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

      const snapshot = Object.fromEntries(this.#sessions.entries());
      const tempPath = this.filePath + ".tmp";

      fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), "utf8");
      fs.renameSync(tempPath, this.filePath);
    } catch (error) {
      console.warn("[memory] Could not persist memory:", error?.message || error);
    }
  }

  #getOrCreate(conversationId) {
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
    this.#persist();
  }

  updateAssistant(conversationId, text) {
    const state = this.#getOrCreate(conversationId);
    state.assistant = appendTranscript(state.assistant, text);
    this.#persist();
  }

  completeTurn(conversationId) {
    const state = this.#getOrCreate(conversationId);

    if (state.user || state.assistant) {
      state.turns.push({
        user: state.user,
        assistant: state.assistant,
      });

      while (state.turns.length > MAX_TURNS) {
        state.turns.shift();
      }
    }

    state.user = "";
    state.assistant = "";
    state.touchedAt = Date.now();
    this.#persist();
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
    this.#persist();
  }

  size() {
    return this.#sessions.size;
  }
}
