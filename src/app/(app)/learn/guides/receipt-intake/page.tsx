'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bot, FileText, ReceiptText, ScanSearch, ShieldCheck } from 'lucide-react';
import { AccountingPageHeader } from '@/components/accounting/page-header';

export default function ReceiptProcessorInstructionsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AccountingPageHeader pageTitle="Receipt Intake Guide" hubPath="/accounting" hubLabel="Accounting Hub" />

      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ReceiptText className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Receipt intake workflow</CardTitle>
                <CardDescription>Add receipts, run OCR on the ones you choose, review the fields, and post to the ledger.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-muted-foreground">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <ScanSearch className="h-4 w-4 text-primary" />
                  1. Open a receipt file
                </div>
                <p>Click Open File and choose a PDF, PNG, JPEG, or WebP receipt. It enters the receipts queue before any OCR is run.</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <Bot className="h-4 w-4 text-primary" />
                  2. Choose receipts for OCR
                </div>
                <p>Check one or more receipts and choose OCR Selected, or choose OCR All. Compare the results with the source document and correct any fields. The OCR engine does not report a confidence score, so every extraction must be verified.</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  3. Review and post
                </div>
                <p>Choose the category and ledger type, enter the business reason, save the review, and post. The receipt is then removed from the queue and recorded in the ledger.</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Things to know</h3>
              <ul className="list-disc space-y-2 pl-5">
                <li>Every receipt you add with Open File is stored permanently in your private workspace storage. Only signed-in members of your workspace can open it. After a refresh you do not need to choose the file again: the preview and OCR read the stored copy. Only a receipt added before storage existed needs its original chosen once with Open File; it is matched to its queue entry without creating a duplicate.</li>`r`n                <li>Tax is calculated from the total by default. OCR reads the total; you choose the tax type (for example HST 13%) and Ogeemo works out the tax and the net amount from it, so they always add up to the total. The tax printed on the receipt is kept only for comparison, and you get a warning if it differs, which can catch a vendor error or a wrong tax type. Administrators manage the tax types, the starting tax type and per-vendor tax types in Settings under Receipt OCR Rules. Rates differ by province and change over time, so check each one with your accountant.</li>`r`n                <li>Each receipt gets an Ogeemo document number (REC-YYYYMMDD-###). When you post it, that number is recorded in the general ledger. Click the number in the ledger to open the stored receipt, or find any receipt in the Receipt Archive.</li>`r`n                <li>Administrators choose a record-keeping mode in Settings under Receipt OCR Rules. Simple keeps your paper receipts as the record: each scan gets a document number to write on the paper, and check results are warnings only. Audit-ready requires a stored scan before posting and blocks receipts with errors. Custom lets you choose each control. These are not a legal or CRA certification; keep paper originals unless your accountant says otherwise.</li>`r`n                <li>Administrators set how receipts are read and checked in Settings under Receipt OCR Rules: the OCR model, language, date and tax conventions, required fields, amount tolerance, expected tax rates, vendor rules and more.</li>
                <li>The same file cannot be added twice. Duplicates are detected by file content.</li>
                <li>If OCR fails, the fields are left blank for manual entry. A failed retry never overwrites values you have already entered.</li>
                <li>Use Add category beside the Category field to add a new expense category.</li>
              </ul>
            </div>

            <div className="rounded-lg border bg-primary/5 p-4">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Keep your records
              </div>
              <p className="mt-2">Ogeemo keeps a stored copy of each scanned receipt, but you remain responsible for your records. Destroying original paper receipts requires a records-retention procedure approved by your accountant or legal adviser, and the stored copy should be backed up and kept for the required retention period.</p>
            </div>

            <div className="flex pt-2">
              <Button asChild variant="outline">
                <Link href="/accounting/receipt-processor">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Receipt Processor
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}