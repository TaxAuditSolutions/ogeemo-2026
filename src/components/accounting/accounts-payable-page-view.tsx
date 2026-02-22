
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoaderCircle, Landmark, CheckCircle, PlusCircle, Trash2, MoreVertical, Pencil, FileDigit, ChevronsUpDown, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getPayableBills, addPayableBill, postBillPayment, deletePayableBill, type PayableBill, getCompanies, type Company, getExpenseCategories, type ExpenseCategory } from '@/services/accounting-service';
import { AccountingPageHeader } from './page-header';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const paymentMethodOptions = ["Cash", "Cheque", "Credit Card", "Email Transfer", "Bank Transfer", "In Kind", "Miscellaneous", "GL Adjustment"];

const emptyBillForm = {
    vendor: '',
    invoiceNumber: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    totalAmount: '',
    category: '',
    description: '',
    documentUrl: '',
};

export function AccountsPayablePageView() {
  const [bills, setBills] = useState<PayableBill[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Bill Form State
  const [isAddBillOpen, setIsAddAddBillOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [billForm, setBillForm] = useState(emptyBillForm);
  const [isVendorPopoverOpen, setIsVendorPopoverOpen] = useState(false);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

  // Payment State
  const [billToPay, setBillToPay] = useState<PayableBill | null>(null);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');

  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedBills, fetchedCompanies, fetchedCategories] = await Promise.all([
        getPayableBills(user.uid),
        getCompanies(user.uid),
        getExpenseCategories(user.uid)
      ]);
      setBills(fetchedBills);
      setCompanies(fetchedCompanies);
      setCategories(fetchedCategories);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveBill = async () => {
    if (!user || !billForm.vendor || !billForm.totalAmount || !billForm.category) {
        toast({ variant: 'destructive', title: 'Missing Info', description: 'Please provide vendor, amount, and category.' });
        return;
    }

    setIsSaving(true);
    try {
        await addPayableBill({
            ...billForm,
            totalAmount: parseFloat(billForm.totalAmount),
            userId: user.uid,
        });
        toast({ title: 'Bill Logged', description: 'Added to your Accounts Payable.' });
        setIsAddAddBillOpen(false);
        setBillForm(emptyBillForm);
        loadData();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  const handlePostPayment = async () => {
    if (!user || !billToPay) return;
    setIsSaving(true);
    try {
        await postBillPayment(user.uid, billToPay.id, paymentDate, paymentMethod);
        toast({ 
            title: 'Payment Posted', 
            description: `Expense added to GL and bill removed from AP.` 
        });
        setBillToPay(null);
        loadData();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Payment Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  const totalPayable = useMemo(() => {
      return bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  }, [bills]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="Accounts Payable" />
        <header className="text-center">
            <h1 className="text-3xl font-bold font-headline text-primary">
                Accounts Payable
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
                Registry of all outstanding bills. Post a payment to move the record to the General Ledger.
            </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <Card className="md:col-span-1 border-destructive/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Unpaid Bills</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-destructive">{formatCurrency(totalPayable)}</p>
                </CardContent>
            </Card>
            <Card className="md:col-span-2 flex flex-col justify-center px-6 bg-muted/30">
                <p className="text-sm text-muted-foreground italic">
                    "Track what you owe today so you can forecast tomorrow."
                    <br />
                    Once paid, bills are permanently recorded in the BKS General Ledger.
                </p>
            </Card>
        </div>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Accounts Payable Ledger</CardTitle>
                    <CardDescription>Unpaid vendor invoices and accrued liabilities.</CardDescription>
                </div>
                <Button onClick={() => setIsAddAddBillOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Log New Bill
                </Button>
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
                                <TableHead>Due Date</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Invoice #</TableHead>
                                <TableHead className="text-right">Amount Due</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bills.length > 0 ? bills.map(bill => (
                                <TableRow key={bill.id}>
                                    <TableCell>{format(new Date(bill.dueDate), 'PP')}</TableCell>
                                    <TableCell className="font-medium">{bill.vendor}</TableCell>
                                    <TableCell>{bill.invoiceNumber}</TableCell>
                                    <TableCell className="text-right font-mono text-destructive">{formatCurrency(bill.totalAmount)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/5" onClick={() => setBillToPay(bill)}>
                                                <Landmark className="mr-2 h-4 w-4"/> Post Payment
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={async () => {
                                                if (window.confirm("Permanently delete this bill?")) {
                                                    await deletePayableBill(bill.id);
                                                    loadData();
                                                }
                                            }}>
                                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No outstanding bills found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>

        {/* Log Bill Dialog */}
        <Dialog open={isAddBillOpen} onOpenChange={setIsAddAddBillOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Log Outstanding Bill</DialogTitle>
                    <DialogDescription>Add a vendor invoice to your Accounts Payable.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Vendor *</Label>
                        <Popover open={isVendorPopoverOpen} onOpenChange={setIsVendorPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">{billForm.vendor || "Select vendor..."}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50"/></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search vendors..." onValueChange={(val) => setBillForm(p => ({...p, vendor: val}))} />
                                    <CommandList>
                                        <CommandEmpty>Select to add new vendor.</CommandEmpty>
                                        <CommandGroup>
                                            {companies.map(c => (
                                                <CommandItem key={c.id} onSelect={() => { setBillForm(p => ({...p, vendor: c.name})); setIsVendorPopoverOpen(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", billForm.vendor === c.name ? "opacity-100" : "opacity-0")} /> {c.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Invoice #</Label>
                            <Input value={billForm.invoiceNumber} onChange={e => setBillForm(p => ({...p, invoiceNumber: e.target.value}))} placeholder="Optional" />
                        </div>
                        <div className="space-y-2">
                            <Label>Due Date *</Label>
                            <Input type="date" value={billForm.dueDate} onChange={e => setBillForm(p => ({...p, dueDate: e.target.value}))} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Amount *</Label>
                            <Input type="number" step="0.01" value={billForm.totalAmount} onChange={e => setBillForm(p => ({...p, totalAmount: e.target.value}))} placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                            <Label>Tax Category *</Label>
                            <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between truncate">{categories.find(c => c.categoryNumber === billForm.category)?.name || "Select category..."}<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50"/></Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search category..." />
                                        <CommandList>
                                            <CommandGroup>
                                                {categories.map(c => (
                                                    <CommandItem key={c.id} onSelect={() => { setBillForm(p => ({...p, category: c.categoryNumber! })); setIsCategoryPopoverOpen(false); }}>
                                                        <Check className={cn("mr-2 h-4 w-4", billForm.category === c.categoryNumber ? "opacity-100" : "opacity-0")} /> {c.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input value={billForm.description} onChange={e => setBillForm(p => ({...p, description: e.target.value}))} placeholder="Brief description of the bill..." />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsAddAddBillOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveBill} disabled={isSaving}>Save Bill</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Post Payment Dialog */}
        <Dialog open={!!billToPay} onOpenChange={() => setBillToPay(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Post Bill Payment</DialogTitle>
                    <DialogDescription>Record payment for bill from {billToPay?.vendor}. This will move the record to your BKS General Ledger.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Payment Date</Label>
                        <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentMethodOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm font-semibold">Amount to record:</span>
                            <span className="text-xl font-bold text-primary">{billToPay ? formatCurrency(billToPay.totalAmount) : ''}</span>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setBillToPay(null)}>Cancel</Button>
                    <Button onClick={handlePostPayment} disabled={isSaving}>
                        {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Post to GL
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
