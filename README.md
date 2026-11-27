# VAAK — Communication Without Barriers

**Speak. Understand. Participate.**

*Scaler × Wispr Flow Build for Bharat | Round 2 | Inclusive Education*

> **Evolution from Round 1:** VAAK is the Round 2 evolution of **MyVoice**, our Round 1 hackathon submission—refined with uncertainty-aware captions, Telugu-English and Hindi-English code-switching support, two-way student text-to-speech, deterministic local note fallbacks, and evidence-linked study notes.

---

## 1. The Problem & Target Users

- **Deaf and hard-of-hearing students** in Indian schools, colleges, and universities often struggle with English-only caption tools when teachers naturally switch between Indian English, Hindi, and Telugu.
- **Students with speech disabilities** lack a fast, respectful way to ask questions aloud during live lectures without disrupting class flow.
- **Blind and low-vision students** need hands-free voice navigation, grounded lecture Q&A with natural timestamps, and audible study-note playback.
- **Teachers and professors** should be able to teach naturally without manually typing notes, managing accessibility tools, or repeating explanations.

## 2. Voice-First Classroom Workflow

Prefix spoken commands with **`VAAK,`** (backward-compatible **`MyVoice,`** alias also supported):
- `"VAAK, start today's class on photosynthesis."`
- `"VAAK, mark that definition as important."`
- `"VAAK, translate the last explanation into Telugu."`
- `"VAAK, bookmark this topic."`
- `"VAAK, summarize what we covered so far."`
- `"VAAK, end the class and prepare study notes."` (confirmed before finalizing)

Equivalent keyboard and touch controls are provided for every essential voice command.

---

## 3. Main Features & Accessibility

- **Real-Time Multilingual Captions:** Interim vs. finalized timestamped captions with Indian English (`en-IN`), Hindi (`hi`), Telugu (`te`), and code-switched (`multi`) support via Deepgram Nova-3 Multilingual.
- **Uncertainty-Aware Captions:** Low-confidence words (below a configurable `0.60` heuristic threshold) are flagged with amber dotted underlines and an uncertainty icon; unrecognizable audio is explicitly marked `"Audio unclear — please check this section."` without fabricating text.
- **Student Participation Mode:** Quick phrases and custom questions converted to audible speech via browser Speech Synthesis (`en-IN`, `hi-IN`, `te-IN`), with automatic classroom mic muting during playback.
- **Evidence-Linked Study Notes & Local Fallback:** Structured notes where every concept and definition links back to its exact transcript segment ID and timestamp (`#seg-001 @ 00:03`). Includes a deterministic, key-free local basic notes fallback if AI summarization is unavailable.
- **Accessibility Controls:** 24px / 32px / 40px caption sizes, Light & Dark themes, High-Contrast mode, Reduced Motion support, native `<dialog>` modals, centralized `aria-live` announcements, and full keyboard navigation.
- **Key-Free Spotlight Guided Tour & Interactive Demo Mode:** Interactive 11-step spotlight walkthrough (**Take a Tour**) and a simulated Photosynthesis lecture requiring zero API keys.
- **Voice Companion (Eyes-Free Mode):** Hands-free navigation, grounded lecture Q&A (`/api/ask`), natural timestamp citations, and `SpeechSynthesis` playback with `Escape` / **Stop Speaking** interruption.

---

## 4. Technical Architecture & External Dependencies

- **Same-Origin Production Stack:** Node.js + Express + `ws` WebSocket server ([server/src/index.ts](server/src/index.ts)) serving the React + TypeScript + Vite + Tailwind SPA (`client/dist`), REST endpoints (`/api/health`, `/api/capabilities`, `/api/translate`, `/api/notes`, `/api/ask`), and WebSocket proxy (`/ws/transcribe`).
- **External Service Dependencies (All Optional for Startup):**
  - **Deepgram Nova-3** (optional): Real-time multilingual speech-to-text over `/ws/transcribe` when `DEEPGRAM_API_KEY` is configured.
  - **Google Gemini** (`gemini-flash-latest` with `gemini-flash-lite-latest` fallback, optional): Live translation, evidence-linked study notes, and grounded lecture Q&A when `GEMINI_API_KEY` is configured.
  - **Browser Web Speech API** (`SpeechSynthesis`): Local client-side text-to-speech for Participation and Voice Companion replies.
- **Provider Failure Contingency & Abuse Protection:** Per-IP rate limiting, global daily AI/audio budgets (`GLOBAL_DAILY_AI_LIMIT`, `GLOBAL_DAILY_AUDIO_MINUTES`), WebSocket concurrency caps (`GLOBAL_MAX_CONCURRENT_WS`), and deterministic local study-note fallback if Gemini is unavailable.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/RESEARCH_AND_DECISIONS.md](docs/RESEARCH_AND_DECISIONS.md) for details.

---

## 5. Prerequisites & Quick Start (Key-Free Docker & Local)

### Prerequisites
- **Docker:** Docker Desktop or Docker Engine with Docker Compose (`docker compose`), **or**
- **Local Node.js:** Node.js 22+ and npm 10+ (for running without Docker).

### Docker Compose (Key-Free One-Command Startup)
```bash
docker compose up --build -d
```
Open **http://localhost:3000**, click **Take a Quick Tour** or **Try Interactive Demo** (no API keys required). To stop: `docker compose down`.

### Local Development
```bash
npm install
npm run dev
```

### Live AI Configuration (Optional)
Copy `.env.example` to `.env` and set server-side keys:
```env
PORT=3000
DEEPGRAM_API_KEY=your_deepgram_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-flash-latest
GEMINI_FALLBACK_MODEL=gemini-flash-lite-latest
GLOBAL_DAILY_AI_LIMIT=250
GLOBAL_DAILY_AUDIO_MINUTES=120
GLOBAL_MAX_CONCURRENT_WS=25
```

---

## 6. Privacy, Verified Testing, Known Limitations & Troubleshooting

- **Privacy:** Mandatory recording consent modal, visible recording indicator, no permanent storage of raw audio, and local IndexedDB storage for sessions.
- **Verified Testing Results:** 20/20 automated unit/integration tests passing, real-browser E2E verified on desktop & mobile, `ubuntu-latest` GitHub Actions Docker Compose CI passing, live Deepgram Nova-3 audio & `VAAK` wake-word streaming verified, and live Gemini translation, grounded Q&A, and evidence-linked notes verified.
- **Known Limitations:**
  - Live human microphone and NVDA screen-reader testing across Hindi, Telugu, and mixed-language speech should be performed interactively in-browser on the user's hardware.
  - Windows Docker Desktop Linux engine was unavailable locally during development; clean Linux Docker startup is verified via GitHub Actions `ubuntu-latest` CI.
  - Browser `SpeechSynthesis` voice availability (especially `hi-IN` / `te-IN`) depends on the user's OS/browser voice packs.
- **Troubleshooting:**
  - **Port `3000` already in use:** Run `PORT=3001 docker compose up --build -d` (or set `PORT=3001` in `.env`) and open `http://localhost:3001`.
  - **"Live speech recognition requires DEEPGRAM_API_KEY" / Demo Mode:** Expected when running key-free; use **Take a Tour** or **Try Interactive Demo**, or add `DEEPGRAM_API_KEY` and `GEMINI_API_KEY` to `.env` and restart.
  - **Microphone denied or `STATE: ERROR`:** Allow microphone access in browser site settings for `localhost:3000`, ensure no other app holds the mic exclusively, and click **Retry Voice Mode**.
  - **Docker daemon not running:** Start Docker Desktop / Docker Engine, or run locally with `npm ci && npm run build && npm start`. See [docs/TESTING_REPORT.md](docs/TESTING_REPORT.md).

## 7. License

Released under the [MIT License](LICENSE).
