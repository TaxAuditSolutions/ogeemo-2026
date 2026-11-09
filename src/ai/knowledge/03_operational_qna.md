# Operational Q&A (Lead-to-Ledger)

<!--
  Generated-from-code knowledge for the Co-Pilot prompt. Steps reference real
  routes from 02_ui_navigation_map.json; enforced by tests/knowledge-base.test.ts.
  Update in the SAME COMMIT as workflow changes. Answer "how do I..." questions
  from this file; execute only what 04_tool_definitions.json permits.
-->

## Contacts & Relationships
**How do I add a contact?** Contacts Hub (`/contacts`) → **New Contact** → complete the form → assign a role/folder → **Create Identity**. A valid Role Assignment is required; if no folder is chosen, the tenant's default folder is assigned. Requires Editor or higher. Folders are categories that group contacts.
**How do I update a contact?** `/contacts` → search/browse → open the row or action menu → **Edit Contact** → change fields → **Save Changes**.
**Assisted (Co-Pilot) creation:** ask Co-Pilot to add the contact (for example "add Jane Doe, jane@acme.com, in Clients") and it uses `createContact` to save it straight away. Only the name is needed; if no folder is named, the workspace default folder is used. Editors and administrators only. It checks for the same email or name first and, if it finds one, adds nothing and asks you whether to add another anyway. It does not add Employees or Contractors (use Workers, `/workers`, so pay and Document Manager setup are done) and never takes a SIN, pay rate or dates.
**Confidential fields (SIN, pay rate, dates):** chat history is retained — warn the user and get explicit consent before accepting them; otherwise leave blank for manual entry. Never choose tenant, audit or folder IDs.
**Assigning contact owners:** edit the contact record (owner/assignment fields live on the contact form).

## Projects & Tasks
**How do I create a project?** Projects (`/projects/all`) → create, link client and details; Project Status (`/project-status`) shows progress.
**How do I make a task?** To-Do List (`/to-do`) for personal tasks; Activity Manager (`/event-manager`) for work sessions - or ask Co-Pilot to `createTask` (editors and administrators only). It saves a to-do, or a scheduled event when you give a start time; "tomorrow at 3" is worked out from today's date and your time zone.
**How do I set task due dates?** Tell Co-Pilot the date and time (for example "tomorrow at 3pm") when you ask for `createTask`, or edit the task on its board.
**Action-to-Protocol:** park ideas on the Idea Board (`/idea-board`), then schedule them into time slots (Calendar `/calendar` or Activity Manager) to make them billable work.

## Time & Activity
**How do I start tracking time?** Say "timer" / "start timer" (opens `/event-manager?startTimer=true`) or open the Activity Manager and start the session there.
**How do I log time after the fact?** Time Log Report (`/reports/time-log`) → **+ Log Time Event** (start/end, worker, client, billable rate, notes).
**Where do I see accumulated/billable time?** Worker Time Log Report (`/reports/time-log`): totals for Total Hours, Billable Hours and Total Billable Amount; click a worker's name to drill into their entries; **All Workers** clears the filter. It is also in the default sidebar Workspace group.
**How do I book an appointment?** Ask Co-Pilot, for example "book a meeting with Dana tomorrow at 3pm for 30 minutes" (it uses `createAppointment`; editors and administrators only). It needs a day and a time of day, and the length is an hour unless you say otherwise. It checks your own calendar first: if the time overlaps one of your events it books nothing, tells you what it overlaps and suggests the next free time, and books over it only if you say so. It will not book a time that has passed. It is saved on your Calendar (`/calendar`) as an appointment. To change or cancel one, use the Calendar: drag it to move it, or use its three-dot menu to delete it.
**What is on my calendar?** Ask Co-Pilot ("what is on tomorrow?", "am I free at 3?", "what do I have this week?"); it reads only your own events with `getCalendar`.
**How do I schedule work?** Activity Manager → *Add scheduling & billing details* (defaults to today + current time; End follows Start), or click a Calendar (`/calendar`) slot.
**Worker documents:** Time Log Report → row menu → *View Worker Documents*; with a worker selected, the **Documents** button appears above the table.

## Sales & Invoicing (Quote → Invoice)
**How do I quote a client?** Create Quote (`/accounting/quotes/create`) with items from Products & Services (`/accounting/service-items`); manage/convert in Quote Manager (`/accounting/quotes`) — accepted quotes convert to invoices.
**How do I invoice?** Create Invoice (`/accounting/invoices/create`); track payment in Accounts Receivable (`/accounting/accounts-receivable`).
**How do I process receipts?** Receipt Intake (`/accounting/receipt-processor`) turns scans into ledger entries. Say "sync receipts" and Co-Pilot calls `syncReceipts`; Google Drive is not connected yet, so it will say there are no Drive files and point you to Receipt Intake.
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
**Workflows:** Workflows (`/workflows`) — build a named, ordered destination set (drag or click to add steps), then **Set as standard** to save it as your default workflow (persists across logins and makes the Workspace group follow it); **Clear standard / Restore default Workspace** returns the standard five (Contacts → Projects → Activity Manager → Calendar → Time Logs).

## Navigation Commands (command processor)
Natural-language phrases map to routes: "timer/start timer/log time" → Activity Manager timer; "activity manager/time manager" → `/event-manager`; "my shortcuts/dashboard" → `/action-manager`; "ledger/books" → BKS Ledger; "income"/"expense" → ledger tabs; "tax" → Tax Center; "co-pilot/ogeemo ai" → `/co-pilot`.

