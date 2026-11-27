# VAAK — Testing & Qualification Report (Phases 1–7)

This report strictly separates **automated tests**, **real-browser E2E**, **live API tests**, and **unverified/manual** items.

---

## 1. Automated Tests (`npm test`) — PASSED (19/19)

- `npm run typecheck` and `npm run build` exited with code `0`.
- **Server (`vitest run` — 3 files, 8 tests):**
  - `geminiService.test.ts` (5 tests): Grounding, fabricated-ID stripping, low-confidence unverified marking, 429 rate-limit handling, transient retry, and `callWithModelFallback`.
  - `apiRoutes.test.ts` (2 tests): Key-free `/api/health`, `/api/capabilities`, `/api/translate`, `/api/notes`, `/ws/transcribe`, 429 rate limiting, and `LIVE_SERVICES_ENABLED=false`.
  - `cloudflareShared.test.ts` (1 test): Shared prompts, `<untrusted_transcript>` framing, and grounded lecture Q&A validation (`validateAndGroundQaResponse`).
- **Client (`vitest run` — 5 files, 11 tests):**
  - `voiceCommands.test.ts` (6 tests): `VAAK` / `Vaak` / `VOC` + legacy `MyVoice` commands, mid-lecture non-activation, standalone wake words, and `catch me up`.
  - `globalVoiceRouter.test.ts` (2 tests): Deterministic navigation, playback, learning, Catch Me Up window parsing, and follow-up Q&A translation routing.
  - `notesReader.test.ts` (1 test): Section announcements, natural timestamps, and explicit unverified speech warnings.
  - `localNotesFallback.test.ts` (1 test): Deterministic local basic notes.
  - `demoEngine.test.ts` (1 test): Demo study-note grounding.

---

## 2. Real-Browser E2E & Eyes-Free Flow (`http://localhost:3000`, Key-Free) — PASSED

- **Console / Network:** 0 console errors, 0 failed network requests.
- **Neo-Brutalist UI & Mobile:** Verified all 5 screens at `1440×900`, `390×844`, and `360×780` with `0` horizontal overflow, lazy-loaded 3D Voice Sculpture (`VoiceSculpture3D`), Focus Mode, and Catch Me Up.
- **Eyes-Free Acceptance Flow (via Companion Bar):** Verified Onboarding modal, `"What can I do?"`, `"Open my classes."`, `"Open the latest class."`, `"What did the teacher say about photosynthesis?"` (grounded answer + natural source timestamp), `"Explain that in Telugu."`, `"Read my latest notes."`, `"Read the next section."`, `"Stop speaking."` / `"Stop listening."` (fixed `speechGen` async cancellation race), `"Bookmark this explanation."`, and `"Go home."`.

---

## 3. Live API & Linux Docker CI Evidence

- **Deepgram Nova-3 (`test_speech.wav`, `test_commands.wav`, `test_vaak.wav`):** Verified `en-IN`, `hi`, `te`, `multi` handshakes, interim/finalized English captions (`654ms` interim), word confidences (`0.95–1.0`), and `"VAAK. Mark that as important."` / `"VOC:"` recognition.
- **Gemini (`gemini-flash-latest` + `gemini-flash-lite-latest` fallback):** Verified live Telugu & Hindi translations and evidence-linked study notes with prompt-injection resistance.
- **Cloudflare Worker (`wrangler deploy --dry-run`):** Verified `vaak-classroom` + `QuotaGuardDO` SQLite Durable Object bundle.
- **Linux Docker CI (`ubuntu-latest`):** Verified passing on `main`, `cloudflare-deploy`, `neo-brutalist-ui`, and `voice-accessibility`.

---

## 4. Remaining Limitations & Manual Verification Needed

- **Screen Reader (NVDA) & Live Human Multilingual Microphone Test:** Automated accessibility markup, landmarks, `<dialog>`, `aria-live` regions, focus management, and `autoSpeakResponses` toggle are implemented; live NVDA screen-reader and live human Hindi/Telugu/mixed microphone testing remain to be verified interactively by the user.
- **Cloudflare Live Deploy:** Pending `npx wrangler login && npx wrangler deploy` on your Cloudflare account.
