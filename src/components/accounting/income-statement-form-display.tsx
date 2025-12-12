
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, FileDown, Printer, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t2125ExpenseCategories, t2125IncomeCategories } from '@/data/standard-expense-categories';
import { cn } from '@/lib/utils';
import { useReactToPrint } from '@/hooks/use-react-to-print';

interface IncomeStatementFormDisplayProps {
  categorizedIncome: Record<string, number>;
  grossIncome: number;
  categorizedExpenses: Record<string, number>;
  totalExpenses: number;
  netIncome: number;
}

const formatCurrencyForInput = (amount: number) => {
    return amount.toFixed(2);
};

const FormRow = ({ label, value, line }: { label: string; value: number; line: string; }) => {
    const isClickable = value !== 0 && line !== '9936'; // Make CCA line not clickable for now

    const content = (
         <div className={cn("grid grid-cols-10 items-center gap-4 rounded-md", isClickable && "p-2 -m-2 group-hover:bg-accent")}>
            <div className="col-span-6 flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-12 text-right">{line}</span>
                <Label htmlFor={`line-${line}`}>{label}</Label>
            </div>
            <div className="relative col-span-4">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                <Input
                    id={`line-${line}`}
                    readOnly
                    disabled
                    value={formatCurrencyForInput(value)}
                    className={cn(
                        "pl-7 font-mono text-right bg-muted/20",
                        isClickable && "cursor-pointer group-hover:ring-2 group-hover:ring-primary"
                    )}
                />
            </div>
        </div>
    );

    if (isClickable) {
        return (
            <Link href={`/accounting/ledgers?tab=bks&category=${encodeURIComponent(label)}`} className="group">
                {content}
            </Link>
        );
    }
    
    return content;
};

export const IncomeStatementFormDisplay = ({ categorizedIncome, grossIncome, categorizedExpenses, totalExpenses, netIncome }: IncomeStatementFormDisplayProps) => {
    const { handlePrint, contentRef } = useReactToPrint();
    
    // Split the categories for a two-column layout
    const midPoint = Math.ceil(t2125ExpenseCategories.length / 2);
    const column1Categories = t2125ExpenseCategories.slice(0, midPoint);
    const column2Categories = t2125ExpenseCategories.slice(midPoint);

    return (
        <Card ref={contentRef}>
            <CardHeader>
                <CardTitle>Income Statement</CardTitle>
                <CardDescription>Based on CRA Form T2125. For review purposes only. Click on a line item to see its transactions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Part 1 & 3: Business Income */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Business Income</h3>
                    {t2125IncomeCategories.map(cat => {
                        const value = categorizedIncome[cat.description] || 0;
                        return <FormRow key={cat.line} label={cat.description} value={value} line={cat.line} />;
                    })}
                    <Separator />
                    <FormRow label="Gross income" value={grossIncome} line="Part 3C" />
                </div>
                <Separator />
                
                {/* Part 4: Business Expenses */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Business Expenses</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="space-y-4">
                            {column1Categories.map((cat) => {
                                const value = categorizedExpenses[cat.description] || 0;
                                return <FormRow key={cat.line} label={cat.description} value={value} line={cat.line} />;
                            })}
                        </div>
                         <div className="space-y-4">
                            {column2Categories.map((cat) => {
                                const value = categorizedExpenses[cat.description] || 0;
                                return <FormRow key={cat.line} label={cat.description} value={value} line={cat.line} />;
                            })}
                        </div>
                    </div>
                </div>
                <Separator />

                {/* Part 5: Summary */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Summary</h3>
                    <FormRow label="Total Expenses" value={totalExpenses} line="9369" />
                    <div className="grid grid-cols-10 items-center gap-4 pt-4">
                        <div className="col-span-6 flex items-center gap-2">
                             <span className="text-xs text-muted-foreground w-12 text-right">9370</span>
                            <Label className="font-bold text-lg">Net Income (Loss)</Label>
                        </div>
                        <div className="relative col-span-4">
                             <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                            <Input
                                readOnly
                                disabled
                                value={formatCurrencyForInput(netIncome)}
                                className="pl-7 font-mono text-right text-lg font-bold bg-background"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4 print:hidden">
                 <div className="flex w-full justify-end gap-2">
                    <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print</Button>
                    <Button variant="outline"><FileDown className="mr-2 h-4 w-4"/> Download PDF</Button>
                </div>
                 <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <AlertCircle className="h-4 w-4"/>
                    <span>This is a simplified summary and not an official tax document. Consult with a professional for tax advice.</span>
                </div>
            </CardFooter>
        </Card>
    );
}
