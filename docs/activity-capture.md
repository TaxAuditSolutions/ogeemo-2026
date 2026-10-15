# Activity Capture — Low-Friction Documentation

Principle adopted from the beta Activity Manager audit: **basic documentation
must be exceptionally fast and easy**. Field workers and small businesses will
not document work if recording it means too much typing or too many steps.

## What shipped (beta interim — superseded by the Activity Manager redo below)

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

## Shipped in the Activity Manager redo (Julie's design)

The interim capture surface above was replaced by the single-card
"Create a new activity" form on `/event-manager`:

- **Activity type tiles** (Task / Appointment / Project / Note) — persisted
  as `Event.activityType` (legacy docs default to `task`). The Appointment
  tile flips the Schedule switch on.
- **Title \*** / **Details (optional)** / **Client + Project + Assign to**
  search pickers. "Add new contact…" and inline project creation live inside
  the pickers (the Select/Add-New radios are gone).
- **Schedule and Billable toggle switches** replace the interim "Add
  scheduling & billing details" bar; an explicit **Status** select
  (To Do / In Progress / Done) replaces the implicit status-by-schedule.
- **Cancel / Create Activity** footer (Save & New kept; Delete appears when
  editing). The Time Sessions card, Gmail tools, and Meeting Agenda stay.
- New events default to **unscheduled** (Schedule toggle off); the interim
  behaviour of implicitly scheduling every new event at "now" is gone.

## Still deferred

- Single-screen quick-log flow and field-reordering studies
- Agenda (Meeting Agenda) UX redesign
- Server-side transcription for unreliable-connectivity field use
- Geo/photo capture

Keep this list honest: new advanced functions go into *More tools*, never
alongside the routine capture path.
