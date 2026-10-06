# Ogeemo People & Onboarding Model

Ratified after the beta User Manager audit (OG-058 family): one clear vocabulary
for how a person exists across Ogeemo, and the onboarding flows that create or
connect the records. Enforced by code noted inline.

## The four terms

| Term | What it is | Answers |
|---|---|---|
| **User (login)** | Firebase Auth identity + custom claims (org, access level) + `users/{uid}` profile | Can they sign in? What can they access? |
| **Contact (person)** | The single source of truth for a human in the workspace (`contacts` collection) | Who is this person? |
| **Worker** | A Contact filed in the **Workers taxonomy** (system folders Workers → Employees / Contractors) with `workerType`, display-only `jobRole` (e.g. Crew Lead) and pay fields | Can they be assigned work, time, payroll? |
| **Access role** | `accessLevel` on the User (super_admin / org_admin / editor / viewer) — **orthogonal** to Worker status | What can they do in the app? |

Relationships:

- A **Worker may have no login** (subcontractor who never signs in).
- A **User may not be a Worker** (an accountant with view-only access).
- When a person is both, they are **one person, two connected records** —
  bridged by matching **email** (the Worker contact's `email` equals the
  user's login email). The Workers list shows the connection as the
  **Sign-in** column.
- Every person exists exactly once as a Contact (folder reflects their
  current role — moving someone into Employees/Contractors makes them a
  Worker without creating a duplicate).

## Onboarding flows

### 1. Admin creates a signed-in team member (User Manager → Add User)
- Toggle **"Add to Workers (team member)"** (default **on**) in the dialog.
- On create:
  - selected directory contact **or** contact with the same email is
    converted to a Worker (`updateWorker` — re-filed into the taxonomy);
  - otherwise a new Worker contact is created (`addWorker`), linked to the
    creating admin (`userId`) with the person's email.
- Opt out of the toggle when the person only needs app access (no work
  assignment).

### 2. Admin adds a Worker first (/workers → Add Worker)
- The Worker is created in the taxonomy automatically (see enforcement).
- Later, **Create Sign-in** (row menu on /workers) opens the Add User dialog
  pre-filled with the Worker's name/email — completing the other direction.

### 3. Enforcement (why "invisible workers" can't happen again)
- `addWorker` always files the contact: employee → Employees folder,
  contractor → Contractors folder (fallback Workers), via `ensureSystemFolders`.
- `updateWorker` **self-heals**: any worker-typed record outside the taxonomy
  is re-filed on save.
- `getWorkers` only queries the taxonomy — the folder is the contract.
- `scripts/fix-worker-folders.ts` audits and repairs historical data.

## Where each record surfaces

- **Activity Manager / Time Log worker selector** → Workers (taxonomy)
- **Payroll runs** → Workers (taxonomy)
- **Contacts Hub** → every person (any folder)
- **User Manager / app access** → Users only
- **/workers (People group)** → Workers, with the Sign-in column showing the
  User connection (matched by email)

## Adopted decisions (Stage 2 review, 2026-10)

- **D1 — (c): job role AND access are separate axes.** `jobRole` on the Worker
  is display-only (e.g. "Crew Lead"), shown in the Activity Manager worker
  selector, the Workers table (Role column) and the Add Worker form. The
  access level stays on the User.
- **D2 — `editor`** remains the default access level for crew until role
  templates exist.
- **D3 — explicit "Add to Workers" toggle, default on**; no automatic
  conversion of every workspace member.
- **D4 — evolve the Add User dialog** (no separate onboarding hub for beta).
  Existing logins are connected via the User Manager row action
  "Add to Workers", and the dialog's directory picker now shows
  Worker / Signed-in link status.

## Deferred to the focused onboarding review (Phase 3)

- Role templates ("Crew Lead" = access level + worker role + pay defaults)
- A single Onboarding hub under the People sidebar group
- Migrating the Add User dialog's "select from directory" step to also
  *display* the link status (currently the selection only prefills)
