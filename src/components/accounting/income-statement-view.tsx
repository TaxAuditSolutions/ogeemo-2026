
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, FileText, Printer, Calendar as CalendarIcon, FilterX } from 'lucide-react';
import { format, startOfYear, endOfYear } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { getIncomeTransactions, getExpenseTransactions } from '@/services/accounting-service';
import { t2125IncomeCategories, t2125ExpenseCategories } from '@/data/standard-expense-categories';
import { IncomeStatementFormDisplay } from './income-statement-form-display';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';

export function IncomeStatementView() {
    const [isLoading, setIsLoading] = useState(true);
    const [income, setIncome] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const { user } = useAuth();
    const { toast } = useToast();
    const { handlePrint, contentRef } = useReactToPrint();
    
    const defaultDateRange: DateRange = {
        from: startOfYear(new Date()),
        to: endOfYear(new Date()),
    };
    const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange);

    useEffect(() => {
        async function loadData() {
            if (!user) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const [incomeData, expenseData] = await Promise.all([
                    getIncomeTransactions(user.uid),
                    getExpenseTransactions(user.uid),
                ]);
                setIncome(incomeData);
                setExpenses(expenseData);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Failed to load report data', description: error.message });
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user, toast]);

    const filteredData = useMemo(() => {
        const filterByDate = (tx: { date: string | Date }) => {
            if (!dateRange?.from) return true;
            const txDate = new Date(tx.date);
            const endDate = dateRange.to ? endOfYear(dateRange.to) : endOfYear(dateRange.from);
            return txDate >= dateRange.from && txDate <= endDate;
        };
        return {
            income: income.filter(filterByDate),
            expenses: expenses.filter(filterByDate),
        };
    }, [income, expenses, dateRange]);

    const clearFilters = () => {
        setDateRange(defaultDateRange);
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <div className="flex flex-wrap items-end gap-4 pt-2">
                        <div className="space-y-2">
                            <Label>Filter by Year</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? format(dateRange.from, "yyyy") : <span>Pick a year</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dateRange?.from}
                                        onSelect={(date) => date && setDateRange({ from: startOfYear(date), to: endOfYear(date) })}
                                        captionLayout="dropdown-buttons"
                                        fromYear={2015}
                                        toYear={new Date().getFullYear()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button variant="ghost" onClick={clearFilters} disabled={!dateRange || (dateRange.from === defaultDateRange.from && dateRange.to === defaultDateRange.to)}>
                            <FilterX className="mr-2 h-4 w-4"/> Clear Filter
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <Card ref={contentRef} className="print:border-none print:shadow-none">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                        <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-headline">
                        Statement of Business or Professional Activities
                    </CardTitle>
                    <CardDescription>
                        Based on CRA Form T2125 for the period of {dateRange?.from ? format(dateRange.from, 'PPP') : '...'} to {dateRange?.to ? format(dateRange.to, 'PPP') : '...'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <IncomeStatementFormDisplay 
                        incomeTransactions={filteredData.income}
                        expenseTransactions={filteredData.expenses}
                    />
                </CardContent>
                <CardFooter className="print:hidden">
                    <Button onClick={handlePrint} className="ml-auto">
                        <Printer className="mr-2 h-4 w-4"/> Print Statement
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
