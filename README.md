# HARVIMON-AI 🎙️

**Voice & Conversational Intelligence — Hackathon Project**

HARVIMON-AI is a voice-first conversational agent designed for natural, context-aware, human-like interaction.

## What makes HARVIMON different

HARVIMON is built around conversation rather than commands:

**Listen → Understand → Maintain Context → Respond → Speak**

It supports:
- Real-time bidirectional voice conversation
- Gemini Live native audio responses
- Live user and assistant transcription
- Natural turn-taking with server-side VAD
- Interruption-aware playback
- English, Telugu, and mixed Telugu-English conversation
- Text fallback for accessibility
- Browser microphone echo cancellation, noise suppression, and automatic gain control
- Backend-only AI API key handling

Gemini Live accepts raw 16-bit PCM audio and returns 24 kHz PCM audio, which HARVIMON streams between the browser and the backend. citeturn0search0turn0search1

## Architecture

```
Browser Microphone
      │
      │ PCM 16 kHz
      ▼
React + Vite
      │
      │ WebSocket
      ▼
Node.js + Express + ws
      │
      │ Gemini Live session
      ▼
Google Gemini Live
      │
      ├── Context + conversation
      ├── Input transcription
      ├── Native audio response
      └── Output transcription
      │
      ▼
Node.js WebSocket
      │
      ▼
Browser audio queue → 24 kHz playback
```

## Repository

```
HARVIMON-AI/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   └── package.json
├── backend/
│   ├── src/
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── docs/
│   └── PROJECT.md
└── README.md
```

## Local setup

### 1. Backend

```bash
cd backend
npm install
```

Create `.env`:

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
GEMINI_API_KEY=your_key_here
GEMINI_LIVE_MODEL=gemini-3.8-live
```

Start:

```bash
npm run dev
```

### 2. Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## Security

The Gemini API key is used only by the backend. It is never placed in React code or sent to the browser.

Never commit `.env`.

## Hackathon focus

HARVIMON targets the communication gap between rigid voice commands and natural human conversation. The project prioritizes:

1. Natural voice interaction
2. Context continuity
3. Multilingual and code-mixed conversation
4. Low-latency audio
5. Human-like turn taking
6. Interruption handling

## Current status

Hackathon MVP — real-time voice conversation pipeline integrated and ready for feature hardening, testing, and deployment.
