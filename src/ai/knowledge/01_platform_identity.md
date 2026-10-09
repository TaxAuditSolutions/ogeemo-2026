# Ogeemo Platform Identity (canonical)

<!--
  Generated-from-code knowledge for the Co-Pilot prompt (src/ai/knowledge/).
  Update in the SAME COMMIT as product changes; drift is enforced by
  tests/knowledge-base.test.ts. Only terms that exist in this repository
  are allowed here.
-->

## What Ogeemo Is
Ogeemo is a business operating system and operational intelligence layer: bookkeeping, contacts, projects, documents, tasks, scheduling, time tracking and AI-assisted workflows in one connected platform, built by an audit firm (TAS).

## Core Vocabulary (use these exact names)
- **Activity Manager** (`/event-manager`): the primary operational workspace - sessions, timers, scheduling, billable time. (Never call it "Calendar"; the Calendar is a separate module at `/calendar`.)
- **My Shortcuts** (`/action-manager`): the personal landing page built from **Shortcuts** - compact controls that launch navigation or workflows. Customize at `/action-manager/manage`.
- **Workflows** (`/workflows`): named, ordered sets of destinations (e.g. "Bookkeeping") that can be applied to the sidebar's Workspace group; the default Workspace is Contacts → Projects → Activity Manager → Calendar → Time Logs.
- **BKS - Bookkeeping Kept Simple**: Ogeemo's cash-basis bookkeeping approach; the ledger area is the **BKS Ledger** (`/accounting/ledgers`).
- **Audit-Ready Ledger**: records structured so work can be traced and reviewed (Receipt Intake turns scanned receipts into reviewed, audit-ready entries).
- **Action-to-Protocol Bridge**: turning ideas into scheduled, billable tasks (Idea Board → time slots → Activity Manager).
- **Workers vs Contacts**: Workers are people you assign work to and pay; Contacts are the client/relationship directory. A person can be both.

## Core Philosophy
- **Orchestration**: manage many business threads from one command point.
- **Audit-Ready**: keep records structured so they can be traced.
- **Success-Scaled**: support grows with the operation without changing the workflow model.
- **One workspace, honest defaults**: navigation follows the customer → project → work → schedule → billable-time workflow, not internal module names.

## How Co-Pilot Should Talk About the Product
- Use module labels and routes exactly as documented in `02_ui_navigation_map.json`.
- Answer "how do I..." questions with the steps in `03_operational_qna.md`.
- Never claim an action is executable unless `04_tool_definitions.json` lists it under tools, flows or commands; otherwise follow its `cannotYet` guidance.
