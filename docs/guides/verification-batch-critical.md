# critical missing Verification Report

Generated at: 2026-07-14T06:54:08.685Z
Assistant endpoint: https://ogeemoassistant-qsckasljxq-uc.a.run.app

Total checked: 11
Passed: 11
Failed: 0

## Results

- [PASS] tasks::create-task
  - Question: How do I create task?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To create a task, follow these steps:  1.  Open the Tasks module from the main navigation. 2.  Locate the create task entry point in the module workflow. 3.  Enter or select the required inputs for create task. 4.  Revie
- [PASS] tasks::assign-task
  - Question: How do I assign task?
  - Reason: contains 9 numbered procedural steps
  - Answer excerpt: To assign a task, please follow these steps:  **Prerequisites:** 1.  You are signed in with admin access or equivalent permissions. 2.  You can open the Tasks module in the current Ogeemo environment. 3.  Required data i
- [PASS] tasks::complete-task
  - Question: How do I complete task?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To complete a task, follow these steps:  1.  Open the Tasks module from the main navigation. 2.  Locate the complete task entry point in the module workflow. 3.  Enter or select the required inputs for complete task. 4. 
- [PASS] tasks::resolve-task-assignment-error
  - Question: How do I resolve task assignment error?
  - Reason: contains 13 numbered procedural steps
  - Answer excerpt: To resolve a task assignment error, follow these steps:  **Prerequisites:** Before you begin, ensure the following: 1.  You are signed in with admin access or equivalent permissions. 2.  You can open the Tasks module in 
- [PASS] tasks::recover-missing-task
  - Question: How do I recover missing task?
  - Reason: contains 12 numbered procedural steps
  - Answer excerpt: To recover a missing task, follow these steps:  **Prerequisites:** Before you begin, ensure the following: 1.  You are signed in with admin access or equivalent permissions. 2.  You can open the Tasks module in the curre
- [PASS] calendar::connect-calendar-provider
  - Question: How do I connect calendar provider?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To connect a calendar provider, follow these steps:  1.  Open the Calendar module from the main navigation. 2.  Locate the connect calendar provider entry point in the module workflow. 3.  Enter or select the required in
- [PASS] calendar::sync-calendar-events
  - Question: How do I sync calendar events?
  - Reason: contains 6 numbered procedural steps
  - Answer excerpt: To sync calendar events, follow these steps:  1.  Open the Calendar module from the main navigation. 2.  Locate the sync calendar events entry point in the module workflow. 3.  Enter or select the required inputs for syn
- [PASS] calendar::resolve-calendar-sync-error
  - Question: How do I resolve calendar sync error?
  - Reason: contains 18 numbered procedural steps
  - Answer excerpt: To resolve a calendar sync error, follow these steps:  **1. Prerequisites:** Before starting, ensure the following: 1.  You are signed in with admin access or equivalent permissions. 2.  You can open the Calendar module 
- [PASS] calendar::create-calendar-event
  - Question: How do I create calendar event?
  - Reason: contains 9 numbered procedural steps
  - Answer excerpt: To create a calendar event, follow these steps:  **Prerequisites:** 1.  You are signed in with general access or equivalent permissions. 2.  You can open the Calendar module in the current Ogeemo environment. 3.  Require
- [PASS] calendar::handle-double-booking-conflict
  - Question: How do I handle double booking conflict?
  - Reason: contains 13 numbered procedural steps
  - Answer excerpt: To handle a double booking conflict in the Calendar module, follow these steps:  **1. Prerequisites:** Before you begin, ensure the following: 1.  You are signed in with general access or equivalent permissions. 2.  You 
- [PASS] calendar::troubleshoot-missing-invites
  - Question: How do I troubleshoot missing invites?
  - Reason: contains 13 numbered procedural steps
  - Answer excerpt: To troubleshoot missing invites in the Calendar module, follow these steps:  **Prerequisites:** Before you begin, ensure the following: 1.  You are signed in with admin access or equivalent permissions. 2.  You can open 

## Policy
- Status is promoted to verified only when the answer is procedural and does not signal missing context.
- Failed rows remain in missing for further guide refinement.