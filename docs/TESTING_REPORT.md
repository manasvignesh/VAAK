# VAAK — Testing & Qualification Report (Phases 1–7.1)

This report strictly separates **human microphone input**, **synthetic audio streamed through Deepgram**, **text-command browser E2E**, **mocked unit/integration tests**, **interactive demo content**, and **genuine Gemini responses**.

---

## 1. Verification Method Matrix (Phase 7.1 Audit)

| Verification Method | What Was Tested | Status |
|---|---|---|
| **Actual Human Microphone Input** | Live human voice (`VAAK, what can I do?`, class selection by name, spoken Q&A, multilingual mic, NVDA) | **Pending manual user test** (see Section 5) |
| **Synthetic Audio via Deepgram Nova-3 (`ws/transcribe`)** | `test_companion.wav` (Voice Companion phrases), `test_vaak.wav`, `test_speech.wav`, `test_commands.wav` | **Verified** (real Deepgram Nova-3 WebSocket) |
| **Text-Command Browser E2E (`#vaak-companion-input`)** | Onboarding, navigation, Q&A, notes playback, `Stop speaking.` → `State: interrupted`, `Stop listening.` → `State: idle` | **Verified** (`http://localhost:3000`, 0 console errors) |
| **Mocked Unit & Integration Tests (`npm test`)** | Server grounding, rate limiting, `LIVE_SERVICES_ENABLED=false`, voice command & global router parsing, notes reader | **Verified** (`19/19` tests across 8 files) |
| **Interactive Demo Content** | Pre-seeded sample lecture & deterministic demo fallback (`demoEngine.ts`) | **Verified** (key-free browser & unit tests) |
| **Genuine Gemini Responses (`gemini-flash-latest`)** | Live `POST /api/ask` (grounded + unanswerable refusal), `POST /api/translate` (Telugu/Hindi), `POST /api/notes` | **Verified** (live Gemini API) |

> **Important Disclosure:** The Phase 7 real-browser E2E audit submitted commands via the `#vaak-companion-input` text command bar, **not** through a live human microphone. Genuine speech-to-text recognition was verified separately by streaming 16kHz mono PCM WAV fixtures through Deepgram Nova-3 over `ws://localhost:3000/ws/transcribe`.

---

## 2. Automated Tests (`npm test`) — PASSED (19/19)

- `npm run typecheck` and `npm run build` exited with code `0`.
- **Server (`vitest run` — 3 files, 8 tests):**
  - `geminiService.test.ts` (5 tests): Grounding, fabricated-ID stripping, low-confidence unverified marking, 429 rate-limit handling, transient retry, and `callWithModelFallback`.
  - `apiRoutes.test.ts` (2 tests): Key-free `/api/health`, `/api/capabilities`, `/api/translate`, `/api/notes`, `/ws/transcribe`, 429 rate limiting, and `LIVE_SERVICES_ENABLED=false`.
  - `cloudflareShared.test.ts` (1 test): Shared prompts, `<untrusted_transcript>` framing, and grounded lecture Q&A validation (`validateAndGroundQaResponse`).
- **Client (`vitest run` — 5 files, 11 tests):**
  - `voiceCommands.test.ts` (6 tests): `VAAK` / `Vaak` / `VOC` + legacy `MyVoice` commands, mid-lecture non-activation, standalone wake words, and `catch me up`.
  - `globalVoiceRouter.test.ts` (2 tests): Deterministic navigation, class-by-name matching (`open_class_by_name`), playback, learning, Catch Me Up window parsing, and follow-up Q&A translation routing.
  - `notesReader.test.ts` (1 test): Section announcements, natural timestamps, and explicit unverified speech warnings.
  - `localNotesFallback.test.ts` (1 test): Deterministic local basic notes.
  - `demoEngine.test.ts` (1 test): Demo study-note grounding.

---

## 3. Real-Browser Text-Command E2E (`http://localhost:3000`) — PASSED

- **Console / Network:** 0 console errors, 0 failed network requests.
- **Neo-Brutalist UI & Mobile:** Verified all 5 screens at `1440×900`, `390×844`, and `360×780` with `0` horizontal overflow, lazy-loaded 3D Voice Sculpture (`VoiceSculpture3D`), Focus Mode, and Catch Me Up.
- **Voice Companion Command Bar (`#vaak-companion-input`) Flow:** Verified Onboarding modal, `"What can I do?"`, `"Open my classes."`, `"Open the latest class."`, `"What did the teacher say about photosynthesis?"` (grounded answer + natural source timestamp), `"Explain that in Telugu."`, `"Read my latest notes."`, `"Read the next section."`, `"Stop speaking."` (state pill → `State: interrupted`), `"Stop listening."` (state pill → `State: idle`), `"Bookmark this explanation."`, and `"Go home."`.
- **TTS Interruption Design Note:** Microphone listening pauses automatically while `speechSynthesis` is speaking to prevent speaker-echo self-triggering. During active TTS playback, users interrupt immediately via `Escape` or the accessible **Stop Speaking** button (`speechGen` increments so late `onend` events cannot overwrite `State: interrupted`).

---

## 4. Live API & Linux Docker CI Evidence

- **Deepgram Nova-3 (`test_companion.wav`):** Streamed synthetic 16kHz PCM audio of Voice Companion commands over `ws://localhost:3000/ws/transcribe`. Deepgram returned finals: `["VAAK. What can I do?", "Open my classes.", "Open the latest class.", "Read my latest notes.", "Read the next section.", "Repeat that."]`. Verified `routeGlobalVoiceCommand()` deterministically routes all 8 companion phrases (including Deepgram's `"VAAK. What can I do?"` punctuation).
- **Deepgram Nova-3 (`test_speech.wav`, `test_commands.wav`, `test_vaak.wav`):** Verified `en-IN`, `hi`, `te`, `multi` handshakes, interim/finalized English captions (`654ms` interim), word confidences (`0.95–1.0`), and `"VAAK. Mark that as important."` / `"VOC:"` recognition.
- **Gemini `POST /api/ask` (`gemini-flash-latest`):**
  - `"What did the teacher explain about photosynthesis?"` → `teacherGrounded: true`, `notFoundInTranscript: false`, `references: [seg-001, seg-002]`, `spokenSourcesSummary: "Your teacher explained this 15 seconds into the lecture."`.
  - `"What did the teacher say about chlorophyll?"` → `teacherGrounded: true`, `references: [seg-002]`, `spokenSourcesSummary: "Your teacher explained this approximately 2 minutes into the lecture."`.
  - `"What important definitions were covered?"` → `teacherGrounded: true`, `references: [seg-001, seg-002]`.
  - `"What did the teacher say about quantum entanglement?"` → `teacherGrounded: false`, `notFoundInTranscript: true`, `answer: "I couldn't find that explanation in your saved classroom transcript."`.
- **Gemini `POST /api/translate` (Telugu Follow-Up):** Translated the chlorophyll explanation into Telugu (`"కిరణజన్య సంయోగక్రియ..."`, `isDemo: false`).
- **Gemini `POST /api/notes`:** Verified live evidence-linked study notes with prompt-injection resistance.
- **Cloudflare Worker (`wrangler deploy --dry-run`):** Verified `vaak-classroom` + `QuotaGuardDO` SQLite Durable Object bundle.
- **Linux Docker CI (`ubuntu-latest`):** Verified passing on `main`, `cloudflare-deploy`, `neo-brutalist-ui`, and `voice-accessibility`.

---

## 5. Remaining Manual User Verification

- **Live Human Microphone & Eyes-Free Walkthrough:** Use the manual Eyes-Free Human Testing Script (spoken wake phrase, `Open my classes.`, `Open <Class Name>.`, spoken lecture Q&A, `Explain that in Telugu.`, `Read my latest notes.`, `Escape` / **Stop Speaking** button, `Go home.`, `Stop listening.`) and NVDA screen-reader check.
- **Cloudflare Live Deploy:** Pending `npx wrangler login && npx wrangler deploy` on your Cloudflare account.
