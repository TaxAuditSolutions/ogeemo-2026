
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoaderCircle, FileDigit } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getExpenseTransactions, type ExpenseTransaction } from '@/services/accounting-service';
import { AccountingPageHeader } from './page-header';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export function AccountsPayablePageView() {
  const [expenseTransactions, setExpenseTransactions] = useState<ExpenseTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const loadData = async () => {
      setIsLoading(true);
      try {
        const expenses = await getExpenseTransactions(user.uid);
        setExpenseTransactions(expenses);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Failed to load data',
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, toast]);

  const totalExpenses = useMemo(() => {
      return expenseTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
  }, [expenseTransactions]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="Accounts Payable Report" />
        <header className="text-center">
            <h1 className="text-3xl font-bold font-headline text-primary">
                Accounts Payable as a Report
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
                This report shows all paid bills and expenses recorded in your ledger.
            </p>
        </header>

        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Expense Ledger Report</CardTitle>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Expenses Paid</p>
                        <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
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
                                <TableHead>Vendor</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenseTransactions.length > 0 ? expenseTransactions.map(tx => (
                                <TableRow key={tx.id}>
                                    <TableCell>{format(new Date(tx.date), 'PP')}</TableCell>
                                    <TableCell>{tx.company}</TableCell>
                                    <TableCell>{tx.description}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(tx.totalAmount)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No expense transactions found.
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
