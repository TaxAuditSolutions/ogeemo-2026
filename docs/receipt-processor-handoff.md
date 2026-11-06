# Receipt Processor — Working Notes

Last updated: 2026-10-31

## Current state

The Receipt Processor is a normal (non-demo) workflow at `http://localhost:9002/accounting/receipt-processor`.

1. **Open File** adds a PDF, PNG, JPEG, or WebP receipt to the queue. The file's content type is checked from its bytes, a SHA-256 hash blocks duplicates, the next `REC-YYYYMMDD-###` number is **claimed from the shared REC counter** (same counter as income receipts, so numbers cannot collide), and the file is uploaded to private storage. No OCR runs unless the workspace rule "run OCR automatically" is on.
2. The user checks receipts and chooses **OCR Selected** or **OCR All**. Each file is sent sequentially to `POST /api/receipts/extract`, which reads the workspace's OCR rules and returns cleaned fields.
3. The user verifies the fields against the source preview. Review flags (from the rules) are shown on the receipt. The user can add an expense category with **Add category**, enters a business reason, saves the review, and posts.
4. **Post to ledger** is blocked unless the file is stored and (when the rule is on) there are no blocking errors. Routing: `expense` -> `expenseTransactions`, `payable_bill` -> `payableBills`, `income` -> `incomeTransactions`. The ledger entry stores `documentNumber` (the REC number), `receiptId`, `receiptStoragePath`, and a stable `documentUrl`.
5. In the ledger (`/accounting/ledgers`) the document number is a link that opens the stored receipt; the "original item" dialog also has **View receipt**.
6. **Receipt Archive** (`/accounting/receipt-archive`) lists every receipt, including posted and removed ones, with search and status filters.

## Record-keeping mode (Settings > Receipt OCR Rules > Record keeping)

Nothing here is a legal or CRA certification; the modes only choose which controls Ogeemo enforces. Logic: `src/lib/receipt-record-keeping.ts`.

| | Simple (default) | Audit-ready | Custom |
|---|---|---|---|
| Scan stored | yes | yes | switch |
| Scan required to post | no | yes | switch |
| Errors block posting | no (warnings only) | yes | switch |

- The GL link always works when a scan exists: the ledger entry gets `receiptId`, `receiptStoragePath` and a stable `documentUrl`, and its document number opens the scan. Scans are on by default in every mode because the REC number must open the scan.
- With no scan, the ledger entry still carries the REC number; the screen tells the user to write it on the paper receipt, and an optional `paperLocation` (for example "Box 3, 2026") is saved on the receipt and copied to the ledger as `paperReceiptLocation`.
- Each receipt is stamped with the mode in force when it was added (`recordKeepingMode`) and is never rewritten.
- Mode changes are appended to `receiptRecordKeepingLog` on the organization document (who, when, what changed) and shown as Change history in Settings. Changing the mode never deletes scans or alters posted entries.
- The Receipt Archive has a **Paper filing list (CSV)** export, sorted by document number with where each paper receipt is filed.
- The approval step discussed earlier was set aside at the owner's request and is not built.
## Settings > Receipt OCR Rules (administrators only)

Stored on the organization document as `receiptOcrSettings`; validated by `normalizeReceiptOcrSettings()`.

- Reading: model (Flash / Flash-Lite / Pro), language, date format, tax mode, default currency, extra instructions, auto-run on upload, max file size (hard cap 10 MB).
- Defaults: ledger type and category for new receipts.
- Vendor rules: when the OCR vendor contains text X, rename the vendor and/or fill the category and ledger type (category only fills while empty).
- Validation: required fields, amount tolerance (net + tax vs total), expected tax rates, future/old date limits, review amount limit, duplicate detection, and whether errors block posting.

## Storage and security

- Files live at `receipts/{orgId}/{receiptId}/{file}` in the default Storage bucket.
- `storage.rules` deny all direct client access to `receipts/**`. Reads and writes go only through `/api/receipts/files` (Admin SDK), which takes the workspace from the verified session cookie and checks it against the receipt's `orgId`.
- **`storage.rules` must be deployed** for the new rule to take effect: `npx firebase-tools deploy --only storage`. Until then the existing rules apply (no `receipts/` match means access is denied by default, so nothing is exposed either way).
- Verified: an Admin SDK write/read/delete round trip against the real bucket works.

## Key files

- UI: `src/components/accounting/receipt-processor-view.tsx`, `receipt-viewer-dialog.tsx`, `receipt-archive-view.tsx`, `receipt-archive-table.tsx`
- Intake, OCR saving, storing, posting: `src/services/receipt-staging-service.ts`
- Rules and OCR: `src/lib/receipt-ocr-options.ts`, `receipt-ocr-settings.ts`, `receipt-ocr-rules.ts`, `receipt-ocr.ts` (server-only)
- Review checks: `src/lib/receipt-review-checks.ts`, `receipt-review-types.ts`
- Storage helpers: `src/lib/receipt-storage-utils.ts`, `receipt-server-storage.ts`, `receipt-server-auth.ts`
- API: `src/app/api/receipts/extract/route.ts`, `src/app/api/receipts/files/route.ts`
- Settings: `src/components/settings/receipt-ocr-rules-card.tsx` (+ `-state`, `-reading-fields`, `-validation-fields`, `-rules-common`, `receipt-vendor-rules-editor`), `src/services/receipt-ocr-settings-service.ts`
- Numbering: `src/app/actions/numbering-actions.ts` (REC uniqueness now also checks the receipt queue)
- After a reboot, run `npm run dev:win` from the project root.

## Known limitations (not yet built)

- **No approval step.** Review flags and the posting gate exist, but there is no recorded approver/time or snapshot of approved values. The owner chose not to build it.
- **Posting runs from the browser** and is not idempotent. It refuses an already-posted receipt, but a double-click race or network retry could still duplicate a ledger entry. A server-side posting action would fix this and also let Firestore rules enforce approval.
- **Receipts added before storage existed** have no stored file. Reopening the same file with **Open File** stores it. They cannot be posted until then.
- **OCR and the preview read the stored copy.** After a refresh nothing needs reopening. Only receipts with no stored file (added before storage existed, or while scans were off) need Open File once.
- **Old ledger entries** posted before this change carry no `receiptId`, so their document number is not a link.
- **Retention, backup and a paper-destruction procedure are undefined.** Stored receipts should be backed up and kept for the required period; confirm with the accountant.
- Legacy sample records are hidden by `isVisibleReceiptQueueItem()`; they still exist in Firestore.

## CRA / retention references

Design inputs only; the final procedure needs review by the organization's accountant or legal adviser.

- Imaging: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/acceptable-format-imaging-paper-documents-backing-electronic-files.html
- Audit trails: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/review-business-systems-keeping-audit-trails-business-transactions.html
- Retention: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/where-keep-your-records-long-request-permission-destroy-them-early.html
- Check the final procedure against the latest CAN/CGSB 72.34, Electronic Records as Documentary Evidence.

## Working-tree note

No commit has been created. The tree holds a mix of staged and unstaged changes; do not discard them.

## Tax (calculate from the total)

- Default setting: OCR keeps only the **total**. The reviewer chooses a **tax type** (HST/GST/PST/combined rates, editable in Settings) and src/lib/receipt-tax.ts calculates tax = total x rate / (100 + rate), rounded to the cent, with net = total - tax. Net + tax always equals the total.
- The tax OCR read is stored as `printedTaxAmount` for comparison only. A warning flags a difference of more than 2 cents; no tax type chosen is a blocking error.
- Tax type precedence after OCR: the reviewer's earlier choice, the vendor rule, the workspace default.
- The alternative setting, 'Use the tax printed on the receipt', restores the old behaviour.
- Rates are treated as a percentage of the pre-tax amount on a tax-included total. Mixed receipts (taxable and exempt items) need 'Enter tax by hand'. The starting list of rates is a convenience, not tax advice.
- Ledger entries now carry the chosen tax type and rate (payable bills previously always said GST).
