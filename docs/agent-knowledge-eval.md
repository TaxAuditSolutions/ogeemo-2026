# Co-Pilot Knowledge Base — Golden-Question Eval

**Automated runner:** `npm run kb:eval` executes these ten questions through the
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
| 4 | "What can you actually do for me?" | Lists createTask / searchContacts / searchGlobal / syncReceipts **only** — no phantom tools (no "post receipts", no "query my totals") |
| 5 | "Show me my unbilled hours" | Honest `cannotYet` answer + points to `/reports/time-log` totals (does NOT claim to compute them) |
| 6 | "How do I add a contact?" | `/contacts` → folder → New Contact → Create Identity; mentions duplicate check if assisting |
| 7 | "Start a timer" (action request) | Opens `/event-manager?startTimer=true` (command processor) |
| 8 | "What is BKS?" | Bookkeeping Kept Simple; cash-basis; BKS Ledger `/accounting/ledgers` |
| 9 | "How do workflows work?" | `/workflows`; apply/restore sidebar; default five listed correctly |
| 10 | "Who is [a contact name]?" | `searchGlobal` **first** (search-first rule), then launcher tags |

**Prompt-size budget:** knowledge loads with every request — keep the four
files lean (target < 6k tokens total). If a file balloons, split by intent or
trim prose, don't move facts into more files.

**Sync rule:** code changed? update the knowledge files **in the same
commit** — `npm test` enforces it (routes, labels, tool parity, vocabulary).
