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
  CommandInput,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoaderCircle, Landmark, CheckCircle, PlusCircle, Trash2, MoreVertical, Pencil, FileDigit, ChevronsUpDown, Check, UserPlus, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getPayableBills, addPayableBill, updatePayableBill, postBillPayment, deletePayableBill, type PayableBill, getCompanies, type Company, getExpenseCategories, type ExpenseCategory } from '@/services/accounting-service';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { type Contact } from '@/services/contact-service';
import { AccountingPageHeader } from './page-header';
import { cn } from '@/lib/utils';
import ContactFormDialog from '../contacts/contact-form-dialog';
import { Separator } from '../ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const paymentMethodOptions = ["Cash", "Cheque", "Credit Card", "Email Transfer", "Bank Transfer", "In Kind", "Miscellaneous", "GL Adjustment"];

const emptyBillForm = {
    vendor: '',
    invoiceNumber: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    quantity: '1',
    unitPrice: '',
    totalAmount: '',
    taxRate: '',
    preTaxAmount: '',
    taxAmount: '',
    category: '',
    description: '',
    documentUrl: '',
};

export function AccountsPayablePageView() {
  const [bills, setBills] = useState<PayableBill[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Bill Form State
  const [isAddBillOpen, setIsAddAddBillOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [billToEditId, setBillToEditId] = useState<string | null>(null);
  const [billForm, setBillForm] = useState(emptyBillForm);
  const [isVendorPopoverOpen, setIsVendorPopoverOpen] = useState(false);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

  // New Supplier (Contact) State
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);

  // Payment State
  const [billToPay, setBillToPay] = useState<PayableBill | null>(null);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');

  // Deletion State
  const [billToDelete, setBillToDelete] = useState<PayableBill | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedBills, fetchedCompanies, fetchedCategories, fetchedFolders, fetchedIndustries] = await Promise.all([
        getPayableBills(user.uid),
        getCompanies(user.uid),
        getExpenseCategories(user.uid),
        getContactFolders(user.uid),
        getIndustries(user.uid)
      ]);
      setBills(fetchedBills);
      setCompanies(fetchedCompanies);
      setExpenseCategories(fetchedCategories);
      setContactFolders(fetchedFolders);
      setCustomIndustries(fetchedIndustries);
    } catch (error: any) {
      // Standard errors are already handled by services emitting contextual errors
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync bill form calculations
  useEffect(() => {
    const qty = parseFloat(billForm.quantity) || 0;
    const unitPrice = parseFloat(billForm.unitPrice) || 0;
    const taxRate = parseFloat(billForm.taxRate) || 0;

    const total = qty * unitPrice;
    const preTax = total / (1 + taxRate / 100);
    const tax = total - preTax;

    setBillForm(prev => ({
        ...prev,
        totalAmount: total.toFixed(2),
        preTaxAmount: preTax.toFixed(2),
        taxAmount: tax.toFixed(2)
    }));
  }, [billForm.quantity, billForm.unitPrice, billForm.taxRate]);

  const handleOpenAddBill = () => {
      setBillToEditId(null);
      setBillForm(emptyBillForm);
      setIsAddAddBillOpen(true);
  };

  const handleOpenEditBill = (bill: PayableBill) => {
      setBillToEditId(bill.id);
      setBillForm({
          vendor: bill.vendor,
          invoiceNumber: bill.invoiceNumber || '',
          dueDate: bill.dueDate,
          quantity: String(bill.quantity || '1'),
          unitPrice: String(bill.unitPrice || bill.totalAmount),
          totalAmount: String(bill.totalAmount),
          taxRate: String(bill.taxRate || ''),
          preTaxAmount: String(bill.preTaxAmount || ''),
          taxAmount: String(bill.taxAmount || ''),
          category: bill.category,
          description: bill.description || '',
          documentUrl: bill.documentUrl || '',
      });
      setIsAddAddBillOpen(true);
  };

  const handleSaveBill = () => {
    if (!user || !billForm.vendor || !billForm.totalAmount || !billForm.category) {
        toast({ variant: 'destructive', title: 'Missing Info', description: 'Please provide supplier, amount, and category.' });
        return;
    }

    const payload = {
        ...billForm,
        quantity: parseFloat(billForm.quantity) || 1,
        unitPrice: parseFloat(billForm.unitPrice) || parseFloat(billForm.totalAmount),
        totalAmount: parseFloat(billForm.totalAmount),
        preTaxAmount: parseFloat(billForm.preTaxAmount),
        taxAmount: parseFloat(billForm.taxAmount),
        taxRate: parseFloat(billForm.taxRate) || 0,
        userId: user.uid,
    };

    if (billToEditId) {
        updatePayableBill(billToEditId, payload);
        toast({ title: 'Bill Updated' });
    } else {
        addPayableBill(payload);
        toast({ title: 'Bill Logged', description: 'Added to your Accounts Payable.' });
    }
    
    setIsAddAddBillOpen(false);
    setBillForm(emptyBillForm);
    setBillToEditId(null);
    setTimeout(loadData, 500);
  };

  const handlePostPayment = () => {
    if (!user || !billToPay) return;
    postBillPayment(user.uid, billToPay.id, paymentDate, paymentMethod);
    setBillToPay(null);
    toast({ title: 'Payment Initiated', description: 'The payment record is being processed.' });
    setTimeout(loadData, 500);
  };

  const handleConfirmDelete = () => {
      if (!billToDelete) return;
      deletePayableBill(billToDelete.id);
      setBillToDelete(null);
      setTimeout(loadData, 500);
  };

  const handleSupplierSave = (savedContact: Contact) => {
      loadData();
      setBillForm(prev => ({ ...prev, vendor: savedContact.businessName || savedContact.name }));
      setIsContactFormOpen(false);
      setIsVendorPopoverOpen(false);
  };

  const totalPayable = useMemo(() => {
      return bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  }, [bills]);

  const suppliersFolder = contactFolders.find(f => f.name === 'Suppliers' && f.isSystem);

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
                <Button onClick={handleOpenAddBill}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Log Invoice
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
                                <TableHead>Supplier</TableHead>
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
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => handleOpenEditBill(bill)}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onSelect={() => setBillToDelete(bill)} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Bill
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
            <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{billToEditId ? 'Edit Outstanding Bill' : 'Log Outstanding Bill'}</DialogTitle>
                    <DialogDescription>Add a Supplier</DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 min-h-0">
                    <div className="py-4 space-y-4 px-6">
                        <div className="space-y-2">
                            <Label>Supplier *</Label>
                            <div className="flex gap-2">
                                <Popover open={isVendorPopoverOpen} onOpenChange={setIsVendorPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between overflow-hidden">
                                            <span className="truncate">{billForm.vendor || "Select a supplier..."}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0"/>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search suppliers..." onValueChange={(val) => setBillForm(p => ({...p, vendor: val}))} />
                                            <CommandList>
                                                <CommandEmpty>No supplier found.</CommandEmpty>
                                                <CommandGroup>
                                                    {companies.map(c => (
                                                        <CommandItem key={c.id} value={c.name} onSelect={() => { setBillForm(p => ({...p, vendor: c.name})); setIsVendorPopoverOpen(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", billForm.vendor === c.name ? "opacity-100" : "opacity-0")} /> {c.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Button variant="outline" size="icon" onClick={() => setIsContactFormOpen(true)} title="Add New Supplier Record">
                                    <UserPlus className="h-4 w-4" />
                                </Button>
                            </div>
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

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Quantity</Label>
                                <Input type="number" value={billForm.quantity} onChange={e => setBillForm(p => ({...p, quantity: e.target.value}))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Unit Price</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input type="number" step="0.01" value={billForm.unitPrice} onChange={e => setBillForm(p => ({...p, unitPrice: e.target.value}))} className="pl-7" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Total Amount *</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input value={billForm.totalAmount} readOnly disabled className="pl-7 bg-muted/50 font-bold" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Tax Rate (%)</Label>
                                <div className="relative">
                                    <Input type="number" step="0.1" value={billForm.taxRate} onChange={e => setBillForm(p => ({...p, taxRate: e.target.value}))} className="pr-8" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Pre-Tax Amount</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input value={billForm.preTaxAmount} readOnly disabled className="pl-7 bg-muted/50" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Tax Amount</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input value={billForm.taxAmount} readOnly disabled className="pl-7 bg-muted/50" />
                                </div>
                            </div>
                        </div>

                        <Separator />

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
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={billForm.description} onChange={e => setBillForm(p => ({...p, description: e.target.value}))} placeholder="Brief description of the bill..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Document Link</Label>
                            <Input value={billForm.documentUrl} onChange={e => setBillForm(p => ({...p, documentUrl: e.target.value}))} placeholder="https://..." />
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 border-t shrink-0">
                    <Button variant="ghost" onClick={() => setIsAddAddBillOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveBill} disabled={isSaving}>
                        {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/>}
                        {billToEditId ? 'Save Changes' : 'Save Bill'}
                    </Button>
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

        <AlertDialog open={!!billToDelete} onOpenChange={() => setBillToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the outstanding bill from {billToDelete?.vendor} for {billToDelete ? formatCurrency(billToDelete.totalAmount) : ''}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete Bill</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <ContactFormDialog
            isOpen={isContactFormOpen}
            onOpenChange={setIsContactFormOpen}
            contactToEdit={null}
            folders={contactFolders}
            onFoldersChange={setContactFolders}
            onSave={handleSupplierSave}
            companies={companies}
            onCompaniesChange={setCompanies}
            customIndustries={customIndustries}
            onCustomIndustriesChange={setCustomIndustries}
            forceFolderId={suppliersFolder?.id}
        />
    </div>
  );
}
