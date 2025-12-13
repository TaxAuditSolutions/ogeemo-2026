
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AccountingPageHeader } from './page-header';

type CashTransaction = {
    id: string;
    date: string;
    description: string;
    amount: number;
}

const mockCashIn: CashTransaction[] = [
    { id: 'ci-1', date: '2024-07-28', description: 'Cash payment from walk-in client', amount: 150.00 },
    { id: 'ci-2', date: '2024-07-25', description: 'Market stall daily sales', amount: 455.50 },
];

const mockCashOut: CashTransaction[] = [
    { id: 'co-1', date: '2024-07-29', description: 'Petty cash for office snacks', amount: 25.00 },
    { id: 'co-2', date: '2024-07-26', description: 'Payment to cleaner (cash)', amount: 80.00 },
];

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export function CashAccountingView() {
    const [cashIn, setCashIn] = useState(mockCashIn);
    const [cashOut, setCashOut] = useState(mockCashOut);

    const totalCashIn = cashIn.reduce((sum, tx) => sum + tx.amount, 0);
    const totalCashOut = cashOut.reduce((sum, tx) => sum + tx.amount, 0);
    const netCash = totalCashIn - totalCashOut;

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <AccountingPageHeader pageTitle="Cash Accounting" />
             <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary">Cash Accounting</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Track physical cash transactions that don't run through a bank account.
                </p>
            </header>
            
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Cash vs. Accrual Accounting</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                    <p>
                        Ogeemo simplifies bookkeeping by using a cash-based approach. Here's what that means:
                    </p>
                    <ul>
                        <li><strong>Cash Accounting:</strong> You record income when you receive the money and expenses when you pay them. It's straightforward and reflects your actual cash flow. The ledgers on this page are for tracking physical cash.</li>
                        <li><strong>Accrual Accounting:</strong> You record income when you earn it (e.g., when you send an invoice) and expenses when you incur them (e.g., when you receive a bill), regardless of when money changes hands. This gives a more accurate picture of profitability over time but is more complex.</li>
                    </ul>
                    <p>
                        Ogeemo's core BKS Ledgers operate on the cash basis, making your books easier to manage and keeping them audit-ready by default.
                    </p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
                <Card>
                    <CardHeader className="flex flex-row justify-between items-start">
                        <div>
                            <CardTitle>Cash In (Revenue)</CardTitle>
                            <CardDescription>Cash received from customers.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4"/> Add Cash In</Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {cashIn.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell>{tx.date}</TableCell>
                                        <TableCell>{tx.description}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(tx.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter><TableRow><TableCell colSpan={2} className="font-bold">Total Cash In</TableCell><TableCell className="text-right font-bold font-mono">{formatCurrency(totalCashIn)}</TableCell></TableRow></TableFooter>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row justify-between items-start">
                        <div>
                            <CardTitle>Cash Out (Expenses)</CardTitle>
                            <CardDescription>Cash paid for business expenses.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4"/> Add Cash Out</Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                             <TableBody>
                                {cashOut.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell>{tx.date}</TableCell>
                                        <TableCell>{tx.description}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(tx.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter><TableRow><TableCell colSpan={2} className="font-bold">Total Cash Out</TableCell><TableCell className="text-right font-bold font-mono">{formatCurrency(totalCashOut)}</TableCell></TableRow></TableFooter>
                        </Table>
                    </CardContent>
                </Card>
            </div>
             <Card className="max-w-xs mx-auto">
                <CardHeader className="p-4 text-center">
                    <CardTitle>Net Cash Position</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-center">
                    <p className="text-2xl font-bold font-mono">{formatCurrency(netCash)}</p>
                    <p className="text-xs text-muted-foreground">Amount of physical cash you should have on hand.</p>
                </CardContent>
            </Card>
        </div>
    );
}
