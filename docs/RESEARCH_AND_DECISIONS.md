# Technical Research & Decisions

## 1. Multilingual & Code-Switched Speech Recognition
- **Requirement:** Support Indian English (`en-IN`), Hindi (`hi`), Telugu (`te`), and mixed-language classroom speech (`"Plants sunlight ni use chesi food prepare chestayi."`) with interim results and word-level confidence.
- **Decision:** Deepgram Nova-3 Multilingual (`model=nova-3&language=multi` for code-switching, plus explicit `en-IN`, `hi`, `te` options) over a server-side WebSocket proxy (`server/src/services/deepgramProxy.ts`).
- **Caveats & Honest Limitations:**
  - Code-switching accuracy depends on audio clarity and Deepgram's live model behavior; Telugu-English code-switching in `language=multi` may occasionally transliterate or favor dominant tokens.
  - When `confidence` is unavailable from a provider response, MyVoice explicitly displays `"Confidence unavailable"` rather than fabricating numbers.

## 2. Evidence-Linked Study Notes & Translation
- **Requirement:** Structured notes grounded strictly in actual transcript segments, plus English/Hindi/Telugu translation without overwriting original captions.
- **Decision:** Google Gemini (`@google/genai`, default `gemini-2.5-flash`) with `responseMimeType: "application/json"`, `responseJsonSchema`, and Zod validation.
- **Safety & Grounding:**
  - Voice commands (`isVoiceCommand: true`) and gap markers (`isGapMarker: true`) are filtered out before sending segments to Gemini.
  - `validateAndGroundNotes()` verifies every returned `segmentId` against the session's actual segment map, stripping any fabricated IDs and marking items touching unclear audio as `unverified: true`.

## 3. Accessibility & Native Web Platform Choices
- **Modals:** Native `<dialog>` with `showModal()` for consent, accessibility settings, and destructive confirmations (native top-layer, `Esc` dismissal, inert background, `overscroll-behavior: contain`).
- **Live Regions:** Centralized `polite` and `assertive` `aria-live` regions in `LiveRegion.tsx`.
- **Two-Way TTS Feedback Loop:** Student Participation TTS mutes `AudioCaptureService` during speech playback so synthesized student questions never trigger teacher voice commands.
