# Ogeemo audit and the Co-Pilot knowledge base: status report for Nick

**For:** Nick (co-developer, building the Co-Pilot)
**From:** Dan
**Repo state:** `main` at `cf3d5080`. 1,240 tests pass (114 test files). `tsc` is clean apart from one old scratch file.

## 1. Summary

1. We audited Ogeemo module by module, fixed what we found, and wrote tests for each fix.
2. While doing that we wrote down, per module, what Ogeemo actually does. That is now a knowledge base the Co-Pilot reads.
3. As a first test of the idea we gave the Co-Pilot the ability to **add a contact**. It worked, against live data, with the safeguards below.
4. The process is repeatable for the rest of Ogeemo. Section 5 lays it out as a recipe. Section 6 is the honest list of what is not done, including one scaling problem you will want to look at first.

## 2. The audit

25 commits on 8 and 9 November (`git log bac4e9fd^..cf3d5080`). Most are a module audit with fixes and tests; the rest are the clean-up tool, the deploys and the Co-Pilot changes:

- **Accounting (BKS):** ledger, tax and receipts; quotes and invoices (cents-exact totals, payment and conversion guards); bank reconciliation, payables, assets and payroll remittances; loans, equity and the balance sheet; inventory and point of sale; document numbering, receipt posting, payroll history and bank statements.
- **Contacts:** safe deletes, duplicate warning, search, folder rules, merge, and a block on deleting a contact that work still refers to.
- **Time and activities:** invoiced time is locked, running timers are protected, shortcut links are checked.
- **Archive and restore:** tasks and ideas keep their contents and have a Restore button.
- **Document Manager:** deleting a folder no longer strands its files; duplicate system folders merge.
- **AI and Genkit:** the tools now know who is asking, identity comes from the session and not the browser, fake data was removed, the image generator was fixed.
- **User permissions:** a removed or demoted user loses access at once; members cannot grant themselves roles; password reset is checked against the workspace.
- **Data clean-up:** `npm run access:cleanup` (report by default, named steps, JSON backup before any change). It was run once on live data: 2 stale accounts revoked, 3 dead memberships deleted, 24 broken references repaired, 3 login-less profiles and 3 empty workspaces removed, 81 folders and 42 files that belonged to no workspace removed, and one workspace given its Super Admin.

Firestore rules and the `updateUserAuth` and backup functions are deployed. The old `ogeemoAssistant` Cloud Function was deleted, and the chat route now goes straight to Genkit.

## 3. The knowledge base: two layers

**Layer 1: what the Co-Pilot reads today.** Four files in `src/ai/knowledge/`, about 27 KB, loaded into the system prompt on every request by `getKnowledgeBase()` in `src/ai/flows/ogeemo-chat.ts`:

| File | Purpose |
|---|---|
| `01_platform_identity.md` | What Ogeemo is, in product vocabulary |
| `02_ui_navigation_map.json` | Every module, route and label |
| `03_operational_qna.md` | Step-by-step how-to answers |
| `04_tool_definitions.json` | **Tool truth**: each tool, its inputs, its side effects, its auth, and a `cannotYet` list |

`tests/knowledge-base.test.ts` fails the build if these drift from the code: routes and labels must match the menu, every menu destination must be documented, and the tools listed in `04` must match the `defineTool` calls in the agent exactly.

**Layer 2: 95 entries, not yet read by the Co-Pilot.** JSON sources in `src/ai/knowledge-base/sources/` (17 modules, each entry has `routes`, `keywords`, `audiences` and `sourceFiles`). `npm run knowledge:sync` publishes them to Firestore (`knowledgeBaseChunks`); `retrieveKnowledge()` in `src/ai/knowledge-base/retrieve.ts` fetches and ranks them by keyword and route, with a fallback to the repo files. Today only the Knowledge Base page (`/api/knowledge-base/chat`) uses this layer. The Co-Pilot does not.

Entries are written from the audits, so they record the real rules (for example "the form checks for the same email or name and asks before saving") and the bugs that were fixed.

## 4. The first test: adding a contact

**What it was.** Before the change, "add a contact" made the Co-Pilot open the New Contact form and wait for a click. We replaced that with a `createContact` tool that saves the contact itself.

**Where the knowledge base fits, honestly.** The knowledge base did not write the contact; code did. What the knowledge base did was:

- tell the model what the tool is for and when to use it (`04_tool_definitions.json`, plus rules 16 and 17 in the agent prompt);
- hold the business rules the code enforces (only the name is required, the default folder, the duplicate check, Employees and Contractors go to `/workers`, never a SIN or pay rate);
- make the Co-Pilot **honest about its limits**: asked what it can do, it quotes the tool list and the `cannotYet` list word for word.

**The tool.** `src/ai/agent-contact-tool.ts` (handler) and `src/lib/ai-contact.ts` (pure rules). It follows the same shape as `createTask`:

- the user, workspace and role come from the server session, never from the model's arguments (`readToolContext`);
- a viewer is refused; the folder must belong to that workspace and defaults to Miscellaneous;
- a contact with the same email or name is not added until the user says so (`allowDuplicate`);
- the record is written with the same fields as the Contacts Hub (workspace, creator, trimmed fields, lower-case email, search keywords). The keyword builder is now shared (`src/lib/contact-keywords.ts`) so both find a contact by the same words;
- it replies "added" only when the write succeeded.

**Results.** 13 new unit tests (`tests/ai-contact.test.ts`, `tests/ai-contact-tool.test.ts`). We also ran the real agent against the Dan White Consulting workspace with a throwaway user, then deleted the test record (3 contacts before, 3 after):

| Request | Result |
|---|---|
| Viewer: "add a contact" | Refused; count unchanged |
| Editor: "add Zz Probe Contact, email, company" | Saved; correct workspace, folder, creator and keywords |
| Editor: same name again | Held back as a duplicate; the user is asked |
| Editor: "add Zz Probe Worker as an employee" | Sent to the Workers page |

Not tested: the signed-in chat in a browser, and the form-opening path (untouched). The change is committed (`cf3d5080`) but not rolled out to the live site yet.

## 5. Repeating this for the rest of Ogeemo

The recipe, per capability (for example "log time", "create an invoice", "create a project", "edit a contact"):

1. **Audit** the module so the rules are known and the bugs are fixed first. Done for most modules (section 2).
2. **Write the rule as a pure function** in `src/lib/`, with no Firebase and no model, so it can be unit tested. Example: `buildAiContact`.
3. **Write the handler** in `src/ai/agent-*.ts` taking `(db, ctx, input)`. Take identity from `ctx`, check the role, check that every id belongs to the workspace, refuse clearly, and never report success unless the write succeeded. Test it with `tests/fake-db.ts`.
4. **Register the tool** in `ogeemo-chat.ts` (`ai.defineTool` plus the `tools: [...]` list) and add a prompt rule for when to use it.
5. **Update the tool truth** in `04_tool_definitions.json`, the how-to in `03_operational_qna.md`, and the matching Knowledge Base entry. `npm test` fails if `04` and the tools disagree.
6. **Probe it live** against a throwaway user and clean up after, as in section 4. `npm run kb:eval` runs the golden questions (`docs/agent-knowledge-eval.md`; question 11 is the contact write).
7. Commit, then `npm run knowledge:sync`.

Good next candidates, in rough order of value and safety: read-only tools for time logs, unbilled totals and invoice lists (the biggest gap); update and cancel for tasks and events; contact edit as a direct tool; then writes that touch money (invoices, quotes, payroll), which should keep a confirm step.

## 6. What is not done, and where I would like your help

1. **The 95 Knowledge Base entries do not reach the Co-Pilot.** It only reads the four files. As the tool count grows, those four files will not hold the detail. The Layer 2 retrieval already exists, so the likely answer is a `searchKnowledge` tool (or retrieval injected per request) over `retrieveKnowledge()`. That is the design decision I would most like your view on.
2. **Prompt size.** All four files are loaded on every request (about 27 KB). `agent-knowledge-eval.md` sets a budget of under 6k tokens; we should measure before adding much more.
3. **Two sources of truth.** The four files and the 95 entries overlap. The tests keep the four files honest, but nothing yet checks the 95 entries against the code.
4. **Contact editing is still UI-assisted** (the older form flow). It is the next obvious tool.
5. **The Co-Pilot cannot read business data** (time logs, invoices, payroll) or edit and delete tasks. Listed in `cannotYet`.
6. **Browser end-to-end check** of the chat is still to do, and the latest rollout (`cf3d5080`) has not been started.
7. **Housekeeping:** `ogeemoAssistant` is retired; the `OGEEMO_ASSISTANT_URL` secret can be deleted from Secret Manager; `scripts/verify-critical-guides.ts` now needs `OGEEMO_API_URL`.

## 7. Where things are

| What | Where |
|---|---|
| Agent, tools, prompts | `src/ai/flows/ogeemo-chat.ts` |
| Tool handlers | `src/ai/agent-tools.ts`, `agent-task-tool.ts`, `agent-contact-tool.ts` |
| Pure rules | `src/lib/ai-contact.ts`, `ai-task.ts`, `ai-runtime.ts`, `ai-input.ts` |
| Four prompt files | `src/ai/knowledge/` |
| 95 Knowledge Base entries | `src/ai/knowledge-base/sources/*.json` |
| Retrieval | `src/ai/knowledge-base/retrieve.ts`, `retriever.ts` |
| Chat route | `src/app/api/ogeemo-assistant/route.ts` |
| Golden questions | `docs/agent-knowledge-eval.md`, `npm run kb:eval` |
| Data clean-up | `npm run access:cleanup` (see the header of `scripts/clean-access-data.ts`) |
| Commands | `npm test`, `npm run knowledge:sync`, `npm run kb:eval` |
