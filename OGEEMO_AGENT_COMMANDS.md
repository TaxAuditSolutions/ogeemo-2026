# Ogeemo Agent: Example User Commands

This document outlines a list of potential commands a user might give to the Ogeemo AI Agent, along with the expected action or response from the agent. This serves as a guide for developing the agent's tool-use capabilities.

---

## 1. Contact Management

**User Command:** "Create a new contact named Jane Doe, email jane.doe@example.com, phone 555-123-4567 for ACME Inc."
- **Agent Action:** Use the `addContact` tool with the provided parameters (firstName: "Jane", lastName: "Doe", email: "jane.doe@example.com", phone: "555-123-4567", company: "ACME Inc.").
- **Agent Response:** "I have added Jane Doe from ACME Inc. to your contacts. You can find her in your contacts manager."

**User Command:** "Find John Smith's phone number."
- **Agent Action:** Use a future `findContact` tool to search the user's contacts.
- **Agent Response:** "I found two contacts named John Smith. One works at Smith & Sons (555-987-6543) and the other is a personal contact (555-111-2222). Which one are you looking for?"

## 2. Project & Task Management

**User Command:** "Start a new project for the 'Alpha Corp Website Redesign'."
- **Agent Action:** Use a future `createProject` tool.
- **Agent Response:** "I've created the 'Alpha Corp Website Redesign' project. Would you like to add some initial tasks, set a deadline, or link it to the Alpha Corp contact?"

**User Command:** "Add a task 'Draft homepage copy' to the website redesign project."
- **Agent Action:** Use a future `addTask` tool, identifying the correct project.
- **Agent Response:** "Okay, I've added the task 'Draft homepage copy' to the 'Alpha Corp Website Redesign' project."

**User Command:** "What are my overdue tasks?"
- **Agent Action:** Use a future `findTasks` tool with a filter for `status: 'overdue'`.
- **Agent Response:** "You have one overdue task: 'Submit Q2 Financials', which was due yesterday."

## 3. Scheduling & Time Management

**User Command:** "Schedule a meeting with Jane Doe for tomorrow at 2 PM to discuss the project proposal."
- **Agent Action:** Use a future `createCalendarEvent` tool, linking it to the Jane Doe contact.
- **Agent Response:** "I've scheduled a meeting with Jane Doe for tomorrow at 2:00 PM. The title is 'Meeting to discuss project proposal'. Should I send an invitation?"

**User Command:** "Start a timer for 'Design work for ACME Inc'."
- **Agent Action:** Use a future `startTimer` tool.
- **Agent Response:** "Timer started for 'Design work for ACME Inc'. You can see it running at the bottom of your screen. Just tell me when to stop."

## 4. Accounting & Invoicing

**User Command:** "Create an invoice for Client Beta for $1500, due in 14 days."
- **Agent Action:** Use a future `createInvoice` tool.
- **Agent Response:** "I've drafted an invoice for Client Beta for $1,500.00, due on [Date]. Would you like me to add any specific line items before you review and send it?"

**User Command:** "What's my total accounts receivable?"
- **Agent Action:** Use a future `getReceivables` tool to query financial data.
- **Agent Response:** "Your total accounts receivable is currently $8,450.75."

## 5. File Management

**User Command:** "Find the document named 'Q3 Marketing Plan'."
- **Agent Action:** Use a future `findFile` tool.
- **Agent Response:** "I found 'Q3_Marketing_Plan.pdf' in your 'Marketing Assets' folder. Would you like me to open it?"
