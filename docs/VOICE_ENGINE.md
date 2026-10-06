# HARVIMON-AI Voice Engine

## End-to-end architecture

```text
Dashboard UI
    ↓
useAgentVoice()
    ↓
VoiceSession
    ↓ WebSocket /ws/voice
Backend transport + security
    ↓
createHarvimonSession()
    ↓
Gemini Live
    ↓ 24 kHz PCM + transcriptions
VoiceSession events
    ↓
AudioOutputQueue
    ↓
Browser speakers
```

Microphone input is captured at the browser's native sample rate, downsampled to exactly 16 kHz, converted to signed 16-bit PCM, base64 encoded, and sent over WebSocket.

## Frontend voice modules

- `frontend/src/hooks/useAgentVoice.js` — React-facing voice controller
- `frontend/src/voice/session.js` — WebSocket lifecycle and session configuration
- `frontend/src/voice/audio-input.js` — microphone capture and 16 kHz conversion
- `frontend/src/voice/audio-output.js` — 24 kHz PCM playback queue
- `frontend/src/voice/audio.js` — PCM conversion, resampling, and RMS utilities

The existing dashboard API remains unchanged: `useAgentVoice()`.

## Session configuration

The frontend supplies `voice`, `persona`, `language`, and a stable `conversationId`.
The conversation ID is stored in `sessionStorage` and reused during reconnects in the same browser session.

## Audio contract

Browser to backend:

```json
{
  "type": "audio",
  "data": "<base64>",
  "mimeType": "audio/pcm;rate=16000"
}
```

Backend to browser:

```json
{
  "type": "audio",
  "data": "<base64>",
  "mimeType": "audio/pcm;rate=24000"
}
```

## Interruption

When speech energy is detected while assistant playback is active, the browser sends `interrupt` and flushes the local playback queue without closing the WebSocket. Gemini Live interruption events are also handled by flushing local playback.

## Testing

Frontend unit tests are in `frontend/test/audio.test.js`.

Real browser/device verification is still required for English, Telugu, mixed Telugu-English, barge-in, reconnect/context continuity, voice switching, and network recovery.

## Deployment environment

Frontend:

```text
VITE_API_URL=https://<deployed-backend>
```

Backend:

```text
PORT=5000
CLIENT_ORIGIN=https://<deployed-frontend>
GEMINI_API_KEY=<secret>
GEMINI_LIVE_MODEL=gemini-3.8-live
GEMINI_DEFAULT_VOICE=Kore
GEMINI_DEFAULT_PERSONA=warm
GEMINI_DEFAULT_LANGUAGE=auto
```

The Gemini API key must remain backend-only.