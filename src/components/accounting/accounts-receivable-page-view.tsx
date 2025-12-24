
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LoaderCircle, FileDigit } from 'lucide-react';
import { format } from "date-fns";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getIncomeTransactions, type IncomeTransaction } from '@/services/accounting-service';
import { AccountingPageHeader } from './page-header';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export function AccountsReceivablePageView() {
    const [incomeTransactions, setIncomeTransactions] = useState<IncomeTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            if (!user) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const transactions = await getIncomeTransactions(user.uid);
                setIncomeTransactions(transactions);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load income data.' });
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user, toast]);

    const totalIncome = useMemo(() => {
        return incomeTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    }, [incomeTransactions]);

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <AccountingPageHeader pageTitle="Accounts Receivable Report" />
            <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary">
                    Accounts Receivable as a Report
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    This report shows all cash received from sales and services, reflecting your actual income.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Income Ledger Report</CardTitle>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total Income Received</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <LoaderCircle className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {incomeTransactions.length > 0 ? incomeTransactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell>{format(new Date(tx.date), 'PP')}</TableCell>
                                        <TableCell>{tx.company}</TableCell>
                                        <TableCell>{tx.description}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(tx.totalAmount)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                            No income transactions found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
