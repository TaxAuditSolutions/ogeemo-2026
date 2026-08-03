# Ogeemo Knowledge Base

## Overview
Ogeemo is a comprehensive, modular business management platform (ERP system) designed to handle everything from accounting and human resources to customer relationship management (CRM), project tracking, and specialized tools. It is built as a modern web application (using Next.js and Firebase) to support accountants, bookkeepers, consultants, small businesses, and other professionals.

## Core Modules & Features

### 1. Accounting & Financials
- **General Ledger & Journal Entries:** Core accounting engine for tracking debits, credits, and account balances. Includes Accrual Adjustments.
- **Invoicing & Billing:** Generate custom invoices (`invoice-generator-view.tsx`), manage line items, and track payments.
- **Quotes & Estimates:** Create and send quotes to clients (`quote-generator-view.tsx`, templates).
- **Payroll System:** Manage employees, run payroll (`run-payroll-view.tsx`), calculate deductions, and handle worker time logging.
- **Expenses & Procurement:** Track standard expense categories and manage supplier information (`supplier-service.ts`).

### 2. HR & Employee Management (HR Manager)
- **Employee & Worker Profiles:** Manage worker data, roles, and permissions (`WorkerFormDialog.tsx`).
- **Time Tracking:** Log hours worked (`log-time-dialog.tsx`, `timelog-service.ts`) which ties directly into payroll and project billing.
- **Leave Management:** Track time off and leaves (`leave-service.ts`).

### 3. CRM & Contacts
- **Contact Directory:** Centralized database for all clients, vendors, and associates (`contact-service.ts`, `contact-form-dialog.tsx`).
- **Lead & CRM Action Tracking:** Track sales pipelines, inquiries, and interactions with leads (`crm-action-service.ts`, `lead-service.ts`).
- **Contact Folders:** Organize contacts systematically (`contact-folder-service.ts`).

### 4. Operations & Project Management
- **Tasks & Todos:** Task tracking and assignment (`todo-service.ts`, `components/tasks/`).
- **Projects:** Manage ongoing client or internal projects (`project-service.ts`).
- **Inventory:** Track stock levels, units of measure, and items (`inventory-service.ts`).
- **Calendar:** Centralized scheduling and event tracking.

### 5. Specialized Tools & Features
- **Hytexercise:** A specialized module containing an exercise player and related services (`hytexercise-view.tsx`, `hytexercise-service.ts`).
- **Field App:** Specialized view for workers in the field (`field-app-view.tsx`).
- **File Management:** Cloud storage file management for organizations (`file-service.ts`, `file-manager-folders.ts`).
- **AI & Image Generation:** Integration with AI tools (Genkit) for tasks like image generation (`image-generator-view.tsx`).
- **Master Mind & Ideas:** Brainstorming and idea tracking modules (`ideas-service.ts`, `components/master-mind/`).

### 6. Target Audiences
Ogeemo has tailored experiences for:
- Accountants & Bookkeepers
- Consultants
- Lawyers & Paralegals
- Virtual Assistants
- Small Businesses

## Technical Architecture
- **Frontend Framework:** Next.js (React) using App Router.
- **Styling:** Tailwind CSS with custom UI components (`components/ui/`).
- **Backend & Database:** Firebase (Firestore, Cloud Functions, Storage).
- **Authentication:** Firebase Auth (`auth-context.tsx`).

---
*Note: This document serves as the core context for the Ogeemo AI Sandbox Agent to help users navigate and understand the platform's capabilities.*