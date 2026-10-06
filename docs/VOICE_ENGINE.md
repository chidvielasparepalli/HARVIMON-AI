# HARVIMON-AI Voice Engine

This document defines the AI/voice layer and its transport contract.

## Architecture

~~~text
Frontend
   ↓ WebSocket /ws/voice
Backend transport + security
   ↓
createHarvimonSession()
   ↓
Gemini Live
~~~

The backend transport owns origin checks, connection limits, message-rate limits, query normalization, lifecycle cleanup, and error handling.
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

`GEMINI_API_KEY` is backend-only and must never be exposed to the frontend.

## WebSocket contract

Connect to `/ws/voice`.

Optional query parameters: `voice`, `persona`, `language`, `conversationId`.

Supported personas: warm, energetic, calm, professional.
Supported language modes: auto, en, te, code-mixed.

Client messages: `text`, `audio`, `audio_end`, `interrupt`, `ping`.
Server events: `ready`, `user_transcript`, `assistant_transcript`, `audio`, `interrupted`, `turn_complete`, `closed`, `error`.

`ping` receives a `pong` response.
`conversationId` allows the in-memory conversation context to survive a WebSocket reconnect. Memory expires automatically.

## Security boundary

The backend rejects WebSocket connections from origins outside `CLIENT_ORIGIN`, limits payload size and concurrent connections, and rate-limits client messages.
The Voice Engine validates text/audio and resolves unsupported voice/persona/language values to safe defaults.

Authentication and persistent database storage are intentionally not added yet because the current frontend contract does not require accounts or persistent user data. They can be added around this engine later without moving Gemini calls out of the backend.

## Integration rule

Frontend code owns presentation only. It must not contain the Gemini API key, Gemini SDK calls, or the model/system prompt.

All Gemini Live communication goes through `createHarvimonSession()` in `backend/src/ai/harvimon-engine.js`.