
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { type DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { t2125ExpenseCategories } from '@/data/standard-expense-categories';
import type { CalculatedT2125Data } from './income-statement-view';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });
};

interface T2125FormDisplayProps {
  data: CalculatedT2125Data;
  dateRange?: DateRange;
}

export function T2125FormDisplay({ data, dateRange }: T2125FormDisplayProps) {
  const renderDateRange = () => {
    if (!dateRange || !dateRange.from) return "All Time";
    const from = format(dateRange.from, 'PPP');
    if (!dateRange.to) return `On ${from}`;
    const to = format(dateRange.to, 'PPP');
    return `${from} to ${to}`;
  };

  return (
    <Card className="print:border-none print:shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Statement of Business or Professional Activities</CardTitle>
        <CardDescription>Based on CRA Form T2125 - Period: {renderDateRange()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <h3 className="font-semibold text-lg mb-2">Part 3 - Business Income</h3>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Sales, commissions, or fees</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.businessIncome.sales)}</TableCell>
              </TableRow>
               <TableRow>
                <TableCell>Other income</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(data.businessIncome.other)}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
                <TableRow className="font-bold bg-muted/50">
                    <TableCell>Gross business or professional income</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(data.businessIncome.gross)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </section>

        <Separator />
        
        <section>
            <div className="flex justify-between items-baseline mb-2">
                <h3 className="font-semibold text-lg">Net income (loss) before adjustments</h3>
                <p className="font-bold text-lg font-mono">{formatCurrency(data.netIncomeBeforeExpenses)}</p>
            </div>
        </section>

        <Separator />

        <section>
          <h3 className="font-semibold text-lg mb-2">Part 4 - Expenses</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {t2125ExpenseCategories.map(cat => (
                <TableRow key={cat.key}>
                    <TableCell>{cat.line} - {cat.description}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(data.expenses[cat.key])}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
                <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total expenses</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(data.totalExpenses)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </section>
        
         <Separator />
        
        <section className="pt-4">
            <div className="flex justify-between items-baseline text-xl font-bold">
                <h3>Net profit (or loss)</h3>
                <p className={`font-mono ${data.netProfitOrLoss < 0 ? 'text-destructive' : 'text-primary'}`}>{formatCurrency(data.netProfitOrLoss)}</p>
            </div>
        </section>

      </CardContent>
    </Card>
  );
}
