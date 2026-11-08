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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as CalendarIcon, FilterX, LoaderCircle, Printer, Info, FileText } from 'lucide-react';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { buildIncomeStatement, type IncomeStatementData } from '@/lib/income-statement';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/context/auth-context';
import { getIncomeTransactions, getExpenseTransactions, type IncomeTransaction, type ExpenseTransaction } from '@/core/accounting-service';
import { T2125FormDisplay } from './income-statement-form-display';
import { t2125ExpenseCategories, t2125IncomeCategories } from '@/data/standard-expense-categories';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from '@/components/ui/label';
import { CustomCalendar } from '@/components/ui/custom-calendar';

export type CalculatedT2125Data = IncomeStatementData;

const formatNoteAmount = (amount: number) => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function IncomeStatementView() {
  const [income, setIncome] = useState<IncomeTransaction[]>([]);
  const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfYear(new Date()), to: endOfYear(new Date()) });
  
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

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
    // Sales tax is not income or expense, so every figure is BEFORE tax; Personal entries and the
    // payment of net sales tax to CRA are left out too (see lib/income-statement).
    return buildIncomeStatement(income, expenses, { from: dateRange.from, to: dateRange.to || dateRange.from }, {
      salesLine: t2125IncomeCategories.find(c => c.key === 'sales')?.line ?? '',
      expenseCategories: t2125ExpenseCategories,
    });
  }, [income, expenses, dateRange]);
  
  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <>
      <div className="space-y-6">
        <Alert className="bg-primary/10 border-primary/20 max-w-4xl mx-auto">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle>Notice</AlertTitle>
            <AlertDescription>
                Ensure your ledger entries are assigned to the correct tax line numbers for maximum accuracy.
                All amounts are before sales tax (GST/HST): tax collected and tax paid are tracked separately on the Sales Tax page.
                {calculatedData && calculatedData.notes.remittancesExcluded > 0 && (
                    <> {calculatedData.notes.remittancesExcluded} sales tax payment{calculatedData.notes.remittancesExcluded === 1 ? '' : 's'} to CRA ({formatNoteAmount(calculatedData.notes.remittanceTotal)}) {calculatedData.notes.remittancesExcluded === 1 ? 'is' : 'are'} left out of expenses.</>
                )}
                {calculatedData && calculatedData.notes.incomeWithoutTaxRecorded > 0 && (
                    <> {calculatedData.notes.incomeWithoutTaxRecorded} income {calculatedData.notes.incomeWithoutTaxRecorded === 1 ? 'entry has' : 'entries have'} no tax recorded and {calculatedData.notes.incomeWithoutTaxRecorded === 1 ? 'is' : 'are'} counted at the full amount; edit {calculatedData.notes.incomeWithoutTaxRecorded === 1 ? 'it' : 'them'} to set the tax if tax was charged.</>
                )}
            </AlertDescription>
        </Alert>

        <div className="flex flex-wrap items-end justify-center gap-4 mb-4 print:hidden">
            <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-48 justify-start text-left font-normal px-4 bg-white", !dateRange?.from && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? format(dateRange.from, "PPP") : <span>Start Date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <CustomCalendar 
                            mode="single" 
                            selected={dateRange?.from} 
                            onSelect={(date) => { 
                                setDateRange(prev => ({ from: date, to: prev?.to })); 
                                setIsStartDatePickerOpen(false); 
                            }} 
                            initialFocus 
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2">
                <Label>End Date</Label>
                <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-48 justify-start text-left font-normal px-4 bg-white", !dateRange?.to && "text-muted-foreground")} disabled={!dateRange?.from}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.to ? format(dateRange.to, "PPP") : <span>End Date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <CustomCalendar 
                            mode="single" 
                            selected={dateRange?.to} 
                            onSelect={(date) => { 
                                setDateRange(prev => ({ from: prev?.from, to: date })); 
                                setIsEndDatePickerOpen(false); 
                            }} 
                            disabled={(date) => dateRange?.from ? date < dateRange.from : false}
                            initialFocus 
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setDateRange({ from: startOfYear(new Date()), to: endOfYear(new Date()) })}>This Year</Button>
                <Button variant="secondary" onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>This Month</Button>
                <Button variant="ghost" onClick={() => setDateRange(undefined)}><FilterX className="mr-2 h-4 w-4"/>Clear</Button>
                <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/>Print Report</Button>
            </div>
        </div>

        {calculatedData ? (
            <div ref={contentRef}>
                <T2125FormDisplay data={calculatedData} dateRange={dateRange} />
            </div>
        ) : (
            <div className="text-center p-12 border-2 border-dashed rounded-lg max-w-4xl mx-auto text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Select a date range to generate your Income Statement.</p>
            </div>
        )}
      </div>
    </>
  );
}
