
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar as CalendarIcon, ChevronsUpDown, Check, Printer, LoaderCircle } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { format, startOfMonth, endOfDay } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { getContacts, type Contact } from '@/services/contact-service';
import { getInvoices, type Invoice } from '@/services/accounting-service';
import { cn } from '@/lib/utils';
import { AccountingPageHeader } from '@/components/accounting/page-header';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

type StatementEntry = {
    date: Date;
    description: string;
    invoiceAmount: number | null;
    paymentAmount: number | null;
};

export default function ClientStatementPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
    const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
    const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);

    const { user } = useAuth();
    const { toast } = useToast();
    const { handlePrint, contentRef } = useReactToPrint();
    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            if (!user) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const [accounts, allInvoices] = await Promise.all([
                    getContacts(user.uid),
                    getInvoices(user.uid),
                ]);
                setContacts(accounts);
                setInvoices(allInvoices);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user, toast]);
    
    const statementData = useMemo(() => {
        if (!selectedContactId) return { entries: [], startingBalance: 0, endingBalance: 0 };
        
        const clientInvoices = invoices.filter(inv => inv.contactId === selectedContactId);
        
        const allEntries: StatementEntry[] = [];
        clientInvoices.forEach(inv => {
            allEntries.push({ date: inv.invoiceDate, description: `Invoice #${inv.invoiceNumber}`, invoiceAmount: inv.originalAmount, paymentAmount: null });
            if (inv.amountPaid > 0) {
                 // For now, we assume payment is made on the due date. This could be enhanced later.
                allEntries.push({ date: inv.dueDate, description: `Payment for Invoice #${inv.invoiceNumber}`, invoiceAmount: null, paymentAmount: inv.amountPaid });
            }
        });
        
        const sortedEntries = allEntries.sort((a,b) => a.date.getTime() - b.date.getTime());
        
        let filteredEntries = sortedEntries;
        let startingBalance = 0;

        if (startDate) {
            startingBalance = sortedEntries
                .filter(entry => entry.date < startDate)
                .reduce((acc, entry) => acc + (entry.invoiceAmount || 0) - (entry.paymentAmount || 0), 0);
            
            const toDate = endDate ? endOfDay(endDate) : endOfDay(startDate);
            filteredEntries = sortedEntries.filter(entry => entry.date >= startDate && entry.date <= toDate);
        } else {
             // If no start date, show all entries
            filteredEntries = sortedEntries;
        }

        const endingBalance = filteredEntries.reduce((acc, entry) => acc + (entry.invoiceAmount || 0) - (entry.paymentAmount || 0), startingBalance);

        return { entries: filteredEntries, startingBalance, endingBalance };
    }, [selectedContactId, invoices, startDate, endDate]);
    
    const setMonthToDate = () => {
        setStartDate(startOfMonth(new Date()));
        setEndDate(new Date());
    };
    
    const clearDates = () => {
        setStartDate(undefined);
        setEndDate(undefined);
    };

    const selectedContact = contacts.find(c => c.id === selectedContactId);

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6">
                <AccountingPageHeader pageTitle="Client Statement" hubPath="/reports" hubLabel="Reports" />
                <header className="text-center">
                  <h1 className="text-3xl font-bold font-headline text-primary">Client Statement</h1>
                  <p className="text-muted-foreground">Generate a statement of account for a specific client.</p>
                </header>

                <Card className="print:hidden">
                    <CardHeader>
                        <CardTitle>Select a Client & Date Range</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Client</Label>
                            <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between">
                                        {selectedContact?.name || "Select client..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command><CommandInput placeholder="Search clients..." /><CommandList><CommandEmpty>{isLoading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : "No client found."}</CommandEmpty><CommandGroup>{contacts.map(c => (<CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedContactId(c.id); setIsContactPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedContactId === c.id ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Popover open={isStartPopoverOpen} onOpenChange={setIsStartPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "PPP") : <span>Start Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={(date) => { setStartDate(date); setIsStartPopoverOpen(false); }} disabled={(date) => endDate ? date > endDate : false} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Popover open={isEndPopoverOpen} onOpenChange={setIsEndPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDate ? format(endDate, "PPP") : <span>End Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={(date) => { setEndDate(date); setIsEndPopoverOpen(false); }} disabled={(date) => startDate ? date < startDate : false} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <Button variant="secondary" onClick={setMonthToDate} className="w-full">Month to Date</Button>
                            <Button variant="ghost" onClick={clearDates} className="w-full">Clear Dates</Button>
                        </div>
                    </CardContent>
                </Card>

                <div ref={contentRef}>
                    <Card className="print:border-none print:shadow-none">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Statement for {selectedContact?.name || "Client"}</CardTitle>
                            <CardDescription>
                                {startDate ? endDate ? `${format(startDate, "PPP")} to ${format(endDate, "PPP")}` : `Since ${format(startDate, "PPP")}` : "All Time"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="h-48 flex items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin"/></div>
                            ) : selectedContactId ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Charges</TableHead>
                                            <TableHead className="text-right">Payments</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell colSpan={4} className="font-medium">Balance Forward</TableCell>
                                            <TableCell className="text-right font-medium font-mono">{formatCurrency(statementData.startingBalance)}</TableCell>
                                        </TableRow>
                                        {statementData.entries.map((entry, index) => {
                                            const runningBalance = statementData.entries.slice(0, index + 1).reduce((acc, curr) => acc + (curr.invoiceAmount || 0) - (curr.paymentAmount || 0), statementData.startingBalance);
                                            return (
                                                <TableRow key={index}>
                                                    <TableCell>{format(entry.date, 'yyyy-MM-dd')}</TableCell>
                                                    <TableCell>{entry.description}</TableCell>
                                                    <TableCell className="text-right font-mono">{entry.invoiceAmount ? formatCurrency(entry.invoiceAmount) : ''}</TableCell>
                                                    <TableCell className="text-right font-mono text-green-600">{entry.paymentAmount ? `(${formatCurrency(entry.paymentAmount)})` : ''}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(runningBalance)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={4} className="font-bold text-lg">Total Balance Due</TableCell>
                                            <TableCell className="text-right font-bold font-mono text-lg">{formatCurrency(statementData.endingBalance)}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            ) : (
                                <div className="h-48 flex items-center justify-center"><p className="text-muted-foreground">Please select a client to generate a statement.</p></div>
                            )}
                        </CardContent>
                        <CardFooter className="print:hidden justify-end space-x-2">
                            <Button variant="outline" onClick={handlePrint} disabled={!selectedContactId}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print Statement
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </>
    );
}
