
'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, HandCoins, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AccountingPageHeader } from "@/components/accounting/page-header";

export default function BksInstructionsPage() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <AccountingPageHeader pageTitle="BKS Instructions" hubPath="/accounting/bks" hubLabel="BKS Welcome" />

            <header className="text-center">
                <h1 className="text-2xl font-bold font-headline text-primary">
                    How Ogeemo Manages Your Money In & Money Out
                </h1>
                <p className="text-muted-foreground max-w-3xl mx-auto">
                    A guide to tracking money you're owed (Accounts Receivable) and money you owe (Accounts Payable) and how it connects to your ledgers.
                </p>
            </header>

            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <BookOpen className="h-6 w-6 text-primary" />
                        The Core Concept: Promises vs. Cash Flow
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p>
                           Think of your accounting in two stages:
                        </p>
                        <ol>
                            <li><strong>Promises:</strong> Recording money you expect to receive (Accounts Receivable) and money you have to pay (Accounts Payable).</li>
                            <li><strong>Cash Flow:</strong> Recording when the money actually arrives in or leaves your bank account (Income & Expense Ledgers).</li>
                        </ol>
                        <p>
                           Ogeemo helps you track both, keeping your books accurate for both cash-basis and accrual-basis accounting. For full audit-readiness, it's best practice to save a digital copy of every source document (invoice, bill) to a cloud service like Google Drive and link it to the transaction in Ogeemo.
                        </p>
                    </div>

                    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="h-5 w-5 text-green-600"/>
                                    <span className="font-semibold">Accounts Receivable: Getting Paid by Your Clients</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                    <p>This is for money your clients owe you.</p>
                                    <h4>Step 1: Create and Save Your Invoice</h4>
                                    <ul>
                                        <li><strong>Action:</strong> You complete work and use the <Link href="/accounting/invoices/create">"Create Invoice"</Link> page to generate a professional invoice.</li>
                                        <li><strong>System:</strong> When you save the invoice in Ogeemo, it automatically adds this invoice to your <Link href="/accounting/accounts-receivable">Accounts Receivable</Link> list.</li>
                                        <li><strong>Important:</strong> After creating, download the invoice as a PDF and save it to your "Accounts Receivable" folder in Google Drive.</li>
                                        <li><strong>Result:</strong> You now have a record of money owed to you, and a digital copy for your records. Your income ledger is not yet affected.</li>
                                    </ul>
                                    <h4>Step 2: Record a Payment</h4>
                                     <ul>
                                        <li><strong>Action:</strong> Your client pays you. You go to the <Link href="/accounting/accounts-receivable">Accounts Receivable</Link> page and find the invoice they paid.</li>
                                        <li><strong>System:</strong> You click "Post Payment" on that invoice and record the amount you received.</li>
                                        <li><strong>Result:</strong> Two things happen automatically:
                                            <ol>
                                                <li>The invoice's balance due is reduced or marked as "Paid".</li>
                                                <li>A new transaction is created in your <Link href="/accounting/ledgers?tab=income">Income Ledger</Link>, showing that you have received cash. This keeps your cash-basis books perfectly up-to-date.</li>
                                            </ol>
                                        </li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2" className="border-b-0">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <TrendingDown className="h-5 w-5 text-red-600"/>
                                    <span className="font-semibold">Accounts Payable: Paying Your Bills</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                               <div className="prose prose-sm dark:prose-invert max-w-none pl-8">
                                   <p>This is for money you owe to your suppliers or vendors.</p>
                                   <h4>Step 1: Scan and Log a Bill</h4>
                                    <ul>
                                        <li><strong>Action:</strong> You receive a bill from a supplier (e.g., your internet provider). First, scan or save a digital copy of this bill to your "Accounts Payable" folder in Google Drive. Then, go to the BKS Ledgers and click <strong>"Post Transaction"</strong>.</li>
                                        <li><strong>System:</strong> In the dialog, select the transaction type: <strong>"Bill (Accounts Payable)"</strong>. Enter the details (vendor, amount, due date) and paste the link to your scanned document in the "Document Link" field.</li>
                                        <li><strong>Result:</strong> Ogeemo adds this to your <Link href="/accounting/accounts-payable">Accounts Payable</Link> list. The Document # becomes a clickable link to the source file in Google Drive. Your expense ledger is not yet affected.</li>
                                    </ul>
                                    <h4>Step 2: Record Your Payment</h4>
                                     <ul>
                                        <li><strong>Action:</strong> When you pay the bill, you go to the <Link href="/accounting/accounts-payable">Accounts Payable</Link> page.</li>
                                        <li><strong>System:</strong> You find the bill and click "Record Payment".</li>
                                        <li><strong>Result:</strong> Two things happen automatically:
                                            <ol>
                                                <li>The bill is removed from your list of outstanding payables.</li>
                                                <li>A new transaction is created in your <Link href="/accounting/ledgers?tab=expenses">Expense Ledger</Link>, including the link to the original bill, showing that cash has left your business.</li>
                                            </ol>
                                        </li>
                                    </ul>
                               </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
             <div className="text-center mt-4">
                <Button asChild size="lg">
                    <Link href="/accounting/ledgers">
                        Go to Ledgers
                    </Link>
                </Button>
            </div>
        </div>
    );
}
