# Ogeemo Application Summary

_This document provides a high-level overview of the Ogeemo application's purpose, structure, and core principles. It serves as a condensed knowledge base for development and disaster recovery._

## 1. Core Philosophy

Ogeemo is designed as a unified, all-in-one business management platform with a strong emphasis on simplicity and user experience. The primary goal is to provide a powerful, intuitive tool for small businesses, freelancers, and accountants to manage their operations without being overwhelmed by complexity.

Key principles include:
- **Unified Platform:** Replace the need for multiple, disparate applications by integrating Accounting, Project Management, CRM, and Communications into a single dashboard.
- **User-Centric Design:** Prioritize intuitive workflows and guided actions over feature-heavy, cluttered interfaces.
- **Deep Google Integration:** Leverage Google Workspace for core functionalities like authentication, email, calendar, and file storage to create a seamless user experience.
- **AI as a Partner:** Utilize AI not just as a chatbot, but as an integrated assistant that understands context, automates tedious tasks, and provides intelligent insights.

## 2. Key Modules & Managers

The application is structured around several core hubs, each managing a distinct area of a business.

### Action Manager
- The central dashboard and primary user interface.
- Provides quick access to common actions and an overview of workspace activity.
- Features a customizable set of "Action Chips" for shortcuts to frequently used managers.

### Accounting Hub
Organized into two main sections to cater to different user needs:
- **BKS (Bookkeeping Kept Simple):** A simplified, cash-based accounting system focused on core income and expense ledgers. Designed to be intuitive for non-accountants and ensure books are audit-ready by default.
- **Advanced Tools:** A comprehensive suite of traditional accounting modules, including:
  - **Accounts Receivable & Invoicing:** Manage client invoices and payments.
  - **Accounts Payable:** Track and manage bills from vendors.
  - **Payroll:** Handle employee compensation and reporting.
  - **Asset Management:** Track capital assets and depreciation.
  - **Reporting:** Generate financial statements and tax forms (e.g., T2125).

### Project & Task Management
- **Project Manager:** A hub for viewing and managing all projects.
- **Task Board:** A Kanban-style board (To Do, In Progress, Done) for managing the day-to-day tasks within a specific project.
- **Project Planning:** A dedicated view for defining the steps and timeline of a project, which can then generate tasks on the Task Board and events in the Calendar.

### Communications & Relationships
- **OgeeMail:** An integrated email client for managing business communications.
- **Contacts Manager:** A central database for all clients, vendors, and personal contacts, organized into folders.
- **Calendar:** A tool for managing schedules, appointments, and events, linked to projects and contacts.
- **CRM (Customer Relationship Manager):** A planned module to track the entire customer journey, from lead to loyal client, integrated with all other modules.

### Utility Managers
- **File Manager:** A secure place for document storage and organization.
- **Time Manager:** Track time spent on tasks, associate it with clients, and mark it as billable.
- **Research Hub:** An AI-powered workspace to manage sources, take notes, and interact with an assistant to synthesize information.

## 3. AI Integration (Firebase Genkit)

Ogeemo's intelligence is powered by Firebase Genkit. The AI is designed to be more than just a chatbot; it's an assistant integrated into the workflow.
- **Ogeemo Assistant:** A knowledgeable chatbot trained on application documentation to help users navigate and understand features.
- **Tool-Based Actions:** The AI can use "tools" to perform actions on behalf of the user, such as adding a new contact directly from a chat conversation.
- **Content Generation:** AI is used to generate forms, images, and other content based on user prompts.
