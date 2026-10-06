# HARVIMON-AI 🎙️

**Voice & Conversational Intelligence — Hackathon Project**

HARVIMON-AI is a voice-first conversational intelligence agent designed to make human-to-AI communication feel like a natural conversation rather than a command interface.

## Core loop

**Listen → Understand → Context → Respond → Speak**

## Voice intelligence

- Gemini Live bidirectional voice conversation
- Live user and assistant transcription
- Native Gemini audio responses
- 16 kHz PCM input and 24 kHz PCM output
- Automatic voice activity detection and natural turn-taking
- Interruption / barge-in event handling
- English, Telugu, and Telugu-English code-mixed conversation
- Four configurable conversation personas
- 30 Gemini prebuilt voices
- Short-term memory that survives WebSocket reconnects
- Text fallback through the same conversational session
- Backend-only Gemini API key handling

## Architecture

```text
Browser microphone
      │
      │ PCM 16 kHz
      ▼
React + Vite
      │
      │ WebSocket
      ▼
Node.js + Express + ws
      │
      │ HARVIMON Voice Engine
      ▼
Google Gemini Live
      │
      ├── Context + memory
      ├── Input transcription
      ├── Native audio response
      └── Output transcription
      │
      ▼
Node.js WebSocket
      │
      ▼
Browser audio playback ← PCM 24 kHz
```

## Repository

```text
HARVIMON-AI/
├── frontend/
│   ├── src/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── ai/
│   │   │   ├── harvimon-engine.js
│   │   │   ├── memory.js
│   │   │   ├── system-prompt.js
│   │   │   └── voice-catalog.js
│   │   ├── server.js
│   │   └── ...
│   ├── test/
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── PROJECT.md
│   └── VOICE_ENGINE.md
└── README.md
```

## Local setup

### Backend

```bash
cd backend
npm install
```

Create backend/.env from backend/.env.example:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
GEMINI_API_KEY=your_key_here
GEMINI_LIVE_MODEL=gemini-3.8-live
GEMINI_DEFAULT_VOICE=Kore
GEMINI_DEFAULT_PERSONA=warm
GEMINI_DEFAULT_LANGUAGE=auto
```

Start:

```bash
npm run dev
```

Run the voice-engine tests:

```bash
npm test
```

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## WebSocket contract

The browser connects to /ws/voice. Optional query parameters are:

```text
voice=Kore
persona=warm
language=auto
conversationId=<stable-random-id>
```

Client messages support text, audio, audio_end, interrupt, and ping.

Server events include ready, user_transcript, assistant_transcript, audio, interrupted, turn_complete, closed, and error.

See docs/VOICE_ENGINE.md for the complete transport contract.

## Security

The Gemini API key is used only by the backend. It is never placed in React code or sent to the browser.

Never commit .env.

## Hackathon focus

HARVIMON targets the communication gap between rigid voice commands and natural human conversation. The project prioritizes:

1. Natural voice interaction
2. Context continuity
3. Multilingual and code-mixed conversation
4. Low-latency audio
5. Human-like turn taking
6. Interruption handling

## Current status

AI/voice foundation is implemented as a modular backend engine and is ready for frontend integration, end-to-end testing, and deployment.