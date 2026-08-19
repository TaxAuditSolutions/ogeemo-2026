# Ogeemo Quote System — Description & Overview

> **Position in the Pipeline:** Step 2 of 6 in the Lead-to-Ledger flow — *Capture the Lead → **Generate the Quote** → Execute the Work → Track Every Minute → Invoice with Evidence → Post to the Ledger*

---

## 1. What the Quote System Is

The Ogeemo Quote System is a fully native, pipeline-driven quoting engine built into the platform's accounting module ("BKS" — Bookkeeping Kept Simple). It allows businesses to create professional price proposals (quotes), track them through a nine-stage lifecycle, and convert accepted quotes into invoices or work orders with a single click — all without leaving the platform or re-entering a single line of data.

Unlike standalone quoting tools that sit beside your accounting software, the Quote System is **deeply integrated** into Ogeemo's "Spider Web" architecture. A quote knows about the contact who requested it. A converted quote knows about the invoice it became. A work order generated from a quote carries the quote number forward. This unbroken chain of context is what makes the system audit-ready and eliminates the "administrative gaps" that plague traditional software setups.

---

## 2. How It Works

### 2.1 The Quote Lifecycle

Every quote moves through a defined status pipeline. Each status is color-coded and represented by a clickable summary card on the Quote Manager dashboard:

| Status | Label | Meaning |
|---|---|---|
| `requested` | Requested | A client has requested a quote, but it hasn't been drafted yet. |
| `draft` | Draft | The quote is being prepared but hasn't been sent to the client. |
| `sent` | Sent | The quote has been sent to the client and is awaiting a response. |
| `approved` | Approved | The client has accepted the quote — ready to invoice or convert. |
| `in_progress` | Work in Progress | The work described in the quote is actively being carried out. |
| `completed` | Completed | The work has been finished but the invoice hasn't been generated yet. |
| `invoiced` | Invoiced | The quote has been converted into an invoice in Accounts Receivable. |
| `paid` | Paid | The invoice has been fully paid by the client. |
| `declined` | Declined | The client has rejected the quote. |

### 2.2 Creating a Quote

Quotes are created in the **Quote Generator** (`/accounting/quotes/create`), a full-featured editor that includes:

- **Client & Supplier Selection** — A searchable combobox pulls from the Ogeemo contact directory. New contacts can be created on-the-fly without leaving the form.
- **Quote Metadata** — Quote number (auto-generated as `QTE-XXXXXX`), Business Number (BN), status, quote date, and expiration date (defaults to 30 days out).
- **Line Items Table** — Each line item supports:
  - Description (with autocomplete from the Service Item Library)
  - Tax type selection (per-line, with automatic rate lookup)
  - Quantity and unit price
  - Calculated line total
  - Internal notes, category numbers, and item type (`service` or `product`)
- **Service Item Library Integration** — Line items can be linked to saved service items. When a draft quote's library item is updated, the quote syncs the changes. Edits made within a quote can be pushed back to the library.
- **Time Log Import** — Billable time entries from the Ogeemo calendar can be imported directly as line items, converting hours worked into quote lines with rates and descriptions.
- **Terms & Notes** — A freeform "Terms & Explanation" field appears on the printed quote, along with optional "Line Item Details" for additional context.
- **Live Totals** — Subtotal, tax total, and grand total update in real time as line items are edited.
- **Preview & Print** — A professional, print-ready quote document renders with the Ogeemo logo, client address block, itemized table, totals, terms, and a client authorization section (signature, PO number, date).

### 2.3 Managing Quotes

The **Quote Manager** (`/accounting/quotes`) is the central dashboard for all quotes. It provides:

- **Pipeline Value Summary** — A card showing the total dollar value of all active quotes (Requested through Completed), giving instant visibility into potential revenue.
- **Filtered Total** — The sum of quotes currently in view based on active filters.
- **Status Summary Cards** — Nine clickable cards (one per status) plus an "All Quotes" card. Clicking a card filters the table to that status; clicking again clears the filter.
- **Searchable, Sortable Table** — The quote pipeline table supports full-text search (by quote number, client name, status, or work order number) and column-level sorting (quote number, client, date, status, amount).
- **Quick Action Buttons** — On desktop, hovering over a row reveals one-click buttons for the most common actions: Mark Approved, Convert to Invoice, and Edit.
- **3-Dot Action Menu** — Every row has a dropdown menu providing access to all available actions:
  - Edit Quote
  - Mark Approved
  - Convert to Invoice
  - Convert to Work Order
  - Approve and Create an Invoice (one-step shortcut)
  - Mark as [any status] (manual status override)
  - Delete Quote (permanent)

### 2.4 Converting Quotes

Once a quote is approved (or at any point the user chooses), the system offers three conversion paths:

1. **Convert to Invoice** — Creates a new invoice in Accounts Receivable with all line items, totals, and client information carried over. The quote's status is automatically updated to `invoiced`. The invoice inherits the quote's tax type, notes, and line item details.

2. **Convert to Work Order** — Creates a work order in the Project Forge from the quote's line items. The generated work order number is saved back to the quote record and displayed in the "Work Order #" column of the Quote Manager. The quote's status is updated to `in_progress`.

3. **Approve and Create an Invoice** — A convenience shortcut that marks the quote as `approved` and immediately converts it to an invoice in a single action, then redirects the user to Accounts Receivable.

All conversions are **atomic batch operations** — they either complete fully or fail cleanly, ensuring no partial data is left behind.

### 2.5 Reusable Templates

The Quote System includes a **template engine** that allows users to save commonly used line item configurations for reuse:

- **Save a Template** — From the Quote Generator, the current line items and notes can be saved as a named template (stored locally via `localStorage`).
- **Load a Template** — Templates can be loaded from a dropdown in the Quote Generator, replacing the current line items (with confirmation).
- **Manage Templates** — A dedicated Templates page (`/accounting/quotes/templates`) provides a card-based interface for viewing, editing, and deleting saved templates.

### 2.6 Data Model

The quote system is backed by two Firestore collections and is fully multi-tenant (org-scoped):

**Quote Record:**
| Field | Type | Description |
|---|---|---|
| `id` | string | Firestore document ID |
| `quoteNumber` | string | Human-readable quote number (e.g., `QTE-123456`) |
| `businessNumber` | string? | Client's BN / CRA program account |
| `companyName` | string | Client display name |
| `contactId` | string | Linked contact record ID |
| `supplierId` | string? | Optional linked supplier contact |
| `totalAmount` | number | Grand total (subtotal + tax) |
| `quoteDate` | Date | Date the quote was issued |
| `expirationDate` | Date | Quote validity deadline |
| `status` | QuoteStatus | Current lifecycle stage |
| `notes` | string | Terms & explanation text |
| `lineItemDetails` | string? | Additional line item context |
| `workOrderNumber` | string? | Linked work order number (if converted) |
| `taxType` | string | Default tax classification |
| `orgId` | string | Organization scope (multi-tenant) |
| `createdBy` / `updatedBy` | string | Audit trail — user IDs |
| `createdAt` / `updatedAt` | Date | Audit trail — timestamps |

**Quote Line Item Record:**
| Field | Type | Description |
|---|---|---|
| `id` | string? | Firestore document ID |
| `quoteId` | string | Parent quote reference |
| `description` | string | Line item description |
| `internalNotes` | string? | Private notes (not on printed quote) |
| `categoryNumber` | string? | Accounting category reference |
| `quantity` | number | Units (hours, items, etc.) |
| `price` | number | Unit price |
| `taxType` | string? | Applied tax type name |
| `taxRate` | number? | Applied tax rate percentage |
| `itemType` | 'service' \| 'product' | Classification |
| `serviceItemId` | string? | Linked Service Item Library entry |
| `orgId` | string | Organization scope |

### 2.7 Service Layer Architecture

All quote operations are handled by `src/core/accounting-service.ts`, which provides:

| Function | Purpose |
|---|---|
| `getQuotes(userId)` | Fetch all quotes for the current organization, sorted by creation date (newest first) |
| `getQuoteById(quoteId)` | Fetch a single quote by ID (org-scoped access check) |
| `getQuoteLineItemsForQuote(userId, quoteId)` | Fetch all line items belonging to a specific quote |
| `addQuoteWithLineItems(quoteData, lineItems)` | Create a new quote with line items in a single atomic batch write |
| `updateQuoteWithLineItems(quoteId, quoteData, lineItems, userId)` | Update a quote — deletes old line items and writes new ones in a batch |
| `updateQuoteStatus(quoteId, status, userId)` | Update only the status field (used by quick-action buttons) |
| `deleteQuote(userId, quoteId)` | Permanently delete a quote and all its line items (batch) |
| `convertQuoteToInvoice(quoteId, userId)` | Creates an invoice from the quote, updates quote status to `invoiced` |
| `convertQuoteToWorkOrder(quoteId, userId)` | Creates a work order from the quote's line items |

All functions use Firestore batch writes for atomicity and include permission-denied error handling with structured `FirestorePermissionError` events.

---

## 3. Key UI Surfaces

| Route | Component | Purpose |
|---|---|---|
| `/accounting/quotes` | `QuotesPageView` | Quote Manager dashboard — pipeline overview, status cards, table |
| `/accounting/quotes/create` | `QuoteGeneratorView` | Quote creation & editing form with print/preview |
| `/accounting/quotes/templates` | `QuoteTemplatesPage` | Template management — create, edit, delete reusable templates |
| `/accounting/quotes/instructions` | `QuoteManagerInstructionsPage` | Built-in user guide for the Quote Manager |

---

## 4. Benefits of Using the Quote System

### 4.1 Zero Double-Entry
When a quote is converted to an invoice or work order, **all data flows forward automatically** — line items, tax rates, client information, totals, and notes. No re-typing. No copy-paste errors. No "the invoice doesn't match the quote" disputes.

### 4.2 Full Pipeline Visibility
The Quote Manager dashboard provides an at-a-glance view of your entire sales pipeline:
- **Pipeline Value** shows the total dollar amount of all active quotes.
- **Status Cards** let you instantly see how many quotes are in each stage and filter with one click.
- **Search & Sort** makes it trivial to find any quote by number, client, or status.

### 4.3 Professional, Branded Proposals
The built-in print renderer produces a polished, client-ready document complete with your logo, business number, itemized table, terms, and a client authorization section (signature, PO number, date). No external document editor required.

### 4.4 Reusable Templates
Save your most common line item configurations as templates. Load them with a single click to jump-start new quotes. This is especially valuable for service businesses with standardized offerings.

### 4.5 Service Item Library Integration
Line items can be linked to a central Service Item Library. Changes to library items propagate to draft quotes. Edits made within a quote can be pushed back to the library. This ensures pricing consistency across all quotes and invoices.

### 4.6 Time-to-Quote Flow
Billable time entries logged in the Ogeemo calendar can be imported directly into a quote as line items. Hours, rates, and descriptions are carried over automatically — turning tracked time into a billable proposal with zero manual transcription.

### 4.7 Built-In Tax Calculation
Each line item supports per-line tax type selection with automatic rate lookup. The system calculates subtotal, tax total, and grand total in real time. Tax types are configurable and stored per organization.

### 4.8 Audit-Ready Trail
Every quote records who created it, who last updated it, and when. Conversions preserve the link between the original quote and the resulting invoice or work order. The quote number is carried forward, creating a defensible chain of source documents.

### 4.9 Native Integration
The Quote System is not a bolted-on module — it is natively connected to:
- **Contacts** (client & supplier selection)
- **Invoices** (one-click conversion to Accounts Receivable)
- **Work Orders** (one-click conversion to the Project Forge)
- **Service Item Library** (pricing consistency)
- **Time Tracking** (calendar time log import)
- **Tax Types** (per-line tax configuration)

### 4.10 Multi-Tenant & Secure
All quote data is scoped to the organization (`orgId`) with Firestore security rules enforcing access control. Batch writes ensure atomicity — no partial saves, no orphaned line items.

---

## 5. The Quote System in the Lead-to-Ledger Pipeline

The quote system is the **critical bridge** between sales and delivery in Ogeemo's six-stage pipeline:

```
1. Capture the Lead  →  2. Generate the Quote  →  3. Execute the Work
                                                    ↓
6. Post to the Ledger  ←  5. Invoice with Evidence  ←  4. Track Every Minute
```

- A **contact** (Step 1) becomes the client on a **quote** (Step 2).
- An approved **quote** becomes a **work order** (Step 3) for execution.
- Time tracked against the work order (Step 4) can be imported back into quotes or flow directly into **invoices** (Step 5).
- Paid invoices post to the **ledger** (Step 6) with full source-document traceability.

This is what Ogeemo means by **"No Gaps. No Ghosts. No Guesswork."** — the quote is the connective tissue between a conversation and a commitment, and between a commitment and a billable engagement.

---

*Part of the Ogeemo BKS (Bookkeeping Kept Simple) accounting module.*
*Built by Tax Audit Solutions (TAS) — Vancouver, BC, Canada.*