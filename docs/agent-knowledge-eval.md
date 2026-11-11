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
| 7 | "Start a timer" (action request) | Opens `/event-manager?startTimer=true` (command processor) |
| 8 | "What is BKS?" | Bookkeeping Kept Simple; cash-basis; BKS Ledger `/accounting/ledgers` |
| 9 | "How do workflows work?" | `/workflows`; apply/restore sidebar; default five listed correctly |
| 10 | "Who is [a contact name]?" | `searchGlobal` **first** (search-first rule), then launcher tags |

**Prompt-size budget:** knowledge loads with every request — keep the four
files lean (target < 6k tokens total). If a file balloons, split by intent or
trim prose, don't move facts into more files.

**Sync rule:** code changed? update the knowledge files **in the same
commit** — `npm test` enforces it (routes, labels, tool parity, vocabulary).
