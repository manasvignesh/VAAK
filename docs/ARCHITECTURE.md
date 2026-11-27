# MyVoice Architecture

## Same-Origin Production Topology

MyVoice uses a single-origin Node.js + Express + WebSocket server (`server/src/index.ts`) that serves:
1. Built React + TypeScript + Tailwind SPA (`client/dist`) on `/`
2. REST API endpoints on `/api/*` (`health`, `capabilities`, `translate`, `notes`)
3. Real-time audio WebSocket proxy on `/ws/transcribe`

This eliminates CORS complexity and simplifies Docker and cloud deployment.

## Core Modules

### Backend (`server/src/`)
- `config.ts`: Loads environment variables without crashing when API keys are absent.
- `routes/health.ts`: Exposes `/api/health` and `/api/capabilities` (boolean capability flags only).
- `services/deepgramProxy.ts`: Relays 16kHz `linear16` PCM audio from the browser to Deepgram Nova-3 (`wss://api.deepgram.com/v1/listen`), parses word-level confidence scores, maintains KeepAlive frames, and performs bounded reconnects.
- `services/geminiService.ts`: Uses `@google/genai` with `responseMimeType: "application/json"` and `responseJsonSchema`, wraps transcript content in `<untrusted_transcript>` tags, validates output with Zod, and strips any hallucinated segment IDs in `validateAndGroundNotes()`.

### Frontend (`client/src/`)
- `services/audioCapture.ts`: Captures microphone audio with `echoCancellation`, `noiseSuppression`, and `autoGainControl`, downsamples/encodes to 16kHz `linear16`, and computes real-time RMS mic levels.
- `services/speechSocket.ts`: Manages WebSocket lifecycle, reconnects, and inserts timestamped gap markers on interruption.
- `services/voiceCommands.ts`: Enforces the leading `"MyVoice,"` wake prefix and `commandListeningEnabled` state; excludes recognized commands from study notes and requires confirmation for ending class.
- `services/ttsService.ts`: Wraps `window.speechSynthesis`, reports honest completion status (`onend`), and mutes classroom mic capture during playback.
- `services/storage.ts`: IndexedDB persistence (`myvoice-db`) for sessions, segments, highlights, bookmarks, notes, and accessibility settings.
- `services/demoEngine.ts`: Interactive Photosynthesis demo reusing the same UI and state pipeline.
