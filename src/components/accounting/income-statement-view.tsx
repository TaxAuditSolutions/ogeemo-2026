
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as CalendarIcon, FilterX, LoaderCircle, Printer } from 'lucide-react';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/context/auth-context';
import { getIncomeTransactions, getExpenseTransactions, type IncomeTransaction, type ExpenseTransaction } from '@/services/accounting-service';
import { T2125FormDisplay } from './income-statement-form-display';
import { t2125ExpenseCategories, t2125IncomeCategories } from '@/data/standard-expense-categories';
import { useToast } from '@/hooks/use-toast';

export interface CalculatedT2125Data {
  businessIncome: { sales: number; other: number; gross: number; };
  costOfGoodsSold: { purchases: number; total: number; };
  netIncomeBeforeExpenses: number;
  expenses: { [key: string]: number; };
  totalExpenses: number;
  netProfitOrLoss: number;
}

export function IncomeStatementView() {
  const [income, setIncome] = useState<IncomeTransaction[]>([]);
  const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfYear(new Date()), to: endOfYear(new Date()) });
  const { handlePrint, contentRef } = useReactToPrint();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const [incomeData, expenseData] = await Promise.all([
            getIncomeTransactions(user.uid),
            getExpenseTransactions(user.uid),
          ]);
          setIncome(incomeData);
          setExpenses(expenseData);
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to load financial data.' });
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [user, toast]);

  const calculatedData: CalculatedT2125Data | null = useMemo(() => {
    if (!dateRange?.from) return null;
    const toDate = dateRange.to || dateRange.from;

    const filteredIncome = income.filter(tx => isWithinInterval(new Date(tx.date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) }));
    const filteredExpenses = expenses.filter(tx => isWithinInterval(new Date(tx.date), { start: startOfDay(dateRange.from!), end: endOfDay(toDate) }));

    let sales = 0;
    let otherIncome = 0;
    
    const primaryIncomeLine = t2125IncomeCategories.find(c => c.key === 'sales')?.line;

    filteredIncome.forEach(tx => {
        if (tx.incomeCategory === primaryIncomeLine || tx.incomeCategory?.startsWith('C-')) {
            sales += tx.totalAmount;
        } else {
            otherIncome += tx.totalAmount;
        }
    });

    const businessIncome = { sales, other: otherIncome, gross: sales + otherIncome };
    const costOfGoodsSold = { purchases: 0, total: 0 };
    const netIncomeBeforeExpenses = businessIncome.gross - costOfGoodsSold.total;

    const expenseTotals: { [key: string]: number } = {};
    t2125ExpenseCategories.forEach(cat => (expenseTotals[cat.key] = 0));
    expenseTotals.otherExpenses = 0;

    filteredExpenses.forEach(tx => {
        const category = t2125ExpenseCategories.find(c => c.line === tx.category);
        if (category) {
            expenseTotals[category.key] += tx.totalAmount;
        } else {
            expenseTotals.otherExpenses += tx.totalAmount;
        }
    });
    
    const totalExpenses = Object.values(expenseTotals).reduce((sum, val) => sum + val, 0);
    const netProfitOrLoss = netIncomeBeforeExpenses - totalExpenses;

    return {
      businessIncome,
      costOfGoodsSold,
      netIncomeBeforeExpenses,
      expenses: expenseTotals,
      totalExpenses,
      netProfitOrLoss,
    };
  }, [income, expenses, dateRange]);
  
  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <>
      <div className="flex justify-center gap-2 mb-4 print:hidden">
          <Popover>
            <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? ( dateRange.to ? ( <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</> ) : ( format(dateRange.from, "LLL dd, y") ) ) : ( <span>Pick a date range</span> )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
          <Button variant="secondary" onClick={() => setDateRange({ from: startOfYear(new Date()), to: endOfYear(new Date()) })}>This Year</Button>
          <Button variant="secondary" onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>This Month</Button>
          <Button variant="ghost" onClick={() => setDateRange(undefined)}><FilterX className="mr-2 h-4 w-4"/>Clear</Button>
          <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/>Print</Button>
      </div>

      {calculatedData ? (
        <div ref={contentRef}>
            <T2125FormDisplay data={calculatedData} dateRange={dateRange} />
        </div>
      ) : (
        <div className="text-center p-8 text-muted-foreground">Select a date range to generate the report.</div>
      )}
    </>
  );
}
