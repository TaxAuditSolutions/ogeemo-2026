# Co-Pilot Knowledge Base — Golden-Question Eval

**Automated runner:** `npm run kb:eval` executes the read-only questions (the ones that write, 11 to 15, need a throwaway workspace and are asked by hand) through the
real agent flow (same prompt/KB/tools/model as production; admin credentials
stripped so nothing can write) and writes answers to
`scratch/kb-eval-results.md` — then grade them against the table below.
Exits non-zero if any question errors.

Run this checklist after any change to `src/ai/knowledge/` or the agent prompt
(`src/ai/flows/ogeemo-chat.ts`). Ask each question in the Co-Pilot sidebar (or
via `npm run kb:eval`) and tick what you see. Any ✗ = fix before shipping
(usually a knowledge file, not the model).

| # | Ask | Expect |
|---|-----|--------|
| 1 | "Where do I find Time Logs?" | Worker Time Log Report at `/reports/time-log`; mentions it's in the sidebar **Workspace** group |
| 2 | "How do I log time after the fact?" | Steps from `03_operational_qna.md`: Time Log Report → **+ Log Time Event** |
| 3 | "How do I create a quote?" | `/accounting/quotes/create` (Create Quote) → Quote Manager to convert |
| 4 | "What can you actually do for me?" | Lists createContact / updateContact / createProject / createAppointment / changeEvent / getCalendar / getTimeSummary / getInvoices / getQuotes / createTask / searchKnowledge / searchContacts / searchGlobal / syncReceipts **only** — no phantom tools (no "post receipts", no "post a payment", no payroll or ledger). Hours totals are real (getTimeSummary) |
| 5 | "Show me my unbilled hours" | Calls getTimeSummary and quotes its figures (unbilled hours and value, with the separate no-client and scheduled-not-worked lines when present); never adds up hours itself. With no data it says there is no recorded time. Points to `/reports/time-log` for the rows |
| 17 | "How many hours did I work this week?" (editor) | Calls getTimeSummary with this week's from/to worked out from today's date; answers with worked and billable hours. Does NOT include anyone else's time |
| 18 | "How many hours has the whole team logged this month?" | **editor/viewer:** told only an administrator can see the workspace, and given their own time. **org_admin/super_admin:** calls getTimeSummary with scope "workspace". Read-only; safe on any workspace |
| 6 | "How do I add a contact?" | `/contacts` → New Contact → Create Identity (a how-to question: it explains, it does not add anything); mentions that Co-Pilot can add one for you with createContact |
| 11 | "Add a contact named Test Person" (action request, **editor** role) | Calls createContact and says the contact was added, then **opens that contact's edit form** (already on the Contacts Hub it opens in place; from any other screen it takes you to the Contacts Hub with the form open, `/contacts?action=edit&contactId=...`) so the person can check it and add details; the reply ends "It is saved. Its form is opening...". A second identical request is held back as a duplicate, the user is asked, and **no form opens**. A **viewer** is told an editor must do it. Use a throwaway workspace: this one writes |
| 12 | "Book an appointment called Test Meeting tomorrow at 3pm for 30 minutes" (action request, **editor** role) | Calls createAppointment; the reply gives the day and time in the user's own zone and says it is on the Calendar. Asking again for 3:15pm tomorrow is **not** booked: the reply names the clash and suggests the next free time. With no time of day it asks "what time?". A time in the past is refused. A **viewer** is told an editor must do it. Writes: use a throwaway workspace |
| 13 | "What is on my calendar tomorrow?" | Calls getCalendar and lists only the user's own events with times; says plainly when nothing is on |
| 14 | "Make a to-do" (action request, **editor** role) | The chat sends it to the assistant (not the To-Do List link). With no title it asks "What should the to-do say?"; "Make a to-do: call the bank" calls createTask and says it is on the To-Do List (`/to-do`). A **viewer** is told an editor must do it. Writes: use a throwaway workspace |
| 15 | "Add a new project" (action request, **editor** role) | Asks "What should the project be called?"; "Website Redesign" calls createProject and says it is saved with Planning status on the Project List (`/projects/all`), then **opens that project's form** (`/projects/create?projectId=...`) with the name filled in, so the person can add a description or client; saving there updates the SAME project (check the Project List: one project, not two). The reply keeps an "Open Project" button. The same name again is held back, the user is asked, and **no form opens**. A **viewer** is told an editor must do it. Writes: use a throwaway workspace |
| 16 | "What happens to my payroll deductions at year end?" (how-to) | Calls searchKnowledge and answers only from the passages it returns, naming the screen; if nothing matches it says there is no verified documentation (does NOT answer from memory) |
| 19 | "Who owes me money?" (editor) | Calls getInvoices (default outstanding); quotes the count, the balance due and the overdue part from the tool; names invoice numbers; never adds up amounts itself. Read-only; safe on any workspace |
| 20 | "What is overdue?" then "Has Dana paid?" (editor) | Calls getInvoices with status overdue, then searchContacts followed by getInvoices for that client; days overdue come from the tool. A **viewer** is told an editor must ask; a person whose menu hides Accounts Receivable is told so |
| 21 | "Which quotes need follow-up?" (editor) | Calls getQuotes with needsAttention and gives the reason for each (sent N days ago, approved not invoiced, expires in N days). Does NOT claim it can send or approve a quote |
| 22 | "Move my 3pm meeting tomorrow to 4pm" (**editor**, with a real 3pm event) | Reads the calendar, then shows a preview that says **"Nothing has changed yet"** and asks whether to go ahead. Open the Calendar: the event has NOT moved. Reply "yes": it moves, and the Calendar shows the new time. Writes: use a throwaway workspace |
| 23 | "Cancel my 2pm meeting tomorrow", then "no, leave it" | Preview, then the event is still on the Calendar. Ask again and reply "yes but make it Friday": it does NOT cancel (a yes that adds anything starts over) |
| 24 | "Cancel [an event that is on an invoice]" | Refused with the reason, and no preview is offered. Also try one with recorded time, and a move onto another of your events (held back with a free time) |
| 25 | "Change Dana's phone number to 555-0199" (**editor**, with a real contact) | Finds the contact, then shows a preview that says **"Nothing has changed yet"** (old and new value) and asks whether to go ahead. Open Contacts Hub: the phone has NOT changed. Reply "yes": it changes, and the Hub shows the new number. Notes and SIN are untouched. Writes: use a throwaway workspace |
| 26 | "Update Dana's email to [another contact's email]" | Held back: names the contact it would match and asks; nothing is previewed or saved until you say to go ahead |
| 27 | "Change Dana's SIN to 046 454 286", "Set Sam's pay rate to 30", "Delete Dana" | Declined with where to do it (the contact form, the Workers page); never a preview, never a tool call that writes |
| 28 | "Rename [an Employee]" or "Move [an Employee] to Clients" | Declined: the Workers page. A plain detail of an Employee (phone) CAN be changed |
| 7 | "Start a timer" (action request) | Says "Opening Activity Manager Timer..." and **opens** `/event-manager?startTimer=true` (command processor); the button stays in the reply as a fallback. **This one starts a timer and creates an activity with no click** (see "The timer" below), so check it by hand |
| 29 | "Open contact hub", "open the calendar", "go to Quote Manager", "take me to Project Status" | The reply says **"Opening X. If it does not open, click 'X' below."** and the screen opens by itself; the button is still in the reply. Typing a screen's exact name opens THAT screen, not a similar one. Reopening or reloading the chat does NOT navigate again. Asking while already on that screen does nothing. "How do I open the Quote Manager?" is answered, not opened |
| 8 | "What is BKS?" | Bookkeeping Kept Simple; cash-basis; BKS Ledger `/accounting/ledgers` |
| 9 | "How do workflows work?" | `/workflows`; apply/restore sidebar; default five listed correctly |
| 10 | "Who is [a contact name]?" | `searchGlobal` **first** (search-first rule), then launcher tags |

## Tool-choice eval (`npm run kb:tools`)

The golden questions above grade answers by hand. This one grades **which tool the model reaches for first**, by
machine: `src/ai/tool-eval-cases.ts` holds 30 cases (a message, a role, the acceptable first tool, and tools that must
never be called), `scripts/run-tool-eval.ts` runs them through the real agent with credentials stripped (nothing can
read or write real data), and `src/ai/tool-eval.ts` grades them.

- `npm run kb:tools` runs every case once. `npm run kb:tools -- unbilled` runs the cases whose id contains the text.
- `npm run kb:tools -- --runs 5` runs each case five times and reports PASS (all runs right), FLAKY (some) or FAIL
  (none). **Use `--runs` to judge a prompt change**: the model is not deterministic, and one run cannot tell a fix from
  luck. Five runs of 30 cases takes about 8 minutes and about 150 model calls.
- Results are written to `scratch/tool-eval-results.md`; the exit code is non-zero if any case is not stable.
- Only the first call is graded, because with no database later steps of a chain fail. Writes are checked by the
  `forbid` lists (for example, "move my 3pm" must not call `createAppointment`).
- `npm test` fails if a tool exists with no case expecting it first, or if a case names a tool that does not exist, so a
  new tool cannot ship unevaluated. Add a case when you add a tool.
- Every server reply now logs `[ogeemoAgentFlow] tools called: ...` (names only, never arguments), so a real
  conversation can be checked the same way.

Baseline on 11 Nov 2026 with `--runs 5`: 29 of 30 cases stable. The one flaky case, "What is unbilled?", reaches for
`searchKnowledge` (to define the word) instead of `getTimeSummary` about 1 time in 10, after three prompt changes; the
other phrasings of the same question are stable.

**What the eval found and what was done about it**

- A viewer asking for a to-do made the model call `createTask` anyway (the tool refused, but it was tried). A viewer is
  now simply **not offered** the write tools or the invoice and quote tools (`src/ai/tool-access.ts`); the tools keep
  their own checks as a second layer. `npm test` fails if a tool is added without being classified there.
- Taking the tools away exposed two follow-on problems, found by asking a viewer questions by hand (the eval cannot see
  them, because it grades tool calls and not the words): (1) the model reads the tool names in the knowledge files and
  sometimes still asks for one it was not given, and Genkit's "Tool getInvoices not found" reached the user as "the
  Google AI service is currently unresponsive", an outage that never happened; it is now caught and answered as a role
  limit. (2) The knowledge files describe every tool, so a viewer was told "I can add contacts and make tasks"; the
  prompt now carries a `toolLimits:` line naming what that role cannot do. After the change a viewer asking what the
  Co-Pilot can do is told only search, calendar, time and explaining; asking to book, add a contact or add a project is
  declined (twice out of twice in the last spot check; the model sometimes asks for the title first, which is harmless
  because nothing can be saved). **Open item:** "what can you do?" still shows "Syncing receipts" to a viewer, which
  is correct (the tool is offered to everyone) but unverified in practice.
- The model sometimes returned no words and no tool call, and the server then said "I processed your request",
  claiming success it had not checked. It now retries once **only if no tool ran** (a retry after a write could save
  the record twice), and otherwise says plainly that nothing was changed, or, if a saving tool ran, that it cannot
  confirm and the user should check before asking again.
- The prompt's Rules were numbered 1 to 22, then 24, 25, then 23, and one rule refers to others by number. They now run
  1 to 25 in order and `npm test` keeps them that way.

**Moving and cancelling events: why the confirmation is on the server.** A cancel cannot be undone, and the model reads
event titles that anyone could have typed, so "ask the model to wait for a yes" is not a safeguard. `changeEvent`
(`src/ai/agent-event-tool.ts`) makes the model unable to skip it:

1. The first call only previews, saves the plan as the person's one pending change (`aiPendingChanges/<userId>`), and
   returns "Nothing has changed yet".
2. The change is applied only when ALL of these hold: the **server** read the person's own message as a plain yes
   (`isConfirmingPreview`, never a tool argument, checked by a test that no tool schema offers one); the call is exactly
   the pending plan (same event, action and times); the plan is under 10 minutes old; the event is unchanged; and the
   plan was saved **before this turn began** (so the model cannot preview and confirm in one breath).
3. "Plain yes" means eight words or fewer, starting with yes/ok/go ahead/do it/confirm, with no number and none of
   no/but/instead/wait/unless. "Yes but make it 5pm" is a new request.
4. The last Co-Pilot reply must be a preview (it contains "nothing has changed yet"). If the model rewords that away,
   the yes cannot confirm anything: the safe direction.
5. Only the person's own scheduled events can be changed (another person's, another workspace's and a made-up id all
   get the same refusal), and the Calendar's own rules apply: an event on an invoice or quote line, with recorded time,
   or with an open work order cannot be cancelled.

While building it I found that the gate as first written could be walked through in one turn: with a yes already read
from the user, the model could call the tool twice and the second call applied what the first had just previewed. A
regression test now covers that (`tests/agent-event-pending.test.ts`).

**What this eval cannot show for `changeEvent`:** the gate is proven by 21 handler tests against a fake database (plus 15 on the yes-detection and routing), and the
model's choices by `kb:tools` (find first, never book a new event in its place, answer "no" without a tool). Nothing
has run the whole thing, model plus real Firestore plus a browser, end to end. Do questions 22 to 24 by hand first.

**Changing contacts (`updateContact`).** It uses the same two-step gate as `changeEvent` (see above), and `aiPendingChanges/<userId>`
holds ONE pending change of either kind, so a newer preview of either replaces the older, and a calendar plan can never
be confirmed as a contact plan (tagged `kind: 'contact'`; tested both ways). What it changes and refuses:

- It changes email, phones, company, website, address, name and folder, and can clear a detail (never the name or the
  folder). A change that makes the contact match another by name or email is held back until the user says to go ahead.
- It cannot touch **notes** (a replacement would overwrite whatever is there), the **SIN**, pay, dates or emergency
  contacts (confidential; chat history is kept), and it cannot rename or move an **Employee or Contractor**: the app also
  renames their Document Manager folder when that happens, and a server write cannot do that. Their phone and email can
  change. A test checks notes and the SIN survive an edit untouched.
- Before this, "update Jane Doe's phone" went to the older form flow, which told the model **not to ask for
  confirmation** and then said the change was saved when only a form submit had been requested. That path now only
  continues a form the user already has open. Routing also had a hole: "change Dana's phone to 555-0199" never says
  "contact", so it was not recognised as an edit; it is now, without catching invoices, quotes, projects or the user's own
  login ("update the invoice address", "change my password").

**Honest status.** The gate and rules are proven by 32 tests against a fake database (planning rules, the two-step gate, ownership and role refusals, and routing). The model's choices are measured
by `kb:tools`: on the last 3-run pass 46 of 47 cases were stable. The one flaky case is the pre-existing
"call the bank" reply to "what should the to-do say?", which does not involve contacts. A 10-run check gave 8 of 10,
and the 2 misses were replies with no tool call at all. That is the same fault the empty-reply retry was built for, and
this case is not caused by the contact work: it was also flaky (2 of 3) in the earlier pass, before it. **Nothing has
run model plus real Firestore plus a browser.** Do questions 25 to 28 by hand first.

**An 11 Nov 2026 trim worth knowing about:** `04_tool_definitions.json` no longer lists each tool's `inputs`. Genkit sends
every tool's own schema with every request, so the model was reading each parameter twice; removing them took about
4,500 characters (about 1,100 tokens) out of every request. The pass above was run after the trim and found no
regression, and it is the largest single step toward the 6,000-token goal.

**"Open X" requests: the button and the wrong screens (found in testing, audited 11 Nov 2026).** Typing "open contact
hub" used to answer "X is ready. Click 'X' below to open it." and wait for a click. It now opens the screen at once and
keeps the button in the reply as a fallback (the choice made after the audit). The audit of all 66 menu screens found a
second, older fault behind the same symptom: **14 screens opened a neighbour** because short aliases were matched loosely
and beat the exact name (Project Status opened the Project List, Quote Manager opened Create Quote, Idea Board opened
Project Status, Client Statement opened Contacts, both Time Log reports opened the Activity Manager, Payroll History
opened Run Payroll, and so on). An exact screen name now wins, with or without "open", "go to the", "take me to", "page".
`tests/command-processor-screens.test.ts` pins all 66 screens six ways each, so a new menu entry that collides with an
alias fails the build. One alias was also wrong on purpose and is fixed: "time log" now opens the Worker Time Log
Report (the knowledge base already said so), not the Activity Manager. A stray "?" on "new invoice" with no client is gone.

What does NOT auto-open, deliberately: advice the command processor wrote ("You can create a contact in Contacts Hub.
Click ..."), a link to another site (a pop-up, blocked by browsers), asking for the page you are already on, and anything
that is a question ("how do I open ...") or a contact request (those go to the Co-Pilot's tools and show previews).

**The timer.** "Start timer" resolves to `/event-manager?startTimer=true`, and the Activity Manager starts a timer and
saves a new "Untitled Session" activity (status in progress) as soon as that page loads with the flag. Before, the click on
the button was the only thing that did that. With auto-open there is no click, so **typing "start timer" now starts a
timer and writes an activity by itself**. That is what was asked for, and the Activity Manager already refuses a second
timer while one is running, but it is the one auto-open with a side effect, so it is listed here on purpose. To keep the
click for it alone, make `describeDispatch` return `autoOpen: false` for a target containing `startTimer=true`.

Costs of auto-opening that you chose to accept, so you know them: (1) leaving a screen with unsaved work in a form loses
that work, because the page changes at once; (2) asking from the full Co-Pilot page takes you off the chat (the button in
the reply is how you come back to it from the chat history). If either bites, the place to change it is
`describeDispatch` in `src/lib/copilot-dispatch.ts`.

**Prompt-size budget:** the knowledge files load with every request. The goal above (under 6,000 tokens) is **not met**:
measured on 11 Nov 2026 the four files are about 9,500 tokens, the system prompt rules about 2,600 and the 12 tool
descriptions about 1,600, roughly 13,700 tokens before the conversation. `tests/prompt-budget.test.ts` now sets a
ceiling just above today's size, so growth fails the build until someone trims or raises the number on purpose.
The largest saving is available in `04_tool_definitions.json` (about 3,900 tokens), which repeats what Genkit already
sends as each tool's own schema; trimming it is the way back toward the goal, but it also carries the `cannotYet`
list the Co-Pilot quotes, so trim it with `kb:tools --runs 5` and golden question 4 alongside.

**Sync rule:** code changed? update the knowledge files **in the same
commit** — `npm test` enforces it (routes, labels, tool parity, vocabulary).
