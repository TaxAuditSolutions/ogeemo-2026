'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountingPageHeader } from "@/components/accounting/page-header";
import { DollarSign } from "lucide-react";

export default function AccrualAccountingPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <AccountingPageHeader pageTitle="Accrual Accounting" />
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Accrual Accounting Explained</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Understanding the "when" of recording income and expenses.
        </p>
      </header>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-primary" />
            Cash vs. Accrual: What's the Difference?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                    While Ogeemo's BKS system simplifies bookkeeping by focusing on a cash basis, it's important to understand another key method: accrual accounting. The main difference is all about <strong>timing</strong>.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Cash Accounting</CardTitle>
                        <CardDescription>Focuses on cash flow.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">You record transactions only when money physically changes hands. You log income when you receive payment, and expenses when you actually pay them.</p>
                    </CardContent>
                </Card>
                <Card>
                     <CardHeader>
                        <CardTitle>Accrual Accounting</CardTitle>
                        <CardDescription>Focuses on profitability.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">You record transactions when they are earned or incurred, regardless of when money moves. You log income when you send an invoice, and expenses when you receive a bill.</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <h3 className="font-semibold">An Example: The Consultant</h3>
                <p>
                    Imagine you do a project for a client in March and send them a $5,000 invoice. The client pays you in April.
                </p>
                <ul>
                    <li>
                        <strong>Under Cash Accounting:</strong> It looks like you made $0 in March and $5,000 in April. This accurately shows your cash flow, but not when you actually did the work.
                    </li>
                     <li>
                        <strong>Under Accrual Accounting:</strong> You record the $5,000 revenue in March, when you <strong>earned</strong> it. This gives a more accurate picture of your business's performance and profitability for that specific month.
                    </li>
                </ul>
                <h3 className="font-semibold">Why It Matters</h3>
                <p>
                    Accrual accounting provides a more accurate view of a company's financial health and profitability over a specific period, which is what banks and investors typically want to see. Ogeemo's Accounts Receivable and Accounts Payable modules are designed to help you track these accrual-based items, giving you the foundation for advanced financial reporting when you need it.
                </p>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
