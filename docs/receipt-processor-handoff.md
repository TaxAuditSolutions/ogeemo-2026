# Receipt Processor — Working Notes and Handoff

Last updated: 2026-10-30

## Purpose

Preserve the receipt-processing review before the computer restart. Read this note before resuming this work.

## Agreed direction

- Mark the current page clearly as **Demo**. Agreed, but **not yet implemented**.
- Proposed production direction: a verified digital document is the authoritative source evidence. OCR output, corrections, approvals, and ledger entries are derived records linked to it.
- “One source of truth” means one authoritative document record, not one physical copy; backups/replicas remain necessary.
- No receipt-processor implementation changes were made during the review.

## Current page and key files

- URL: `http://localhost:9002/accounting/receipt-processor`
- Before restart, the route compiled and returned HTTP 200.
- After reboot, run `npm run dev:win` from the project root.
- UI: `src/components/accounting/receipt-processor-view.tsx`
- Intake/posting: `src/services/receipt-staging-service.ts`
- OCR: `src/app/actions/ocr-actions.ts`
- Drive: `src/services/google-service.ts`
- Guide: `src/app/(app)/learn/guides/receipt-intake/page.tsx`

## Current-state findings

1. **OCR confidence: 92%** is hard-coded demo data. Drive-synced items receive a hard-coded 85%. Neither is measured OCR confidence nor used to control posting.
2. Drive intake returns fixed sample files, not real Drive contents. External/Drive OCR returns simulated values rather than reading the PDF.
3. Upload stores a temporary browser `blob:` URL; it does not durably upload the file, OCR it, or create persistent audit evidence.
4. Review is not enforced. “Save review” changes status without recording reviewer/time. A prefilled business reason can enable posting without meaningful review.
5. Posting calls real Firestore expense/payable functions. Demo or failed-OCR data must not reach live books.
6. Selecting “Income” currently falls through to expense creation.
7. The queue-loading effect likely reloads repeatedly because its dependencies change after each fetch.
8. No receipt-processor-specific automated tests were found. Full TypeScript checking was blocked by an unrelated existing error at `scratch/inspect-firebase-structure.ts:31`.
9. No live posting was performed during the review.

## Working design from the discussion

### Capture and preserve

- User selects one or more scanned PDFs; upload the actual bytes to durable protected storage.
- Ogeemo—not OCR—assigns a permanent internal document number. Use new `DOC` or `SRC` series because `REC` already identifies payment receipts.
- Record SHA-256 hash, org, uploader, server timestamp, original filename, size, MIME type, and storage path. Detect exact duplicates by hash.
- Initial scope recommendation: one receipt per PDF, with multiple pages for that receipt allowed.
- Keep the source PDF immutable. Show the internal number in metadata/viewer; any stamped copy is a derivative. Replacement scans create linked, audited versions.
- OCR reads the vendor's invoice/receipt number separately from Ogeemo's document number.

### Verify, extract, and review

- Reviewer separately confirms all pages are present, nothing material is cropped/obscured, and the image accurately reproduces the paper. Record **Scan verified**, user, and timestamp.
- OCR success does not establish scan quality. Paper becomes eligible for destruction only after verification and under an approved retention procedure.
- Suggested flow: `Received → OCR processing → Needs review → Approved → Posted`, plus `OCR failed`, `Rejected`, and `Posting failed`.
- Store raw extraction, fields, engine/model and extraction version, processing time, and errors. Use only genuine confidence data; never invent a score.
- Failed OCR stays visible for manual entry. Never silently substitute today's date, zero amounts, or fake confidence.
- Review screen: PDF beside editable fields, with separate **Save draft**, **Verify scan**, **Approve for posting**, and **Post to ledger** actions.

### Approve and post

- Require durable source, scan verification, valid fields, amount arithmetic, category/type, and genuine business reason.
- Log old/new values, editor, and time. Editing an approved extraction revokes approval and requires reapproval.
- Only approved documents can post. Server-side posting rechecks permission, approval, and integrity.
- Posting must be idempotent so retries cannot duplicate ledger entries.
- Link ledger entries to permanent document ID, number, version/hash, and audit trail—not temporary URLs. Correct expense/payable/income routing.

## Suggested delivery order

1. **Demo safety:** Demo title/banner, mark samples, remove/qualify simulated confidence, and preferably prevent simulated items from live posting.
2. **Real intake:** durable batch upload, numbering, hashes, metadata, duplicate handling, protected preview, and queue linkage.
3. **OCR/review:** real OCR, extraction versions, failure handling, manual entry, scan verification, validation, and approval history.
4. **Controlled posting:** server authorization, approval enforcement, idempotency, correct ledger type, and source/audit links.
5. **Retention/operations:** retention, legal holds, backup/restore tests, readable export, storage-location review, and approved paper-destruction procedure.
6. **Real Drive integration:** after durable upload and controls work.

## CRA / retention references

Design inputs only; final procedure needs review by the organization's accountant/legal adviser.

- Imaging: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/acceptable-format-imaging-paper-documents-backing-electronic-files.html
  - Properly imaged documents can become permanent records under applicable CGSB standards; otherwise paper must be kept. Images must be accurate, complete, and legible.
- Audit trails: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/review-business-systems-keeping-audit-trails-business-transactions.html
  - Electronic records must connect supporting documents to summarized financial accounts.
- Retention: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/where-keep-your-records-long-request-permission-destroy-them-early.html
  - Generally six years from the end of the last relevant tax year, with exceptions. Early destruction of required records generally needs written CRA permission.
- Check the final procedure against the latest **CAN/CGSB 72.34, Electronic Records as Documentary Evidence**.

## Resume point

Start with **Phase 1: Demo safety**, unless the user directs otherwise. Build the real document-intake foundation before enabling production posting.

## Working-tree caution

These files already had uncommitted changes when this note was created; do not discard them:

- `src/components/accounting/receipt-processor-view.tsx`
- `src/services/receipt-staging-service.ts`

Observed changes concern queue deletion/rejection, Drive deduplication, and explanatory UI. They were not made by the assistant during this review.

