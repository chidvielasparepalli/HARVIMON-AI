const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

export async function getVoices() {
  const response = await fetch(`${API}/api/voices`);
  if (!response.ok) {
    throw new Error("Unable to load voices");
  }
  return response.json();
}

export function createVoiceSocket({
  voice = "Kore",
  persona = "warm",
  language = "auto",
  conversationId,
} = {}) {
  const websocketUrl = API.replace(/^http/, "ws");
  const params = new URLSearchParams({
    voice,
    persona,
    language,
    conversationId,
  });

  return new WebSocket(
    `${websocketUrl}/ws/voice?${params.toString()}`
  );
}
