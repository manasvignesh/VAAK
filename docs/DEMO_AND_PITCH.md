# 3-Minute Competition Demonstration Plan & Pitch Content

## 3-Minute Live Demo Script

1. **0:00 – 0:25 | The Classroom Problem:**
   - Deaf and hard-of-hearing students in Indian classrooms struggle with mixed-language lectures (English + Telugu/Hindi), while students with speech disabilities lack a fast way to ask questions aloud.
2. **0:25 – 0:50 | Home & Consent:**
   - Open MyVoice (`http://localhost:3000`). Point out key-free readiness and Accessibility Settings (24/32/40px captions, High Contrast, Dark Mode).
   - Click **Start Live Class** (or **Try Interactive Demo** if running offline/key-free), review the mandatory recording consent modal, and select Multilingual (`en-IN` + `hi` + `te`).
3. **0:50 – 1:35 | Live Multilingual Captions & Voice Commands:**
   - Speak or run: `"Today we are learning about photosynthesis. Plants sunlight ni use chesi food prepare chestayi."`
   - Show interim vs. finalized timestamped captions and amber dotted-underline uncertainty flagging (`stroma`).
   - Trigger `"MyVoice, mark that definition as important."` and `"MyVoice, translate the last explanation into Telugu."` — show side-by-side Telugu translation without overwriting the original caption.
4. **1:35 – 2:05 | Two-Way Student Participation:**
   - Open **Student Participation Mode**, tap `"Ma'am, could you explain photosynthesis again?"`, and press **Speak Aloud** — note that classroom mic capture pauses automatically to prevent feedback.
5. **2:05 – 2:45 | Evidence-Linked Study Notes:**
   - Trigger `"MyVoice, end the class and prepare study notes."`, confirm the dialog, and view structured notes.
   - Click an evidence pill (`#seg-001 @ 00:01`) to jump directly back to the exact transcript explanation.
6. **2:45 – 3:00 | My Classes & Local Privacy:**
   - Open **My Classes**, search by keyword, export Markdown, and show local IndexedDB persistence.

---

## Pitch Deck Slide Outline

1. **Title:** MyVoice — Every Voice Matters (Inclusive Education for Bharat)
2. **Problem:** 63M+ Indians experience significant hearing loss; Indian classrooms mix English with regional languages, breaking standard English-only captions.
3. **Solution:** One connected, voice-first, two-way classroom platform—no typing required for teachers, uncertainty-aware captions + TTS participation for students.
4. **Key Differentiators:**
   - Uncertainty-aware captions (amber dotted underlines + `"Audio unclear"` instead of hallucinated text).
   - Evidence-linked study notes with validated transcript segment IDs.
   - True Indian code-switching (`en-IN`, `hi`, `te`, `multi`) + two-way TTS.
5. **Architecture & Privacy:** Same-origin Node/React/WebSocket Docker app, local IndexedDB storage, no raw audio saved, zero-key Demo Mode.
