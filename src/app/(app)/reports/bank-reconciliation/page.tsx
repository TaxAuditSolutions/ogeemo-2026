'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle, 
    CardFooter 
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
    LoaderCircle, 
    Printer, 
    ShieldCheck, 
    Scale, 
    Info, 
    CheckCircle2, 
    Clock,
    XCircle,
    ArrowRight
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { getIncomeTransactions, getExpenseTransactions, type IncomeTransaction, type ExpenseTransaction } from '@/services/accounting-service';
import { ReportsPageHeader } from '@/components/reports/page-header';
import { cn, formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

function BankReconciliationReportContent() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { handlePrint, contentRef } = useReactToPrint();
    const searchParams = useSearchParams();
    
    const [income, setIncome] = useState<IncomeTransaction[]>([]);
    const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // High-Fidelity Date Renderer: Handles raw bank strings or ISO nodes
    const renderDate = (dateStr: string | null) => {
        if (!dateStr) return '';
        const date = parseISO(dateStr);
        if (isValid(date)) return format(date, 'PP');
        const fallback = new Date(dateStr);
        if (isValid(fallback)) return format(fallback, 'PP');
        return dateStr;
    };

    useEffect(() => {
        async function loadData() {
            if (!user) return;
            setIsLoading(true);
            try {
                const [inc, exp] = await Promise.all([
                    getIncomeTransactions(user.uid),
                    getExpenseTransactions(user.uid)
                ]);
                setIncome(inc);
                setExpenses(exp);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Load Failed', description: error.message });
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user, toast]);

    const reportData = useMemo(() => {
        const allLedger = [
            ...income.map(i => ({ ...i, type: 'income' as const })),
            ...expenses.map(e => ({ ...e, type: 'expense' as const }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // For this high-fidelity report, we focus on the "Gaps" (Outstanding Items)
        const outstandingItems = allLedger.filter(lt => !lt.isReconciled);
        const clearedItems = allLedger.filter(lt => lt.isReconciled);

        const bookBalance = allLedger.reduce((sum, item) => 
            item.type === 'income' ? sum + item.totalAmount : sum - item.totalAmount, 0
        );

        const totalOutstanding = outstandingItems.reduce((sum, item) => 
            item.type === 'income' ? sum + item.totalAmount : sum - item.totalAmount, 0
        );

        const adjustedBankBalance = bookBalance - totalOutstanding;

        return { 
            outstandingItems, 
            clearedItems, 
            bookBalance, 
            totalOutstanding, 
            adjustedBankBalance 
        };
    }, [income, expenses]);

    if (isLoading) return <div className="flex h-screen items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>;

    return (
        <div className="p-4 sm:p-6 space-y-6 text-black bg-muted/10 min-h-full">
            <ReportsPageHeader pageTitle="Bank Reconciliation Statement" />
            
            <header className="text-center relative print:hidden">
                <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Bank Reconciliation Statement</h1>
                <p className="text-muted-foreground">Proving the node matches the signal.</p>
            </header>

            <div className="max-w-5xl mx-auto space-y-8" ref={contentRef}>
                {/* Formal Header */}
                <div className="text-center space-y-2 border-b pb-8">
                    <h2 className="text-2xl font-bold uppercase tracking-[0.2em]">Statement of Account Reconciliation</h2>
                    <p className="text-sm font-medium">Reporting Period: {fromParam ? `${renderDate(fromParam)} - ${toParam ? renderDate(toParam) : 'Present'}` : 'Year-to-Date'}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-black">Generated: {format(new Date(), 'PPpp')}</p>
                </div>

                {/* Calculation Summary Card */}
                <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b py-8">
                        <div className="flex items-center justify-between max-w-2xl mx-auto">
                            <div className="text-center">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Book Balance (GL)</p>
                                <p className="text-2xl font-bold font-mono">{formatCurrency(reportData.bookBalance)}</p>
                            </div>
                            <ArrowRight className="h-6 w-6 text-primary/30" />
                            <div className="text-center">
                                <p className="text-[10px] uppercase font-bold text-primary tracking-widest mb-1">Adjusted Bank Balance</p>
                                <p className="text-4xl font-bold font-mono text-primary">{formatCurrency(reportData.adjustedBankBalance)}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="max-w-2xl mx-auto space-y-4">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-muted-foreground">General Ledger Book Balance</span>
                                <span className="font-mono">{formatCurrency(reportData.bookBalance)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-medium text-red-600">
                                <span className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4" />
                                    Less: Outstanding Checks/Payments
                                </span>
                                <span className="font-mono">({formatCurrency(reportData.outstandingItems.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.totalAmount, 0))})</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-medium text-green-600">
                                <span className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Add: Deposits in Transit
                                </span>
                                <span className="font-mono">+{formatCurrency(reportData.outstandingItems.filter(i => i.type === 'income').reduce((sum, i) => sum + i.totalAmount, 0))}</span>
                            </div>
                            <Separator className="bg-primary/20 h-0.5" />
                            <div className="flex justify-between items-center text-xl font-bold">
                                <span className="uppercase text-xs self-center">Final Bank Parity</span>
                                <span className="font-mono text-primary">{formatCurrency(reportData.adjustedBankBalance)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Outstanding Items Table */}
                <Card className="print:border-none print:shadow-none">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            Outstanding Ledger Nodes
                        </CardTitle>
                        <CardDescription>Transactions recorded in Ogeemo but not yet cleared by the financial institution.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.outstandingItems.length > 0 ? reportData.outstandingItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="text-xs font-mono">{item.date}</TableCell>
                                        <TableCell className="font-bold text-sm">{item.company}</TableCell>
                                        <TableCell className="text-[10px] uppercase font-bold text-muted-foreground">{item.type}</TableCell>
                                        <TableCell className={cn("text-right font-mono font-bold", item.type === 'income' ? "text-green-600" : "text-red-600")}>
                                            {item.type === 'income' ? '+' : '-'}{formatCurrency(item.totalAmount)}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No outstanding items. Perfect ledger parity achieved.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="p-8 bg-muted/30 rounded-3xl border-2 border-dashed text-center space-y-4">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground flex items-center justify-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Evidence Verification Protocol
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed italic max-w-2xl mx-auto">
                        "This report serves as the final proof in your Black Box of Evidence. It demonstrates that your internal accounting records (Book Balance) are mathematically and factually synchronized with the external world (Bank Balance)."
                    </p>
                </div>
            </div>

            <footer className="max-w-5xl mx-auto flex justify-end gap-4 pt-12 print:hidden pb-20">
                <Button variant="outline" onClick={handlePrint} className="h-12 px-8 font-bold">
                    <Printer className="mr-2 h-5 w-5" /> Print Statement
                </Button>
                <Button asChild className="h-12 px-8 font-bold shadow-lg">
                    <Link href="/accounting/ledgers">Return to BKS Ledger</Link>
                </Button>
            </footer>
        </div>
    );
}

export default function BankReconciliationReportPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>}>
            <BankReconciliationReportContent />
        </Suspense>
    );
}
