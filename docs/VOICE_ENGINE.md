# HARVIMON-AI Voice Engine

This document defines the AI/voice layer and its transport contract.

## Browser audio pipeline

~~~text
Microphone capture
   ↓
Browser PCM
   ↓
actual resampling to 16 kHz
   ↓
signed 16-bit PCM
   ↓ WebSocket /ws/voice
Backend transport + security
   ↓
createHarvimonSession()
   ↓
Gemini Live
   ↓
24 kHz PCM audio
   ↓
Browser playback queue
~~~

The backend transport owns origin checks, connection limits, message-rate limits, query normalization, lifecycle cleanup, and error handling.

The frontend voice layer owns microphone capture, actual 16 kHz resampling, stable conversation identity, session configuration, interruption-safe playback, and browser resource cleanup.

The Voice Engine owns Gemini Live configuration, voice selection, persona, language behavior, conversation memory, VAD, interruption events, transcription, and audio transport.

## Environment

~~~text
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
GEMINI_API_KEY=
GEMINI_LIVE_MODEL=gemini-3.8-live
GEMINI_DEFAULT_VOICE=Kore
GEMINI_DEFAULT_PERSONA=warm
GEMINI_DEFAULT_LANGUAGE=auto
~~~

GEMINI_API_KEY is backend-only and must never be exposed to the frontend.

## WebSocket connection

Connect to `/ws/voice` with:

~~~text
voice=Kore
persona=warm
language=auto
conversationId=<stable-session-id>
~~~

The frontend stores the conversation ID in sessionStorage and reuses it during reconnects in the same browser session.

## Client → server

- `text`
- `audio`
- `audio_end`
- `interrupt`
- `ping`

Audio sent by the frontend is actual signed 16-bit PCM at 16 kHz:

~~~json
{
  "type": "audio",
  "data": "<base64>",
  "mimeType": "audio/pcm;rate=16000"
}
~~~

## Server → client

- `ready`
- `user_transcript`
- `assistant_transcript`
- `audio`
- `interrupted`
- `turn_complete`
- `closed`
- `error`

Assistant audio remains signed 16-bit PCM at 24 kHz:

~~~json
{
  "type": "audio",
  "data": "<base64>",
  "mimeType": "audio/pcm;rate=24000"
}
~~~

## Interruption

When HARVIMON emits `interrupted`, the frontend immediately flushes queued audio.

When the user begins speaking while assistant playback is active, the frontend can send `interrupt` and flush local playback without closing the current WebSocket session.

## Integration rule

Frontend code must not contain the Gemini API key, Gemini SDK calls, or the model/system prompt.

All Gemini Live communication goes through `createHarvimonSession()` in `backend/src/ai/harvimon-engine.js`.