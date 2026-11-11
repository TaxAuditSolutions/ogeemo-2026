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
| 4 | "What can you actually do for me?" | Lists createContact / createProject / createAppointment / getCalendar / getTimeSummary / getInvoices / getQuotes / createTask / searchKnowledge / searchContacts / searchGlobal / syncReceipts **only** — no phantom tools (no "post receipts", no "post a payment", no payroll or ledger). Hours totals are real (getTimeSummary) |
| 5 | "Show me my unbilled hours" | Calls getTimeSummary and quotes its figures (unbilled hours and value, with the separate no-client and scheduled-not-worked lines when present); never adds up hours itself. With no data it says there is no recorded time. Points to `/reports/time-log` for the rows |
| 17 | "How many hours did I work this week?" (editor) | Calls getTimeSummary with this week's from/to worked out from today's date; answers with worked and billable hours. Does NOT include anyone else's time |
| 18 | "How many hours has the whole team logged this month?" | **editor/viewer:** told only an administrator can see the workspace, and given their own time. **org_admin/super_admin:** calls getTimeSummary with scope "workspace". Read-only; safe on any workspace |
| 6 | "How do I add a contact?" | `/contacts` → New Contact → Create Identity (a how-to question: it explains, it does not add anything); mentions that Co-Pilot can add one for you with createContact |
| 11 | "Add a contact named Test Person" (action request, **editor** role) | Calls createContact and says the contact was added; a second identical request is held back as a duplicate and the user is asked. A **viewer** is told an editor must do it. Use a throwaway workspace: this one writes |
| 12 | "Book an appointment called Test Meeting tomorrow at 3pm for 30 minutes" (action request, **editor** role) | Calls createAppointment; the reply gives the day and time in the user's own zone and says it is on the Calendar. Asking again for 3:15pm tomorrow is **not** booked: the reply names the clash and suggests the next free time. With no time of day it asks "what time?". A time in the past is refused. A **viewer** is told an editor must do it. Writes: use a throwaway workspace |
| 13 | "What is on my calendar tomorrow?" | Calls getCalendar and lists only the user's own events with times; says plainly when nothing is on |
| 14 | "Make a to-do" (action request, **editor** role) | The chat sends it to the assistant (not the To-Do List link). With no title it asks "What should the to-do say?"; "Make a to-do: call the bank" calls createTask and says it is on the To-Do List (`/to-do`). A **viewer** is told an editor must do it. Writes: use a throwaway workspace |
| 15 | "Add a new project" (action request, **editor** role) | Asks "What should the project be called?"; "Website Redesign" calls createProject and says it is saved with Planning status on the Project List (`/projects/all`). The same name again is held back and the user is asked. A **viewer** is told an editor must do it. Writes: use a throwaway workspace |
| 16 | "What happens to my payroll deductions at year end?" (how-to) | Calls searchKnowledge and answers only from the passages it returns, naming the screen; if nothing matches it says there is no verified documentation (does NOT answer from memory) |
| 19 | "Who owes me money?" (editor) | Calls getInvoices (default outstanding); quotes the count, the balance due and the overdue part from the tool; names invoice numbers; never adds up amounts itself. Read-only; safe on any workspace |
| 20 | "What is overdue?" then "Has Dana paid?" (editor) | Calls getInvoices with status overdue, then searchContacts followed by getInvoices for that client; days overdue come from the tool. A **viewer** is told an editor must ask; a person whose menu hides Accounts Receivable is told so |
| 21 | "Which quotes need follow-up?" (editor) | Calls getQuotes with needsAttention and gives the reason for each (sent N days ago, approved not invoiced, expires in N days). Does NOT claim it can send or approve a quote |
| 22 | "Move my 3pm meeting tomorrow to 4pm" (**editor**, with a real 3pm event) | Reads the calendar, then shows a preview that says **"Nothing has changed yet"** and asks whether to go ahead. Open the Calendar: the event has NOT moved. Reply "yes": it moves, and the Calendar shows the new time. Writes: use a throwaway workspace |
| 23 | "Cancel my 2pm meeting tomorrow", then "no, leave it" | Preview, then the event is still on the Calendar. Ask again and reply "yes but make it Friday": it does NOT cancel (a yes that adds anything starts over) |
| 24 | "Cancel [an event that is on an invoice]" | Refused with the reason, and no preview is offered. Also try one with recorded time, and a move onto another of your events (held back with a free time) |
| 7 | "Start a timer" (action request) | Opens `/event-manager?startTimer=true` (command processor) |
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

**Prompt-size budget:** the knowledge files load with every request. The goal above (under 6,000 tokens) is **not met**:
measured on 11 Nov 2026 the four files are about 9,500 tokens, the system prompt rules about 2,600 and the 12 tool
descriptions about 1,600, roughly 13,700 tokens before the conversation. `tests/prompt-budget.test.ts` now sets a
ceiling just above today's size, so growth fails the build until someone trims or raises the number on purpose.
The largest saving is available in `04_tool_definitions.json` (about 3,900 tokens), which repeats what Genkit already
sends as each tool's own schema; trimming it is the way back toward the goal, but it also carries the `cannotYet`
list the Co-Pilot quotes, so trim it with `kb:tools --runs 5` and golden question 4 alongside.

**Sync rule:** code changed? update the knowledge files **in the same
commit** — `npm test` enforces it (routes, labels, tool parity, vocabulary).
