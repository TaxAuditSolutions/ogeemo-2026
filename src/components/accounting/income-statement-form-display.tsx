
'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { t2125IncomeCategories, t2125ExpenseCategories } from '@/data/standard-expense-categories';
import type { IncomeTransaction, ExpenseTransaction } from '@/services/accounting-service';

interface IncomeStatementFormDisplayProps {
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

export function IncomeStatementFormDisplay({ incomeTransactions, expenseTransactions }: IncomeStatementFormDisplayProps) {
  
  const incomeData = useMemo(() => {
    const primaryIncome = incomeTransactions
        .filter(tx => tx.incomeCategory !== 'Other income')
        .reduce((sum, tx) => sum + tx.totalAmount, 0);

    const otherIncome = incomeTransactions
        .filter(tx => tx.incomeCategory === 'Other income')
        .reduce((sum, tx) => sum + tx.totalAmount, 0);

    const grossIncome = primaryIncome + otherIncome;

    return {
        'Part 3A': { description: 'Sales, commissions, or fees', amount: primaryIncome },
        'Part 3D': { description: 'Other income', amount: otherIncome },
        'grossIncome': { description: 'Gross business or professional income', amount: grossIncome },
    };
  }, [incomeTransactions]);

  const expenseData = useMemo(() => {
    const expensesByLine: Record<string, { description: string, amount: number }> = {};

    t2125ExpenseCategories.forEach(cat => {
      expensesByLine[cat.line] = { description: cat.description, amount: 0 };
    });

    expenseTransactions.forEach(tx => {
      if (tx.category && expensesByLine[tx.category]) {
        expensesByLine[tx.category].amount += tx.totalAmount;
      } else {
        // Fallback for uncategorized or custom categories
        if (!expensesByLine['9270']) {
            expensesByLine['9270'] = { description: 'Other expenses', amount: 0 };
        }
        expensesByLine['9270'].amount += tx.totalAmount;
      }
    });
    
    return Object.entries(expensesByLine).sort(([lineA], [lineB]) => parseInt(lineA) - parseInt(lineB));

  }, [expenseTransactions]);

  const totalExpenses = useMemo(() => expenseData.reduce((sum, [, data]) => sum + data.amount, 0), [expenseData]);
  const netIncome = incomeData.grossIncome.amount - totalExpenses;

  return (
    <div className="space-y-8">
      {/* Part 3 - Income */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Part 3 - Business and Professional Income</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{incomeData['Part 3A'].description}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(incomeData['Part 3A'].amount)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{incomeData['Part 3D'].description}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(incomeData['Part 3D'].amount)}</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/50 font-bold">
              <TableCell>{incomeData.grossIncome.description}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(incomeData.grossIncome.amount)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <Separator />

      {/* Part 4 - Expenses */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Part 4 - Expenses</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CRA Line #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenseData.map(([line, { description, amount }]) => (
              <TableRow key={line}>
                <TableCell className="font-mono text-muted-foreground">{line}</TableCell>
                <TableCell>{description}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/50 font-bold">
              <TableCell colSpan={2}>Total Expenses</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(totalExpenses)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <Separator />

      {/* Final Calculation */}
      <div className="bg-primary/10 p-4 rounded-lg">
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Net Income (or Loss)</span>
          <span className="font-mono">{formatCurrency(netIncome)}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 text-right">Gross Income - Total Expenses</p>
      </div>
    </div>
  );
}
