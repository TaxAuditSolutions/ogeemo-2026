# critical verified Verification Report

Generated at: 2026-07-10T02:21:48.957Z
Assistant endpoint: https://ogeemoassistant-qsckasljxq-uc.a.run.app

Total checked: 18
Passed: 18
Failed: 0

## Results

- [PASS] auth::create-account
  - Question: How do I create account?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To create an account, follow these steps: 1. Open the Auth module from the main navigation. 2. Locate the create account entry point in the module workflow. 3. Enter or select the required inputs for create account. 4. R
- [PASS] auth::sign-in-recovery
  - Question: How do I sign in recovery?
  - Reason: contains 9 numbered procedural steps
  - Answer excerpt: To perform sign in recovery:  1.  Open the Auth module from the main navigation. 2.  Locate the sign in recovery entry point in the module workflow. 3.  Enter or select the required inputs for sign in recovery. 4.  Revie
- [PASS] auth::invite-team-members
  - Question: How do I invite team members?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To invite team members, follow these steps: 1. Open the Auth module from the main navigation. 2. Locate the invite team members entry point in the module workflow. 3. Enter or select the required inputs for invite team m
- [PASS] contacts::create-contact
  - Question: How do I create contact?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To create a contact:  1.  Open the Contacts module from the main navigation. 2.  Locate the create contact entry point in the module workflow. 3.  Enter or select the required inputs for create contact. 4.  Review the co
- [PASS] files::upload-document
  - Question: How do I upload document?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To upload a document: 1.  Open the Files module from the main navigation. 2.  Locate the upload document entry point in the module workflow. 3.  Enter or select the required inputs for upload document. 4.  Review the con
- [PASS] accounting::categorize-expense
  - Question: How do I categorize expense?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To categorize an expense, follow these steps: 1. Open the Accounting module from the main navigation. 2. Locate the categorize expense entry point in the module workflow. 3. Enter or select the required inputs for catego
- [PASS] accounting::post-journal-entry
  - Question: How do I post journal entry?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To post a journal entry, follow these steps: 1.  Open the Accounting module from the main navigation. 2.  Locate the post journal entry entry point in the module workflow. 3.  Enter or select the required inputs for post
- [PASS] accounting::reconcile-transactions
  - Question: How do I reconcile transactions?
  - Reason: contains 18 numbered procedural steps
  - Answer excerpt: Reconcile Transactions in Accounting (accounting):  Prerequisites: 1. You are signed in with accountant access or equivalent permissions. 2. You can open the Accounting module in the current Ogeemo environment. 3. Requir
- [PASS] payroll::create-worker-profile
  - Question: How do I create worker profile?
  - Reason: contains 18 numbered procedural steps
  - Answer excerpt: Create Worker Profile in Payroll (payroll):  Prerequisites: 1. You are signed in with admin access or equivalent permissions. 2. You can open the Payroll module in the current Ogeemo environment. 3. Required data inputs 
- [PASS] payroll::run-payroll
  - Question: How do I run payroll?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To run payroll, follow these steps: 1. Open the Payroll module from the main navigation. 2. Locate the run payroll entry point in the module workflow. 3. Enter or select the required inputs for run payroll. 4. Review the
- [PASS] reports::run-analytics-report
  - Question: How do I run analytics report?
  - Reason: contains 4 numbered procedural steps
  - Answer excerpt: To run an analytics report, follow these steps: 1.  Open the Analytics or Reports section from the main navigation. 2.  Select the report type you need. 3.  Set required filters such as date range, team, or client scope.
- [PASS] reports::export-reports
  - Question: How do I export reports?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To export reports, follow these steps: 1. Open the Analytics or Reports section from the main navigation. 2. Select the report type you need for the current task. 3. Set required filters such as date range, team, or clie
- [PASS] settings::configure-role-permissions
  - Question: How do I configure role permissions?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To configure role permissions, follow these steps in the Settings module:  1.  Open the Settings module from the main navigation. 2.  Locate the configure role permissions entry point in the module workflow. 3.  Enter or
- [PASS] knowledge::reingest-guides
  - Question: How do I reingest guides?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To reingest guides: 1. Open the Knowledge module from the main navigation. 2. Locate the reingest guides entry point in the module workflow. 3. Enter or select the required inputs for reingest guides. 4. Review the confi
- [PASS] knowledge::diagnose-assistant-errors
  - Question: How do I diagnose assistant errors?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To diagnose assistant errors, follow these steps: 1. Open the Knowledge module from the main navigation. 2. Locate the diagnose assistant errors entry point in the module workflow. 3. Enter or select the required inputs 
- [PASS] tasks::create-action-chip
  - Question: How do I create action chip?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To create an action chip, follow these steps: 1. Open the Tasks module from the main navigation. 2. Locate the create action chip entry point in the module workflow. 3. Enter or select the required inputs for create acti
- [PASS] tasks::complete-action-chip
  - Question: How do I complete action chip?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To complete an action chip: 1. Open the Tasks module from the main navigation. 2. Locate the complete action chip entry point in the module workflow. 3. Enter or select the required inputs for complete action chip. 4. Re
- [PASS] tasks::troubleshoot-action-chip-not-saving
  - Question: How do I troubleshoot action chip not saving?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: Here are common errors and their recovery steps for troubleshooting action chip not saving:  **Common errors:** 1. Required fields are missing during troubleshoot action chip not saving. 2. Permission constraints prevent

## Policy
- Status is promoted to verified only when the answer is procedural and does not signal missing context.
- Failed rows remain in verified for further guide refinement.