# Activity Capture — Low-Friction Documentation

Principle adopted from the beta Activity Manager audit: **basic documentation
must be exceptionally fast and easy**. Field workers and small businesses will
not document work if recording it means too much typing or too many steps.

## What shipped (beta interim)

**Essential capture surface** (`/event-manager`):
- Subject → Contact / Project / Worker → Details → record. The misleading
  "Subject Title \*" is gone — the save path already tolerates an empty title
  (auto-names the session), so nothing is falsely marked required.
- **Scheduling** and **Billing Status** collapsed behind
  *Add scheduling & billing details*; when populated they show a one-line
  summary (`Oct 4, 2026 · Billable · $100/hr`) so nothing hides silently.
  Opening the section pre-fills the schedule with **now**: Start and End on
  the current day, Start's time to the current clock time (floored to the
  5-minute step, never a future time); existing values are never overwritten.
- **Meeting Agenda** moved from a competing full-width button into a
  *More tools* menu beside Details — discoverable, not promotional.

**Voice-to-text** (`GlobalDictation`, Web Speech API — one mic, any field):
- A single floating microphone on every screen (bottom-right, 48px). Click
  into any text field — Details, session notes, any form, any page — and tap
  the mic; or tap it first, and your last-touched field is remembered (with
  Activity Manager Details as the sensible default).
- Clicking the mic never steals focus from your field; while recording a pill
  shows where words are landing (`Listening → Details`) and the button pulses
  red. If nothing sensible is selected it prompts to select a field instead
  of silently recording into the void.
- Phrases are appended, never replaced (`appendTranscript` + target picker,
  unit-tested), driven through React's controlled-input pathway.
- Honors the existing **Voice Dictation** preference (Settings → Preferences),
  which previously toggled nothing — it is now real.
- Hidden automatically where the browser lacks speech recognition. Best on
  Android Chrome / desktop Chrome / Edge; iOS Safari via webkit prefix.

## Deliberately deferred to the Activity Manager redesign

- Single-screen quick-log flow and field-reordering studies
- Agenda (Meeting Agenda) UX redesign
- Server-side transcription for unreliable-connectivity field use
- Geo/photo capture

Keep this list honest: new advanced functions go into *More tools*, never
alongside the routine capture path.
