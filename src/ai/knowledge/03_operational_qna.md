# Operational Q&A (Lead-to-Ledger)

<!--
  Generated-from-code knowledge for the Co-Pilot prompt. Steps reference real
  routes from 02_ui_navigation_map.json; enforced by tests/knowledge-base.test.ts.
  Update in the SAME COMMIT as workflow changes. Answer "how do I..." questions
  from this file; execute only what 04_tool_definitions.json permits.
-->

## Contacts & Relationships
**How do I add a contact?** Contacts Hub (`/contacts`) → pick a contact folder → **New Contact** → complete the form → **Create Identity**. Requires Editor or higher. Folders act as categories; every contact must land in one.
**How do I update a contact?** `/contacts` → search/browse → open the row or action menu → **Edit Contact** → change fields → **Save Changes**.
**Assisted (Co-Pilot) creation:** gather minimum info (full name + folder), check for likely duplicates by name/email first, prepare the form pre-filled — the contact is only created when the user clicks **Create Identity**; cancelling creates nothing.
**Confidential fields (SIN, pay rate, dates):** chat history is retained — warn the user and get explicit consent before accepting them; otherwise leave blank for manual entry. Never choose tenant, audit or folder IDs.
**Assigning contact owners:** edit the contact record (owner/assignment fields live on the contact form).

## Projects & Tasks
**How do I create a project?** Projects (`/projects/all`) → create, link client and details; Project Status (`/project-status`) shows progress.
**How do I make a task?** To-Do List (`/to-do`) for personal tasks; Activity Manager (`/event-manager`) for work sessions — or ask Co-Pilot to `createTask` (it writes a to-do; scheduled when start/end times are given).
**How do I set task due dates?** Give Co-Pilot an explicit date/time for `createTask`, or edit the task on its board.
**Action-to-Protocol:** park ideas on the Idea Board (`/idea-board`), then schedule them into time slots (Calendar `/calendar` or Activity Manager) to make them billable work.

## Time & Activity
**How do I start tracking time?** Say "timer" / "start timer" (opens `/event-manager?startTimer=true`) or open the Activity Manager and start the session there.
**How do I log time after the fact?** Time Log Report (`/reports/time-log`) → **+ Log Time Event** (start/end, worker, client, billable rate, notes).
**Where do I see accumulated/billable time?** Worker Time Log Report (`/reports/time-log`): totals for Total Hours, Billable Hours and Total Billable Amount; click a worker's name to drill into their entries; **All Workers** clears the filter. It is also in the default sidebar Workspace group.
**How do I schedule work?** Activity Manager → *Add scheduling & billing details* (defaults to today + current time; End follows Start), or click a Calendar (`/calendar`) slot.
**Worker documents:** Time Log Report → row menu → *View Worker Documents*; with a worker selected, the **Documents** button appears above the table.

## Sales & Invoicing (Quote → Invoice)
**How do I quote a client?** Create Quote (`/accounting/quotes/create`) with items from Products & Services (`/accounting/service-items`); manage/convert in Quote Manager (`/accounting/quotes`) — accepted quotes convert to invoices.
**How do I invoice?** Create Invoice (`/accounting/invoices/create`); track payment in Accounts Receivable (`/accounting/accounts-receivable`).
**How do I process receipts?** Receipt Intake (`/accounting/receipt-processor`) turns scans into ledger entries; say "sync receipts" to have Co-Pilot call `syncReceipts` (it scans the Drive Receipts folder and lists files ready for extraction).
**Bills I owe?** Accounts Payable (`/accounting/accounts-payable`).

## Bookkeeping (BKS)
**Cash vs accrual:** BKS Ledger (`/accounting/ledgers`) is cash basis — record when money moves. Accrual view (`/accounting/accrual-accounting`) records when earned/incurred (AR/AP track the difference).
**Petty cash:** `Accounting → Petty Cash` logs the physical float (Cash In/Out) before **Posting to the GL**.
**Income/expenses:** Manage Income / Manage Expenses (`/accounting/ledgers?tab=income|expenses`). **Tax:** Tax Center (`/accounting/tax`), Sales Tax Calculator (`/accounting/tax/sales-tax`).

## Documents (Dual-Mirror)
**How do I link Google Drive?** Document Manager (`/document-manager`): create an "Ogeemo" master folder in Drive, mirror the protected folders (Clients, Family, Friends, Miscellaneous, Ogeemo Users, Prospects, Suppliers, Contract Workers, Employee Workers, Images, Marketing, Ogeemo Notes, Knowledge Base), paste each share link into **Link Google Drive Folder**.
**File naming protocol:** `YYYYMMDD Client Name, Subject, Initial, v#` (e.g. `20260225 John Smith Subject line JS and v1`) — keeps chronology and audit trails intact.

## People & Administration
**Add a worker (to assign/pay work):** Workers (`/workers`) → Add Worker (name is the only required field; save works with blank optional fields). Time Off / Leave: `/hr-manager/time-off`. Field App: `/field-app`.
**Team accounts:** User Manager (`/user-manager`, admin only): add users, change roles, reset passwords. Access is role-based (viewer < editor < org_admin < super_admin); keep users inside their tenant.
**Payroll:** Run Payroll (`/accounting/payroll/run`), History (`/accounting/payroll/history`).

## Reports
- **Work Activity Summary** (`/reports/work-activity`): digest of all operational actions.
- **Client Statement** (`/reports/client-statement`): billable time/expenses per client, audit-ready.
- **Worker Time Log Report** (`/reports/time-log`): chronological worker time ledger (see Time & Activity).
- **Client Time Log Report** (`/reports/client-time-log`): time by client.
- **Advanced Search** (`/reports/search`): cross-record search.

## Personalization
**Customize shortcuts:** Customize My Shortcuts (`/action-manager/manage`) or Settings → My Shortcuts — drag chips between Available/Selected, then **Save Order** (changes are NOT automatic). Quick Navigation in the Accounting/HR Hubs follows the same drag pattern (`/accounting/manage-navigation`, `/hr-manager/manage-navigation`) and also needs **Save Order**.
**Workflows:** Workflows (`/workflows`) — build a named, ordered destination set (drag or click to add steps), then **Apply to sidebar** to make the Workspace group follow it; **Restore default Workspace** returns the standard five (Contacts → Projects → Activity Manager → Calendar → Time Logs).

## Navigation Commands (command processor)
Natural-language phrases map to routes: "timer/start timer/log time" → Activity Manager timer; "activity manager/time manager" → `/event-manager`; "my shortcuts/dashboard" → `/action-manager`; "ledger/books" → BKS Ledger; "income"/"expense" → ledger tabs; "tax" → Tax Center; "co-pilot/ogeemo ai" → `/co-pilot`.

