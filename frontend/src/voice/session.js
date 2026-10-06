const DEFAULTS = Object.freeze({
  voice: "Kore",
  persona: "warm",
  language: "auto",
});

function getConversationId() {
  const storageKey = "harvimon.conversationId";
  const existing = sessionStorage.getItem(storageKey);

  if (existing) return existing;

  const created =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "harvimon-" + Date.now() + "-" + Math.random().toString(36).slice(2);

  sessionStorage.setItem(storageKey, created);
  return created;
}

export class VoiceSession {
  constructor({ apiBaseUrl, onEvent, config = {} }) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
    this.onEvent = onEvent;
    this.config = {
      ...DEFAULTS,
      ...config,
      conversationId: config.conversationId || getConversationId(),
    };
    this.socket = null;
    this.connectPromise = null;
    this.intentionalClose = false;
    this.connectGeneration = 0;
  }

  get conversationId() {
    return this.config.conversationId;
  }

  get isOpen() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  async updateConfig(patch) {
    this.config = { ...this.config, ...patch };

    if (this.isOpen) {
      await this.reconnect();
    }
  }

  buildUrl() {
    const wsBase = this.apiBaseUrl.replace(/^http/, "ws") + "/ws/voice";
    const params = new URLSearchParams({
      voice: this.config.voice,
      persona: this.config.persona,
      language: this.config.language,
      conversationId: this.config.conversationId,
    });

    return wsBase + "?" + params.toString();
  }

  async connect() {
    if (this.isOpen) return;

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.intentionalClose = false;
    const generation = ++this.connectGeneration;

    this.connectPromise = new Promise((resolve, reject) => {
      const socket = new WebSocket(this.buildUrl());
      this.socket = socket;

      const cleanupConnectionPromise = () => {
        this.connectPromise = null;
      };

      socket.onopen = () => {
        if (generation !== this.connectGeneration) {
          socket.close();
          return;
        }

        cleanupConnectionPromise();
        this.emit({ type: "socket_open" });
        resolve();
      };

      socket.onmessage = (event) => {
        try {
          this.emit(JSON.parse(event.data));
        } catch {
          this.emit({
            type: "error",
            message: "Received invalid JSON from voice server",
          });
        }
      };

      socket.onerror = () => {
        cleanupConnectionPromise();
        this.emit({ type: "socket_error" });
        reject(new Error("Voice WebSocket connection failed"));
      };

      socket.onclose = (event) => {
        cleanupConnectionPromise();
        this.emit({
          type: "socket_close",
          code: event.code,
          reason: event.reason,
          intentional: this.intentionalClose,
        });
      };
    });

    try {
      await this.connectPromise;
    } catch (error) {
      this.connectPromise = null;
      throw error;
    }
  }

  async reconnect() {
    this.close({ preserveIntent: true });
    await this.connect();
  }

  async send(payload) {
    await this.connect();

    if (!this.isOpen) {
      throw new Error("Voice WebSocket is not open");
    }

    this.socket.send(JSON.stringify(payload));
  }

  async sendAudio(data, mimeType = "audio/pcm;rate=16000") {
    return this.send({
      type: "audio",
      data,
      mimeType,
    });
  }

  async endAudio() {
    if (!this.isOpen) return;
    this.socket.send(JSON.stringify({ type: "audio_end" }));
  }

  async sendText(text) {
    if (!text?.trim()) return;
    return this.send({ type: "text", text: text.trim() });
  }

  interrupt() {
    if (!this.isOpen) return;
    this.socket.send(JSON.stringify({ type: "interrupt" }));
  }

  ping() {
    if (!this.isOpen) return;
    this.socket.send(JSON.stringify({ type: "ping" }));
  }

  close({ preserveIntent = false } = {}) {
    if (!preserveIntent) {
      this.intentionalClose = true;
    }

    this.connectGeneration += 1;

    if (this.socket) {
      try {
        this.socket.close(1000, "Client closed");
      } catch {
        // Socket may already be closed.
      }
    }

    this.socket = null;
    this.connectPromise = null;
  }

  emit(event) {
    this.onEvent?.(event);
  }
}
