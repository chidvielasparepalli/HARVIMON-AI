# HARVIMON-AI Voice Engine

This document defines the AI/voice layer and its transport contract.

## Core pipeline

```text
Browser microphone
      ↓
16-bit PCM audio
      ↓
WebSocket /ws/voice
      ↓
HARVIMON Voice Engine
      ↓
Gemini Live
      ↓
24 kHz PCM audio + transcriptions
      ↓
Browser playback
```

## AI capabilities

- Gemini Live bidirectional audio
- Live input transcription
- Live output transcription
- 30 prebuilt Gemini voices
- Warm, energetic, calm, and professional personas
- Automatic English / Telugu / Telugu-English code-mix behavior
- Short-term conversation memory across WebSocket reconnects
- Automatic VAD
- Natural interruption events
- Text fallback through the same Live session
- Backend-only Gemini API key handling

## WebSocket connection

Connect to:

ws://<backend-host>/ws/voice

Optional query parameters:

```text
voice=Kore
persona=warm
language=auto
conversationId=<stable-random-id>
```

Supported personas: warm, energetic, calm, professional.

Supported language modes: auto, en, te, code-mixed.

The conversationId lets the server reuse recent in-memory context after a reconnect. Memory expires automatically.

## Client → server

Text:

```json
{ "type": "text", "text": "Hello HARVIMON" }
```

Audio:

```json
{ "type": "audio", "data": "<base64>", "mimeType": "audio/pcm;rate=16000" }
```

Audio end:

```json
{ "type": "audio_end" }
```

Interrupt notification:

```json
{ "type": "interrupt" }
```

The browser may stop local playback immediately. Gemini Live automatic VAD remains responsible for model-side speech interruption.

Ping:

```json
{ "type": "ping" }
```

## Server → client

Ready:

```json
{ "type": "ready", "conversationId": "...", "voice": "Kore", "persona": "warm", "language": "auto", "model": "gemini-3.8-live" }
```

Transcripts use user_transcript and assistant_transcript events.

Audio:

```json
{ "type": "audio", "data": "<base64>", "mimeType": "audio/pcm;rate=24000" }
```

Lifecycle events include interrupted, turn_complete, closed, and error.

## Integration rule

The frontend owns presentation only. UI code should not contain the Gemini API key, Gemini SDK calls, or the model/system prompt.