'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    PlusCircle, 
    X, 
    HandCoins, 
    ArrowRight, 
    Landmark, 
    CheckCircle, 
    Trash2, 
    LoaderCircle,
    Info,
    Calendar as CalendarIcon,
    ChevronsUpDown,
    Check,
    UserPlus,
    Plus
} from "lucide-react";
import { AccountingPageHeader } from './page-header';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { 
    getPettyCashTransactions, 
    addPettyCashTransaction, 
    deletePettyCashTransaction, 
    postPettyCashToGL,
    getIncomeCategories,
    getExpenseCategories,
    getCompanies,
    type PettyCashTransaction,
    type IncomeCategory,
    type ExpenseCategory,
    type Company
} from '@/services/accounting-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, ensureSystemFolders, type FolderData } from '@/services/contact-folder-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { CustomCalendar } from '../ui/custom-calendar';
import ContactFormDialog from '../contacts/contact-form-dialog';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const emptyTxForm = {
    date: '',
    description: '',
    amount: '',
    contact: '',
    category: '',
};

export function CashAccountingView() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState<'in' | 'out'>('out');
    const [formData, setFormData] = useState(emptyTxForm);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
    const [contactSearchValue, setContactSearchValue] = useState('');
    const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isContactFormOpen, setIsContactFormOpen] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Calling getContacts() without UID to pull ALL contacts from the Hub as requested.
            const [txs, inc, exp, conts, folds, comps, inds] = await Promise.all([
                getPettyCashTransactions(user.uid),
                getIncomeCategories(user.uid),
                getExpenseCategories(user.uid),
                getContacts(), 
                getContactFolders(user.uid),
                getCompanies(user.uid),
                getIndustries(user.uid)
            ]);
            setTransactions(txs);
            setIncomeCategories(inc);
            setExpenseCategories(exp);
            setContacts(conts);
            setContactFolders(folds);
            setCompanies(comps);
            setCustomIndustries(inds);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Load Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const activeCategories = dialogType === 'in' ? incomeCategories : expenseCategories;

    const floatValue = useMemo(() => {
        return transactions.reduce((sum, tx) => {
            return tx.type === 'in' ? sum + tx.amount : sum - tx.amount;
        }, 0);
    }, [transactions]);

    const handleOpenDialog = (type: 'in' | 'out') => {
        setDialogType(type);
        setFormData({ ...emptyTxForm, date: format(new Date(), 'yyyy-MM-dd') });
        setContactSearchValue('');
        setIsDialogOpen(true);
    };

    const handleSaveTransaction = async () => {
        if (!user) return;
        const amountNum = parseFloat(formData.amount);
        if (!formData.date || !formData.category || isNaN(amountNum) || amountNum <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill all required fields.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const newTx = await addPettyCashTransaction({
                date: formData.date,
                description: formData.description,
                amount: amountNum,
                type: dialogType,
                contact: formData.contact,
                category: formData.category,
                isPosted: false,
                userId: user.uid,
            });
            setTransactions(prev => [newTx, ...prev]);
            setIsDialogOpen(false);
            toast({ title: 'Transaction Recorded' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePostToGL = async (tx: PettyCashTransaction) => {
        if (!user) return;
        setIsLoading(true);
        try {
            await postPettyCashToGL(user.uid, tx.id);
            setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, isPosted: true } : t));
            toast({ title: 'Posted to GL', description: 'Transaction successfully synchronized with the General Ledger.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Posting Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deletePettyCashTransaction(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
            toast({ title: 'Record Removed' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        }
    };

    const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
        setContacts(prev => isEditing ? prev.map(c => c.id === savedContact.id ? savedContact : c) : [savedContact, ...prev]);
        setFormData(prev => ({ ...prev, contact: savedContact.name }));
        setIsContactFormOpen(false);
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center bg-muted/10 min-h-full text-black">
            <AccountingPageHeader pageTitle="Petty Cash" />
            
            <header className="text-center relative w-full max-w-4xl">
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                    <HandCoins className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Petty Cash Accounting</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-2">
                    The cash box is for small, immediate transactions outside of regular bank processing. 
                    Identify every dollar to maintain your <strong>Black Box of Evidence</strong>.
                </p>
                <div className="absolute top-0 right-0">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/accounting" aria-label="Close">
                            <X className="h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
                <Card className={cn("md:col-span-1 border-2", floatValue < 0 ? "border-destructive/20 bg-destructive/5" : "border-primary/20 bg-primary/5")}>
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Current Box Float</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className={cn("text-4xl font-bold font-mono", floatValue < 0 ? "text-destructive" : "text-primary")}>
                            {formatCurrency(floatValue)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 italic">Verify this amount against your physical cash box regularly.</p>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 flex flex-col justify-center p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <Info className="h-5 w-5 text-primary shrink-0" />
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Transactions here track the physical float. Use <strong>"Post to GL"</strong> to synchronize these records with your BKS General Ledger for formal reporting and tax compliance.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button className="flex-1 h-12 text-lg font-bold shadow-lg" onClick={() => handleOpenDialog('in')}>
                            <PlusCircle className="mr-2 h-5 w-5" /> Cash In (Revenue)
                        </Button>
                        <Button variant="outline" className="flex-1 h-12 text-lg font-bold border-primary text-primary hover:bg-primary/5" onClick={() => handleOpenDialog('out')}>
                            <PlusCircle className="mr-2 h-5 w-5" /> Cash Out (Expense)
                        </Button>
                    </div>
                </Card>
            </div>

            <Card className="w-full max-w-6xl shadow-xl">
                <CardHeader className="border-b bg-muted/30">
                    <CardTitle>Petty Cash Box Log</CardTitle>
                    <CardDescription>Records of cash flow through the physical box.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Counting the coins...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Contact / Vendor</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.length > 0 ? transactions.map(tx => (
                                    <TableRow key={tx.id} className={cn(tx.isPosted && "opacity-60")}>
                                        <TableCell className="text-xs font-medium">{tx.date}</TableCell>
                                        <TableCell className="font-bold">{tx.contact || 'Generic Cash Customer'}</TableCell>
                                        <TableCell className="text-[10px] uppercase font-bold text-muted-foreground">{tx.category}</TableCell>
                                        <TableCell className="text-xs">{tx.description}</TableCell>
                                        <TableCell className={cn("text-right font-mono font-bold", tx.type === 'in' ? "text-green-600" : "text-red-600")}>
                                            {tx.type === 'in' ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {tx.isPosted ? (
                                                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                                    <CheckCircle className="h-3 w-3 mr-1" /> Posted to GL
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">Pending GL</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {!tx.isPosted && (
                                                    <Button size="sm" variant="outline" className="h-8 border-primary text-primary font-bold text-[10px] uppercase hover:bg-primary/5" onClick={() => handlePostToGL(tx)}>
                                                        <Landmark className="mr-1.5 h-3.5 w-3.5" /> Post to GL
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(tx.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                                            No petty cash records found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/30 border-t py-2 justify-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Secure Cash Orchestration Node</p>
                </CardFooter>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-primary mb-1">
                            <HandCoins className="h-5 w-5" />
                            <DialogTitle>Add Cash {dialogType === 'in' ? 'In' : 'Out'}</DialogTitle>
                        </div>
                        <DialogDescription>Record a physical cash transaction for the petty cash box.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Date</Label>
                                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !formData.date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                            {formData.date ? format(parseISO(formData.date), 'PP') : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CustomCalendar mode="single" selected={formData.date ? parseISO(formData.date) : undefined} onSelect={(d) => { if(d) setFormData(p => ({...p, date: format(d, 'yyyy-MM-dd')})); setIsDatePickerOpen(false); }} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Amount ($)</Label>
                                <Input type="number" step="0.01" className="h-10 font-mono font-bold" placeholder="0.00" value={formData.amount} onChange={e => setFormData(p => ({...p, amount: e.target.value}))} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs uppercase font-bold text-muted-foreground">Contact / Entity</Label>
                            <div className="flex gap-2">
                                <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10">
                                            <span className="truncate">{formData.contact || "Select or search..."}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                            <CommandInput 
                                                placeholder="Search contacts..." 
                                                value={contactSearchValue}
                                                onValueChange={setContactSearchValue}
                                            />
                                            <CommandList>
                                                {isLoading ? (
                                                    <div className="flex justify-center p-4">
                                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <CommandEmpty>
                                                            <Button 
                                                                variant="ghost" 
                                                                className="w-full justify-start text-sm text-primary" 
                                                                onClick={() => { 
                                                                    setIsContactPopoverOpen(false); 
                                                                    setIsContactFormOpen(true); 
                                                                }}
                                                            >
                                                                <Plus className="mr-2 h-4 w-4" /> Add New Contact
                                                            </Button>
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {contacts.map(c => (
                                                                <CommandItem 
                                                                    key={c.id} 
                                                                    value={c.name}
                                                                    onSelect={() => { 
                                                                        setFormData(p => ({...p, contact: c.name})); 
                                                                        setIsContactPopoverOpen(false); 
                                                                        setContactSearchValue('');
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", formData.contact === c.name ? "opacity-100" : "opacity-0")} />
                                                                    {c.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setIsContactFormOpen(true)}>
                                    <UserPlus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs uppercase font-bold text-muted-foreground">CRA Tax Category</Label>
                            <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10">
                                        {formData.category ? (activeCategories.find(c => (c.categoryNumber || c.id) === formData.category)?.name || formData.category) : "Select category..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search categories..." />
                                        <CommandList>
                                            <CommandEmpty>No category found.</CommandEmpty>
                                            <CommandGroup>
                                                {activeCategories.map(cat => (
                                                    <CommandItem key={cat.id} onSelect={() => { setFormData(p => ({...p, category: cat.categoryNumber || cat.id})); setIsCategoryPopoverOpen(false); }}>
                                                        <Check className={cn("mr-2 h-4 w-4", formData.category === (cat.categoryNumber || cat.id) ? "opacity-100" : "opacity-0")} />
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Line {cat.categoryNumber}</span>
                                                            <span className="text-sm">{cat.name}</span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs uppercase font-bold text-muted-foreground">Description</Label>
                            <Input placeholder="What was this for?" value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} />
                        </div>
                    </div>
                    <DialogFooter className="bg-muted/10 -mx-6 -mb-6 p-6 rounded-b-lg">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleSaveTransaction} disabled={isSubmitting} className="font-bold">
                            {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Log Cash Transaction
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ContactFormDialog
                isOpen={isContactFormOpen}
                onOpenChange={setIsContactFormOpen}
                contactToEdit={null}
                folders={contactFolders}
                onFoldersChange={setContactFolders}
                onSave={handleContactSave}
                companies={companies}
                onCompaniesChange={setCompanies}
                customIndustries={customIndustries}
                onCustomIndustriesChange={setCustomIndustries}
            />
        </div>
    );
}
