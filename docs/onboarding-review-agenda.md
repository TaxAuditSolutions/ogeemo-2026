# Team/User Onboarding Review — Agenda

Purpose: the beta tester requires a focused review of User Manager, HR/team
functionality and Activity Manager *together* before prescribing the final
onboarding solution (the broader architecture item; OG-058 covers the immediate
Worker connection). This agenda structures that session. Background model:
`docs/people-model.md`.

## Ground truth going in (audited 2026-10)

- **31 auth users** exist across ~15 workspaces (mostly super-admins of test
  tenants who correctly have no Worker record).
- The tester's **Crew Lead = Alex Green** and **Crew Member = Jordan Lee**
  (workspace "Ogeemo Team") **were connected as Workers on 2026-10** via
  `scripts/connect-users-to-workers.ts` — both now satisfy the Activity
  Manager assignment contract (Employees folder + workerType).
- Shipped since the audit: people-model.md, the "Add to Workers" toggle
  (default on) in Add User, auto-filing/self-heal in payroll-service, the
  Sign-in column and Create Sign-in mirror on /workers, and the repair scripts.

## Walk-through (30 min, in the tester's prescribed order)

### 1. User Manager (~10 min)
- Create a test user with the **Add to Workers** toggle ON → observe the
  confirmation toast → open Activity Manager → confirm the person is
  selectable. (Acceptance item 1.)
- Create with the toggle OFF → confirm they are *not* selectable (intentional
  opt-out), and note the gap: **existing users** have no in-app conversion
  yet (Stage 3 item — only the script exists today).
- Review the directory picker step: it prefills but does not display link
  status — decide whether to add it.

### 2. People group / HR (~10 min)
- Workers page: Sign-in column, Create Sign-in mirror action.
- HR Hub cards → destinations (Employee Directory → /workers).
- Question: is "People" the right sidebar home for onboarding?

### 3. Activity Manager (~10 min)
- Selector grouping/search (recently upgraded) with the crew members present.
- Confirm assigned work flows down to Time Log and payroll.

## Decision sheet (leave the session with these answered)

| # | Decision | Options | Recommendation | Outcome |
|---|---|---|---|---|
| D1 | What are "Crew Lead"/"Crew Member"? | (a) job labels → `jobRole` field on Worker, shown in selectors · (b) role templates = access level + worker type + pay defaults · (c) both | **(c)** — job role and access are different axes | |
| D2 | Default access level for crew | editor today vs template-driven | keep editor until templates exist | |
| D3 | Worker-creation policy | explicit toggle (current) vs automatic for all members | **explicit toggle, default on** — respects contractors with no login | |
| D4 | Where onboarding lives | evolve Add User dialog vs dedicated Onboarding hub in the People group | decide after walkthrough | |

## Outputs

1. `people-model.md` updated to v2 recording D1–D4.
2. Written response on the tester's ticket referencing this review.
3. Stage 3 backlog scoped from the outcomes (existing-user "Add to Workers"
   action, jobRole field, hub vs dialog, directory link status).

## Acceptance checklist (hand to the tester)

- [ ] New user + toggle on → immediately assignable in Activity Manager
- [ ] New user + toggle off → not assignable (documented opt-out)
- [ ] Crew Lead (Alex Green) and Crew Member (Jordan Lee) assignable in the
      Ogeemo Team workspace
- [ ] Sign-in column on /workers reflects reality (email-matched)
- [ ] `docs/people-model.md` vocabulary matches what the tester sees in the UI
- [ ] Regression gate: 119 tests pass, tsc clean, key routes return 200
