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
- **Meeting Agenda** moved from a competing full-width button into a
  *More tools* menu beside Details — discoverable, not promotional.

**Voice-to-text** (`DictationButton`, Web Speech API):
- Mic on **Details**, **Active Session Notes** and the session-edit
  **Session Notes**; tap → speak → tap to stop; phrases are appended, never
  replaced (`appendTranscript`, unit-tested).
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
