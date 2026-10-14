# Activity → Time Session → Time Log Billing Model

Clarifies three conceptually different durations and where each is stored.
Arises from beta feedback: a scheduled billable Activity (10:20–11:20) appeared
in the Time Log Report as 01:00:00 / $100 before any work was recorded, then was
silently replaced by 00:02:15 when a real session was logged.

## The three durations

| Concept | Where it lives | Meaning |
|---|---|---|
| **Scheduled span** | `Event.start` / `Event.end` | Planned/calendar time. Preserved forever for planning, even after work is recorded. Never billed by itself. |
| **Actual worked time** | `Event.sessions[]` (+ running timer), or `TimeLog.durationSeconds` for manual/field logs | Time actually performed. The only legitimate billing source. |
| **Reported duration** | `Event.duration` | A convenience total shown in reports. Its **provenance** is stamped in `Event.durationSource`. |

## Duration provenance (`durationSource`)

`src/lib/duration-source.ts` is the single source of truth:

- **`'sessions'`** — duration is the sum of logged Time Sessions (+ running timer). *Billable when `isBillable`.*
- **`'scheduled'`** — duration is only the planned start/end span; no session exists yet. *Shown in reports, labelled "Scheduled – not yet worked", never counted in billable totals, payroll, or invoices.*
- **`'manual'`** — duration entered directly (HR clock-time entry). *Counts as worked time.*
- **absent (legacy docs)** — resolved heuristically: sessions → `'sessions'`, scheduled+sessionless → `'scheduled'`, otherwise `'manual'`.

## Rules

1. **Scheduled time is never silently billed.** An Activity scheduled 10:20–11:20
   with no session appears in Time Log with an amber *Scheduled – not yet worked*
   badge and a separate "Scheduled (not yet worked)" footer row. Billable Hours
   and Billable Amount exclude it.
2. **A recorded session replaces, never duplicates.** Saving a session overwrites
   `duration`/`durationSource` on the *same* Event document — no second row is
   created. Billing then uses the actual session duration.
3. **Scheduled start/end survive actual work.** Sessions only change
   `duration`, `durationSource`, and `sessions[]`; `start`/`end` remain the
   calendar plan.
4. **Payroll and invoicing use worked time only.** `run-payroll-view`,
   `invoice-from-time-log-view`, and `time-log-import-dialog` all filter out
   `'scheduled'` placeholders.
5. **Activity Manager displays the same truth header-side:** while sessionless,
   the header reads "Scheduled (not yet worked) — not billable until a session
   is logged" instead of "Total on this event".

## UI state made explicit

The chosen product behaviour (beta option: *show as Scheduled, non-billable*)
deliberately keeps scheduled placeholders visible in the Time Log so planners can
see planned work — but with an unmissable label, so their meaning never passes
for recorded work.

## Time Log → Invoice (OG-065 / OG-070 / OG-071)

Billable work leads directly into invoicing, in both directions, over the
**same underlying records** (no second billing mechanism):

- **Time Log → Invoice:** the Time Log Report offers *Add to Invoice* (row)
  and *Create Invoice* (footer). Eligible entries are handed to the Invoice
  Generator via a read-once sessionStorage payload (`src/lib/invoice-handoff.ts`)
  plus the existing `?contactId=` param; *Add from Time Log* opens with those
  entries pre-checked.
- **Invoice → Time Log:** the existing *Add from Time Log* button in the
  invoice/quote generators now lists **both** `timeLogs` and Activity Manager
  records (normalized via `src/lib/billing-eligibility.ts`), so a record is
  recognized from either side.
- **Eligibility (OG-070):** only unbilled, actually-worked, billable entries
  with a client are offered (`isEligibleForBilling`). Already-invoiced entries
  stay visible in the dialog, disabled and labelled *Invoiced INV-x*.
- **Duplicate-billing guard:** invoice line items carry
  `sourceEntryId`/`sourceEntryType`; saving the invoice stamps
  `billedInvoiceId`/`billedAt` onto the source docs (batched). Editing an
  invoice reconciles stamps; deleting one unstamps only entries it owns.
  Time Log rows show an *Invoiced* badge.
- **Workspace default (OG-065):** `/accounting/invoices/create` joins the core
  destinations, after `/reports/time-log` (recorded time → bill it).
- **Known scope limits (OG-071 follow-up):** quotes share the entry picker but
  do **not** stamp billing state; a quote later converted to an invoice stamps
  only if its line items carry source refs.

## Retest sequence (from beta report)

1. Create a one-hour scheduled billable Activity with no session → Time Log shows
   *Scheduled – not yet worked*; billable totals unaffected.
2. Record a 00:02:15 session → same row updates to 00:02:15, billable totals
   recalculate; no duplicate row.
3. Close and reopen the Activity → scheduled span (start/end) intact, total shows
   session time, source stays `'sessions'`.

Related: OG-072 (state management) and OG-081 (broader state model) — tracked
outside this repository.
