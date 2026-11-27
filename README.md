# VAAK — Communication Without Barriers

**Speak. Understand. Participate.**

*Scaler × Wispr Flow Build for Bharat | Round 2 | Inclusive Education*

> **Evolution from Round 1:** VAAK is the Round 2 evolution of **MyVoice**, our Round 1 hackathon submission—refined with uncertainty-aware captions, Telugu-English and Hindi-English code-switching support, two-way student text-to-speech, deterministic local note fallbacks, and evidence-linked study notes.

---

## 1. The Problem & Target Users

- **Deaf and hard-of-hearing students** in Indian schools, colleges, and universities often struggle with English-only caption tools when teachers naturally switch between Indian English, Hindi, and Telugu.
- **Students with speech disabilities** lack a fast, respectful way to ask questions aloud during live lectures without disrupting class flow.
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
- **Key-Free Interactive Demo Mode:** ~2-minute simulated Photosynthesis lecture requiring zero API keys.

---

## 4. Technical Architecture & Provider Resilience

- **Same-Origin Production Stack:** Node.js + Express + `ws` WebSocket server ([server/src/index.ts](server/src/index.ts)) serving the React + TypeScript + Vite + Tailwind SPA (`client/dist`), REST endpoints (`/api/health`, `/api/capabilities`, `/api/translate`, `/api/notes`), and WebSocket proxy (`/ws/transcribe`).
- **Provider Failure Contingency:** Primary Gemini model (`gemini-flash-latest`) falls back once to `gemini-flash-lite-latest` on 503/404/timeout (never hammering 429 rate limits). If AI summarization is unavailable, VAAK generates deterministic local basic study notes strictly from the actual transcript.
- **Public Abuse Protection:** Per-IP rate limiting (`/api/translate`: 30/min, `/api/notes`: 10/min), global daily AI request budget (`GLOBAL_DAILY_AI_LIMIT`), and WebSocket session/concurrency caps (`GLOBAL_MAX_CONCURRENT_WS`).

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/RESEARCH_AND_DECISIONS.md](docs/RESEARCH_AND_DECISIONS.md) for details.

---

## 5. Quick Start (Key-Free Docker & Local)

### Docker Compose (Key-Free)
```bash
docker compose up --build -d
```
Open **http://localhost:3000** and click **Try Interactive Demo (No API Keys)**.

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
GLOBAL_MAX_CONCURRENT_WS=25
```

---

## 6. Privacy, Verified Testing & Known Limitations

- **Privacy:** Mandatory recording consent modal, visible recording indicator, no permanent storage of raw audio, and local IndexedDB storage for sessions.
- **Verified Testing Results:** 14+ automated unit/integration tests passing, real-browser E2E verified at 360px–1440px, `ubuntu-latest` GitHub Actions Docker Compose CI passing, live Deepgram Nova-3 English audio & `VAAK` wake-word streaming verified, and live Gemini Telugu/Hindi translation & evidence-linked notes verified.
- **Known Limitations:** Live human microphone testing across Hindi, Telugu, and mixed-language speech should be performed interactively in-browser; Windows Docker Desktop WSL2 engine was unavailable locally (verified via Linux CI). See [docs/TESTING_REPORT.md](docs/TESTING_REPORT.md).

## 7. License

Released under the [MIT License](LICENSE).
