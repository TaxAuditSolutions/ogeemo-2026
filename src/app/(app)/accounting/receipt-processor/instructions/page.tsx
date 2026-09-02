'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, ScanSearch, ShieldCheck, Bot, CheckCircle2, ReceiptText } from 'lucide-react';
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
                <CardTitle>How Receipt Intake works</CardTitle>
                <CardDescription>Turn a scanned receipt or invoice into a reviewed, audit-ready ledger entry.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-muted-foreground">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <ScanSearch className="h-4 w-4 text-primary" />
                  1. Capture
                </div>
                <p>Scan or upload a receipt from a phone, desktop scanner, or Google Drive intake folder.</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <Bot className="h-4 w-4 text-primary" />
                  2. Extract
                </div>
                <p>OCR reads the merchant, date, tax, and totals and pre-fills the review form.</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  3. Post
                </div>
                <p>Review the extract, add the business reason, and post it to the BKS ledger with document linkage.</p>
              </div>
            </div>

            <div className="rounded-lg border bg-primary/5 p-4">
              <p className="font-semibold text-foreground">Important rule</p>
              <p className="mt-2">Every ledger entry must be tied to a source document. This keeps Ogeemo audit-ready and gives you a defensible chain of evidence for every expense.</p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">What happens in this process</h3>
              <ul className="list-disc space-y-2 pl-5">
                <li>Google Drive receipts are synced into the queue for review.</li>
                <li>OCR extracts the likely vendor, transaction date, net amount, tax, and total amount.</li>
                <li>The expense reviewer can correct any field before posting.</li>
                <li>A business reason is required before the record becomes a ledger entry.</li>
                <li>The item is posted into the existing expense or payable ledger flow.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Best use cases</h3>
              <ul className="list-disc space-y-2 pl-5">
                <li>Business expense receipts from suppliers and vendors</li>
                <li>Invoices arriving by email or scan</li>
                <li>Fast intake from mobile or desktop scanning workflows</li>
                <li>Audit preparation and source-document linkage</li>
              </ul>
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <Button asChild variant="outline">
                <Link href="/accounting/receipt-processor">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to intake
                </Link>
              </Button>
              <Button asChild>
                <Link href="/accounting/ledgers">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Open BKS ledger
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
