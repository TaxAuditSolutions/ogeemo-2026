
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfQuarter, endOfQuarter } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, LoaderCircle, FileDigit } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getIncomeTransactions, getExpenseTransactions, addExpenseTransaction, type IncomeTransaction, type ExpenseTransaction } from '@/services/accounting-service';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { t2125ExpenseCategories } from '@/data/standard-expense-categories';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const endOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};


export default function SalesTaxPage() {
    const [income, setIncome] = useState<IncomeTransaction[]>([]);
    const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [carriedForward, setCarriedForward] = useState<number>(0);
    const [showOnlyTax, setShowOnlyTax] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const defaultDateRange = {
        from: startOfQuarter(new Date()),
        to: endOfQuarter(new Date()),
    };
    const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
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
                toast({ variant: 'destructive', title: 'Failed to load transaction data', description: error.message });
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [user, toast]);

    const { filteredIncome, filteredExpenses, taxCollected, taxPaid, netTax } = useMemo(() => {
        const from = dateRange?.from;
        const to = dateRange?.to ? endOfDay(dateRange.to) : undefined;

        const filterByDate = (tx: { date: string }) => {
            if (!from) return true;
            const txDate = new Date(tx.date);
            if (to) {
                return txDate >= from && txDate < to;
            }
            return txDate >= from && txDate < addDays(from, 1);
        };
        
        const allIncomeInRange = income.filter(filterByDate);
        const allExpensesInRange = expenses.filter(filterByDate);
        
        const filteredIncome = showOnlyTax ? allIncomeInRange.filter(tx => tx.taxAmount && tx.taxAmount > 0) : allIncomeInRange;
        const filteredExpenses = showOnlyTax ? allExpensesInRange.filter(tx => tx.taxAmount && tx.taxAmount > 0) : allExpensesInRange;

        const taxCollected = allIncomeInRange.reduce((sum, tx) => sum + (tx.taxAmount || 0), 0);
        const taxPaid = allExpensesInRange.reduce((sum, tx) => sum + (tx.taxAmount || 0), 0);
        const netTax = (taxCollected - taxPaid) + carriedForward;

        return { filteredIncome, filteredExpenses, taxCollected, taxPaid, netTax };
    }, [income, expenses, dateRange, carriedForward, showOnlyTax]);

    const handleRecordRemittance = async () => {
        if (!user || netTax <= 0) {
            toast({ variant: 'destructive', title: 'No Remittance to Record', description: 'Net tax must be positive to record a payment.'});
            return;
        }

        try {
            const taxesAndLicensesCategory = t2125ExpenseCategories.find(cat => cat.description === "Taxes & Licenses");

            const expenseData: Omit<ExpenseTransaction, 'id'> = {
                date: format(new Date(), 'yyyy-MM-dd'),
                company: 'Canada Revenue Agency',
                description: `Sales Tax Remittance for ${dateRange?.from ? format(dateRange.from, 'PP') : ''} - ${dateRange?.to ? format(dateRange.to, 'PP') : 'period'}`,
                totalAmount: netTax,
                preTaxAmount: netTax,
                taxAmount: 0,
                taxRate: 0,
                category: taxesAndLicensesCategory ? taxesAndLicensesCategory.line : '9999', // Default fallback
                type: 'business',
                userId: user.uid,
            };

            await addExpenseTransaction(expenseData);
            toast({
                title: 'Remittance Payment Logged',
                description: `An expense of ${formatCurrency(netTax)} has been added to your ledger.`
            });
            // Optionally, refresh expense data here
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to Record Payment', description: error.message });
        }
    };
    
    const handleRowClick = (transactionId: string, type: 'income' | 'expense') => {
        const tab = type === 'income' ? 'income' : 'expenses';
        router.push(`/accounting/ledgers?tab=${tab}&highlight=${transactionId}`);
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <AccountingPageHeader pageTitle="Sales Tax" hubPath="/accounting/tax" hubLabel="Tax Center" />
            <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary">Sales Tax Calculator</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Select a date range to calculate your net sales tax for the period.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Reporting Period</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                     <div className="space-y-2">
                        <Label>Date Range</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="carried-forward">Carried Forward Amount</Label>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                            <Input
                                id="carried-forward"
                                type="number"
                                placeholder="0.00"
                                value={carriedForward}
                                onChange={(e) => setCarriedForward(Number(e.target.value))}
                                className="pl-7"
                            />
                        </div>
                     </div>
                    <Button variant="secondary" onClick={() => setDateRange(defaultDateRange)}>Current Quarter</Button>
                    <Button variant="ghost" onClick={() => setDateRange(undefined)}>Clear Date</Button>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex h-64 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader><CardTitle>Tax Collected (Income)</CardTitle></CardHeader>
                            <CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(taxCollected)}</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Tax Paid (ITCs)</CardTitle></CardHeader>
                            <CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(taxPaid)}</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Net Tax Due</CardTitle></CardHeader>
                            <CardContent><p className="text-2xl font-bold text-primary">{formatCurrency(netTax)}</p></CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={handleRecordRemittance} disabled={netTax <= 0}>
                                    <FileDigit className="mr-2 h-4 w-4" /> Record Remittance Payment
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox id="show-tax-only" checked={showOnlyTax} onCheckedChange={(checked) => setShowOnlyTax(!!checked)} />
                        <label
                            htmlFor="show-tax-only"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Show only transactions with tax
                        </label>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle>Income Transactions</CardTitle></CardHeader>
                            <CardContent>
                                <ScrollArea className="h-72">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Client</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Tax</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {filteredIncome.map(tx => (
                                                <TableRow key={tx.id} onClick={() => handleRowClick(tx.id, 'income')} className="cursor-pointer">
                                                    <TableCell>{tx.date}</TableCell>
                                                    <TableCell>{tx.company}</TableCell>
                                                    <TableCell>{tx.description}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(tx.totalAmount || 0)}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(tx.taxAmount || 0)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Expense Transactions</CardTitle></CardHeader>
                            <CardContent>
                                <ScrollArea className="h-72">
                                     <Table>
                                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Vendor</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Tax</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                             {filteredExpenses.map(tx => (
                                                <TableRow key={tx.id} onClick={() => handleRowClick(tx.id, 'expense')} className="cursor-pointer">
                                                    <TableCell>{tx.date}</TableCell>
                                                    <TableCell>{tx.company}</TableCell>
                                                    <TableCell>{tx.description}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(tx.totalAmount || 0)}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(tx.taxAmount || 0)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}

