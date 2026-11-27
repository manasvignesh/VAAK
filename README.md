# MyVoice — Every Voice Matters

**Scaler × Wispr Flow Build for Bharat | Round 2 | Inclusive Education**

MyVoice is a real-time, two-way classroom communication and learning platform designed for Indian classrooms. It helps deaf and hard-of-hearing students follow multilingual lectures with uncertainty-aware captions, translations, and evidence-linked study notes—while enabling students with speech disabilities to participate aloud through accessible text-to-speech.

---

## 1. The Problem & Who MyVoice Serves

- **Deaf and hard-of-hearing students** in Indian schools, colleges, and universities often struggle with English-only caption tools when teachers naturally switch between Indian English, Hindi, and Telugu.
- **Students with speech disabilities** lack a fast, respectful way to ask questions aloud during live lectures without disrupting class flow.
- **Teachers and professors** should be able to teach naturally without manually typing notes, managing accessibility tools, or repeating explanations.

## 2. Why Voice-First Is Essential

Teachers cannot pause a lecture to click through menus or type study summaries. MyVoice uses an explicit `"MyVoice,"` wake-word prefix so teachers can highlight important definitions, bookmark topics, translate explanations, and generate evidence-linked study notes purely through natural speech—while providing equivalent keyboard and touch controls for full accessibility.

---

## 3. Main Features

- **Real-Time Multilingual Captions:** Interim vs. finalized timestamped captions with Indian English (`en-IN`), Hindi (`hi`), Telugu (`te`), and code-switched (`multi`) support via Deepgram Nova-3 Multilingual.
- **Uncertainty-Aware Captions:** Low-confidence words (below a configurable `0.60` heuristic threshold) are flagged with amber dotted underlines and an uncertainty icon; unrecognizable audio is explicitly marked `"Audio unclear — please check this section."` without fabricating text.
- **Voice-First Commands (`MyVoice, ...`):** Supports starting class, highlighting definitions, bookmarking topics, translating to Telugu/Hindi/English, summarizing progress, and ending class with confirmation.
- **Student Participation Mode:** Quick phrases and custom questions converted to audible speech via browser Speech Synthesis (`en-IN`, `hi-IN`, `te-IN`), with automatic classroom mic muting during playback to prevent echo-triggered commands.
- **Evidence-Linked Study Notes:** Structured notes where every concept and definition links back to its exact transcript segment ID and timestamp (`#seg-001 @ 00:03`). Includes a deterministic, key-free local basic notes fallback if AI summarization is unavailable.
- **My Classes Library:** Local IndexedDB storage with keyword search, Markdown export, and confirmation-guarded deletion.
- **Key-Free Interactive Demo Mode:** ~2-minute simulated Photosynthesis lecture with Telugu-English code-switching, uncertain words, connection drop/recovery, translations, and evidence-linked notes—requiring zero API keys.

---

## 4. Architecture & Supported Languages

- **Same-Origin Production Stack:** Node.js + Express + `ws` WebSocket server ([server/src/index.ts](server/src/index.ts)) serving the React + TypeScript + Vite + Tailwind SPA (`client/dist`), REST endpoints (`/api/health`, `/api/capabilities`, `/api/translate`, `/api/notes`), and WebSocket proxy (`/ws/transcribe`).
- **Supported Languages:** Indian English (`en-IN`), Hindi (`hi`), Telugu (`te`), and Multilingual code-switching (`multi`).
- **Language Limitations:** Code-switching accuracy depends on audio clarity and Deepgram Nova-3 live decoding; if a provider omits word confidence scores, MyVoice explicitly displays `"Confidence unavailable"`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/RESEARCH_AND_DECISIONS.md](docs/RESEARCH_AND_DECISIONS.md) for full details.

---

## 5. Quick Start (Docker & Local)

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

### Optional Live AI Configuration
Copy `.env.example` to `.env` and add server-side keys:
```env
PORT=3000
DEEPGRAM_API_KEY=your_deepgram_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-flash-latest
GEMINI_FALLBACK_MODEL=gemini-flash-lite-latest
```
API keys remain strictly server-side and are never exposed to the browser or committed to Git.

---

## 6. Privacy & Known Limitations

- **Privacy:** Mandatory recording consent modal before microphone capture, visible recording indicator, no permanent storage of raw audio, local IndexedDB storage for sessions, and per-IP rate limiting on `/api/translate`, `/api/notes`, and `/ws/transcribe`.
- **Known Limitations:** See [docs/TESTING_REPORT.md](docs/TESTING_REPORT.md) for current verification status, including Docker Desktop WSL2 host status and live microphone testing notes.

## 7. License

Released under the [MIT License](LICENSE).
