# Activity Capture — Low-Friction Documentation

Principle adopted from the beta Activity Manager audit: **basic documentation
must be exceptionally fast and easy**. Field workers and small businesses will
not document work if recording it means too much typing or too many steps.

## What shipped (beta interim — superseded by the Activity Manager redo below)

**Essential capture surface** (`/event-manager`):
- Subject → Contact / Project / Worker → Notes → record. The misleading
  "Subject Title \*" is gone — the save path already tolerates an empty title
  (auto-names the session), so nothing is falsely marked required.
- **Scheduling** and **Billing Status** collapsed behind
  *Add scheduling & billing details*; when populated they show a one-line
  summary (`Oct 4, 2026 · Billable · $100/hr`) so nothing hides silently.
  Opening the section pre-fills the schedule with **now**: Start and End on
  the current day, Start's time to the current clock time (floored to the
  5-minute step, never a future time); existing values are never overwritten.
- **Meeting Agenda** moved from a competing full-width button into a
  *More tools* menu beside Notes — discoverable, not promotional.

**Voice-to-text** (`GlobalDictation`, Web Speech API — one mic, any field):
- A single floating microphone on every screen (bottom-right, 48px). Click
  into any text field — Notes, session notes, any form, any page — and tap
  the mic; or tap it first, and your last-touched field is remembered (with
  Activity Manager Notes as the sensible default).
- Clicking the mic never steals focus from your field; while recording a pill
  shows where words are landing (`Listening → Notes`) and the button pulses
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

- **No activity-type tiles.** The Action / Project / Note tiles were removed
  because they only set a stored label and changed no behaviour. `Event.activityType`
  is still persisted (legacy docs default to `task`): a new activity is stored as
  `task`, and an existing `appointment` / `project` / `note` keeps its stored value
  when opened and saved (the calendar's overdue rule treats appointments
  differently, so the stored value is never rewritten by opening it). Link an
  activity to a project with the Project dropdown.
- **When band (under Subject):** the time is part of the activity, not a hidden
  switch. Three choices — **Next free slot** (default for a new activity on the
  Activity Manager page), **Pick a time**, **No set time**. Next free slot is the
  first 30-minute gap in the assignee's calendar inside 9:00–17:00 (today from
  the next 5 minutes, then weekdays; completed and all-day items don't block) —
  see `src/lib/next-free-slot.ts`. It follows a change of assignee until the user
  edits the time; editing it switches the band to *Pick a time*. Editing an
  existing event, or arriving from a calendar click, keeps its own time. The
  Calendar's Add dialog still opens at *now*, with *Next free slot* one click away.
- **Subject \*** / **Notes (optional)** / **Client + Project + Assign to**
  search pickers. "Add new contact…" and inline project creation live inside
  the pickers (the Select/Add-New radios are gone).
- **Billable toggle switch** and the **When band** (above) replace the interim "Add
  scheduling & billing details" bar; an explicit **Status** select
  (To Do / In Progress / Done) replaces the implicit status-by-schedule.
- **Cancel / Save** footer (Save & New kept; Delete appears when
  editing). The Time Sessions card, Gmail tools, and Meeting Agenda stay.
- New events default to **unscheduled** (Schedule toggle off); the interim
  behaviour of implicitly scheduling every new event at "now" is gone.

## Calendar "Add +" dialog

`/calendar` has an **Add +** button that opens the same activity form as a modal
(`ActivityFormDialog`). The form itself is shared, not copied: field state lives
in `useActivityForm`, picker data in `useActivityReferenceData`, and the fields
in `ActivityFormFields`, all used by `/event-manager` as well, so both save the
same record shape (including the start/end rules in `resolveScheduledWindow`).

- Opens **scheduled for now** (stored as an `appointment`), Schedule switch on,
  Start = today at the current hour and 5-minute slot, End date = today. (A
  calendar entry has to be scheduled to appear on the calendar, so this is the
  one place a new activity defaults to scheduled.)
- Footer is **Cancel / Save**. Save & New, the Time Sessions card and
  the *More tools* menu are Activity Manager only.
- After saving, the calendar reloads so the entry shows in its slot.

## Still deferred

- Single-screen quick-log flow and field-reordering studies
- Agenda (Meeting Agenda) UX redesign
- Server-side transcription for unreliable-connectivity field use
- Geo/photo capture

Keep this list honest: new advanced functions go into *More tools*, never
alongside the routine capture path.
