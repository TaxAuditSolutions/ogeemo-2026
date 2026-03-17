'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { format, addDays } from 'date-fns';
import { Plus, Trash2, Save, Eye, ChevronsUpDown, Check, LoaderCircle, X, Calendar as CalendarIcon, MoreVertical, Edit, Info, Printer, Clock, UserPlus, ClipboardList } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { InvoicePageHeader } from '@/components/accounting/invoice-page-header';
import { useAuth } from '@/context/auth-context';
import { getInvoiceById, getLineItemsForInvoice, getServiceItems, type ServiceItem, addInvoiceWithLineItems, updateInvoiceWithLineItems, addServiceItem, getTaxTypes, type TaxType, type Invoice, type InvoiceLineItem, getIncomeCategories, type IncomeCategory, getExpenseCategories, type ExpenseCategory } from '@/services/accounting-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { cn } from '@/lib/utils';
import ContactFormDialog from '../contacts/contact-form-dialog';
import { getCompanies, type Company } from '@/services/accounting-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { AddLineItemDialog } from './add-line-item-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { getUserProfile } from '@/services/user-profile-service';
import type { UserProfile } from '@/services/user-profile-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { TimeLogImportDialog } from './time-log-import-dialog'; 
import { Event as TaskEvent } from '@/types/calendar-types';
import { Logo } from '@/components/logo';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface LocalLineItem {
  id: string;
  description: string;
  internalNotes?: string;
  categoryNumber?: string;
  quantity: number;
  price: number;
  taxType?: string;
  taxRate?: number;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const EDIT_INVOICE_ID_KEY = 'editInvoiceId';

const InvoiceDocument = ({ 
    invoiceNumber, 
    businessNumber, 
    selectedContact, 
    invoiceDate, 
    dueDate, 
    lineItems, 
    notes, 
    userProfile,
    subtotal,
    tax,
    total,
    attachReport
}: any) => (
    <div className="p-12 bg-white text-black min-h-[11in] w-full max-w-[8.5in] mx-auto shadow-sm">
        <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900">
            <Logo className="text-primary"/>
            <div className="text-right">
                <h1 className="text-4xl font-bold uppercase text-gray-700">Invoice</h1>
                <p className="text-gray-500">#{invoiceNumber}</p>
                {businessNumber && <p className="text-sm text-gray-500 mt-1">BN: {businessNumber}</p>}
            </div>
        </header>
        <section className="flex justify-between mt-8">
            <div>
                <h2 className="font-bold text-gray-500 uppercase mb-2 text-xs tracking-widest">Bill To</h2>
                <p className="font-bold text-lg">{selectedContact?.businessName || selectedContact?.name || 'N/A'}</p>
                {selectedContact && (
                    <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                        {selectedContact.streetAddress ? `${selectedContact.streetAddress}\n` : ''}
                        {[selectedContact.city, selectedContact.provinceState, selectedContact.postalCode].filter(Boolean).join(', ')}
                        {selectedContact.country ? `\n${selectedContact.country}` : ''}
                    </p>
                )}
            </div>
            <div className="text-right space-y-1">
                <p className="text-sm"><span className="font-bold text-gray-500 uppercase text-xs mr-2">Invoice Date:</span> {format(invoiceDate, 'PP')}</p>
                <p className="text-sm"><span className="font-bold text-gray-500 uppercase text-xs mr-2">Due Date:</span> {format(dueDate, 'PP')}</p>
            </div>
        </section>
        <section className="mt-12">
            <Table className="border-t border-b border-gray-900">
                <TableHeader>
                    <TableRow className="border-b-2 border-gray-900 bg-gray-50">
                        <TableHead className="text-black font-bold uppercase text-xs">Description</TableHead>
                        <TableHead className="text-center text-black font-bold uppercase text-xs">Qty</TableHead>
                        <TableHead className="text-right text-black font-bold uppercase text-xs">Unit Price</TableHead>
                        <TableHead className="text-right text-black font-bold uppercase text-xs">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {lineItems.length > 0 ? lineItems.map((item: any) => (
                        <TableRow key={item.id} className="border-b border-gray-200">
                            <TableCell className="py-4 text-sm font-medium">{item.description}</TableCell>
                            <TableCell className="text-center py-4 text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right font-mono py-4 text-sm">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right font-mono py-4 text-sm font-bold">{formatCurrency(item.price * item.quantity)}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center text-gray-400 italic">No items listed.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </section>
        <section className="flex justify-end mt-10">
            <div className="w-full max-w-sm space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-500 uppercase text-xs font-bold">Subtotal</span><span className="font-mono">{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500 uppercase text-xs font-bold">Tax Total</span><span className="font-mono">{formatCurrency(tax)}</span></div>
                <Separator className="bg-gray-900 h-0.5" />
                <div className="flex justify-between font-bold text-xl py-2">
                    <span className="uppercase text-xs self-center">Total Amount Due</span>
                    <span className="font-mono">{formatCurrency(total)}</span>
                </div>
            </div>
        </section>
        <section className="mt-16 pt-8 border-t border-dashed border-gray-300">
            <h4 className="font-bold text-gray-500 uppercase mb-2 text-xs tracking-widest">Additional Terms & Explanation</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed italic">{notes}</p>
            {attachReport && (
                <div className="mt-4 p-3 border rounded bg-muted/10 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Supporting Evidence Attached</span>
                    <ClipboardList className="h-4 w-4 text-primary" />
                </div>
            )}
        </section>
        <footer className="mt-auto pt-12 text-center">
            <p className="text-sm font-bold text-gray-800">{userProfile?.companyName || userProfile?.displayName || 'Ogeemo User'}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Generated by Ogeemo Orchestration Engine</p>
        </footer>
    </div>
);

export function InvoiceGeneratorView() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handlePrint, contentRef } = useReactToPrint();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [invoiceToEditId, setInvoiceToEditId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [businessNumber, setBusinessNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 14));
  const [paymentTermsDays, setPaymentTermsDays] = useState('14');
  const [notes, setNotes] = useState("Thank you for your business!");
  const [attachReport, setAttachReport] = useState(false);

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LocalLineItem[]>([]);
  
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [isSupplierPopoverOpen, setIsSupplierPopoverOpen] = useState(false);
  const [isAddLineItemDialogOpen, setIsAddLineItemDialogOpen] = useState(false);
  const [isTimeLogDialogOpen, setIsTimeLogDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<LocalLineItem | null>(null);
  
  const loadInvoiceForEditing = useCallback(async (invoiceId: string) => {
      if (!user) return;
      setIsLoading(true);
      try {
          const [invoiceData, lineItemsData] = await Promise.all([
              getInvoiceById(invoiceId),
              getLineItemsForInvoice(user.uid, invoiceId),
          ]);
          
          if (!invoiceData) {
              toast({ variant: 'destructive', title: 'Error', description: 'Could not find the invoice to edit.' });
              localStorage.removeItem(EDIT_INVOICE_ID_KEY);
              return;
          }

          setInvoiceNumber(invoiceData.invoiceNumber);
          setBusinessNumber(invoiceData.businessNumber || '');
          setInvoiceDate(new Date(invoiceData.invoiceDate));
          setDueDate(new Date(invoiceData.dueDate));
          setNotes(invoiceData.notes);
          setSelectedContactId(invoiceData.contactId);
          setSelectedSupplierId(invoiceData.supplierId || null);
          
          const mappedLineItems = lineItemsData.map(item => ({
              id: item.id || `item_${Math.random()}`,
              description: item.description,
              internalNotes: item.internalNotes || '',
              categoryNumber: item.categoryNumber || '',
              quantity: item.quantity,
              price: item.price,
              taxType: item.taxType,
              taxRate: item.taxRate,
          }));
          setLineItems(mappedLineItems);
          
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Failed to load invoice', description: error.message });
      } finally {
          setIsLoading(false);
      }
  }, [user, toast]);


  useEffect(() => {
    async function initializeView() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [
          fetchedCompanies,
          fetchedContacts,
          fetchedServiceItems,
          fetchedExpenseCategories,
          fetchedFolders,
          fetchedTaxTypes,
          profile,
          fetchedIndustries
        ] = await Promise.all([
          getCompanies(user.uid),
          getContacts(),
          getServiceItems(user.uid),
          getExpenseCategories(user.uid),
          getContactFolders(user.uid),
          getTaxTypes(user.uid),
          getUserProfile(user.uid),
          getIndustries(user.uid),
        ]);

        setCompanies(fetchedCompanies);
        setContacts(fetchedContacts);
        setServiceItems(fetchedServiceItems);
        setExpenseCategories(fetchedExpenseCategories);
        setContactFolders(fetchedFolders);
        setTaxTypes(fetchedTaxTypes);
        setUserProfile(profile);
        setCustomIndustries(fetchedIndustries);

        const invoiceId = localStorage.getItem(EDIT_INVOICE_ID_KEY);
        if (invoiceId) {
          setInvoiceToEditId(invoiceId);
          await loadInvoiceForEditing(invoiceId);
          return;
        }

        const contactIdParam = searchParams.get('contactId');
        if (contactIdParam) {
          setSelectedContactId(contactIdParam);
        }
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
      } finally {
        setIsLoading(false);
      }
    }
    initializeView();
  }, [user, toast, loadInvoiceForEditing, searchParams]);

  useEffect(() => {
    const contact = contacts.find(c => c.id === selectedContactId);
    if (contact) {
        setBusinessNumber(contact.craProgramAccountNumber || userProfile?.businessNumber || '');
    } else {
        setBusinessNumber(userProfile?.businessNumber || '');
    }
  }, [selectedContactId, contacts, userProfile]);
  
  const handleOpenAddItemDialog = (item: LocalLineItem | null) => {
    setItemToEdit(item);
    setIsAddLineItemDialogOpen(true);
  };
  
  const handleDeleteItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };
  
  const handleSaveLineItem = (newItem: LocalLineItem) => {
    if (itemToEdit) {
      setLineItems(prev => prev.map(item => item.id === itemToEdit.id ? { ...newItem, id: itemToEdit.id } : item));
      setItemToEdit(null);
    } else {
      setLineItems(prev => [...prev, newItem]);
    }
  };

  const handleAddTimeLogEntries = (entries: TaskEvent[]) => {
      const newItems: LocalLineItem[] = entries.map((entry, index) => {
          const hours = (entry.duration || 0) / 3600;
          return {
              id: `time_${Date.now()}_${index}`,
              description: `${entry.title} - ${entry.start ? format(new Date(entry.start), 'PPP') : 'N/A'}`,
              internalNotes: entry.description || '',
              categoryNumber: '', 
              quantity: parseFloat(hours.toFixed(2)),
              price: entry.billableRate || 0,
          };
      });
      setLineItems(prev => [...prev, ...newItems]);
      toast({ title: `${newItems.length} time entries added to invoice.` });
  };
  
  const handleSaveRepeatableItem = async (item: Omit<ServiceItem, 'id' | 'userId'>) => {
    if (!user) return;
    try {
        const newServiceItem = await addServiceItem({ ...item, userId: user.uid });
        setServiceItems(prev => [newServiceItem, ...prev]);
        toast({ title: "Repeatable Item Saved" });
    } catch(error: any) {
        toast({ variant: "destructive", title: "Failed to save item", description: error.message });
    }
  };
  
  const { subtotal, tax, total } = useMemo(() => {
    const sub = lineItems.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const taxAmount = lineItems.reduce((acc, item) => {
        const itemTotal = item.quantity * item.price;
        const itemTax = itemTotal * ((item.taxRate || 0) / 100);
        return acc + itemTax;
    }, 0);
    return { subtotal: sub, tax: taxAmount, total: sub + taxAmount };
  }, [lineItems]);
  
  const handleSaveInvoice = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to save.'});
        return;
    }
    if (!selectedContactId) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a contact.'});
        return;
    }

    setIsSaving(true);
    
    const selectedContact = contacts.find(c => c.id === selectedContactId);
    const companyName = selectedContact?.businessName || selectedContact?.name || 'N/A';
    
    const invoiceData = {
        invoiceNumber,
        businessNumber,
        companyName,
        contactId: selectedContactId,
        supplierId: selectedSupplierId,
        originalAmount: total,
        amountPaid: invoiceToEditId ? (await getInvoiceById(invoiceToEditId))?.amountPaid || 0 : 0,
        dueDate: dueDate,
        invoiceDate: invoiceDate,
        status: 'outstanding' as const,
        notes,
        taxType: 'gst_hst',
        userId: user.uid,
    };
    
    const itemsToSave = lineItems.map(({id, ...rest}) => ({ ...rest, userId: user.uid }));

    try {
        if (invoiceToEditId) {
            await updateInvoiceWithLineItems(invoiceToEditId, invoiceData, itemsToSave, user.uid);
            toast({ title: 'Invoice Updated', description: `Invoice ${invoiceNumber} has been saved.` });
        } else {
            await addInvoiceWithLineItems(invoiceData, itemsToSave);
            toast({ title: 'Invoice Saved', description: `Invoice ${invoiceNumber} has been created.` });
        }
        localStorage.removeItem(EDIT_INVOICE_ID_KEY);
        router.push('/accounting/accounts-receivable');

    } catch (error: any) {
        console.error("Save Invoice Error:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  const handleClearInvoice = () => {
    localStorage.removeItem(EDIT_INVOICE_ID_KEY);
    setInvoiceToEditId(null);
    setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
    setBusinessNumber('');
    setInvoiceDate(new Date());
    setDueDate(addDays(new Date(), 14));
    setPaymentTermsDays('14');
    setNotes("Thank you for your business!");
    setSelectedContactId(null);
    setSelectedSupplierId(null);
    setLineItems([]);
    setAttachReport(false);
    toast({ title: "Form Cleared" });
  };
  
  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
    if (isEditing) {
        setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
    } else {
        setContacts(prev => [savedContact, ...prev]);
    }
    setSelectedContactId(savedContact.id);
    setIsContactFormOpen(false);
  };
  
  const handleOpenNewContactDialog = () => {
    setIsContactFormOpen(true);
  };
  
  const handlePaymentTermsChange = (value: string) => {
      setPaymentTermsDays(value);
      if (!invoiceDate) return;
      const days = parseInt(value, 10);
      if (!isNaN(days)) {
          setDueDate(addDays(invoiceDate, days));
      }
  };
  
  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const selectedSupplier = contacts.find(c => c.id === selectedSupplierId);

  const documentProps = {
      invoiceNumber,
      businessNumber,
      selectedContact,
      invoiceDate,
      dueDate,
      lineItems,
      notes,
      userProfile,
      subtotal,
      tax,
      total,
      attachReport
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6 text-black bg-background min-h-screen">
        <InvoicePageHeader pageTitle="Create Invoice" />
        <header className="relative text-center print:hidden">
          <h1 className="text-3xl font-bold font-headline text-primary">Create an Invoice</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Select contacts from your master list to generate a professional invoice.
          </p>
          <div className="absolute top-0 right-0">
            <Button asChild variant="ghost" size="icon" onClick={() => router.back()}>
                <a className="cursor-pointer">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                </a>
            </Button>
          </div>
        </header>

        <Card className="print:hidden shadow-lg border-primary/10">
            <CardHeader className="flex-row justify-between items-center bg-primary/5 border-b">
                <CardTitle>Invoice Header</CardTitle>
                <div className="flex items-center gap-2">
                    <Button onClick={handleSaveInvoice} disabled={isSaving} className="font-bold">
                        {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Invoice
                    </Button>
                    <Button variant="outline" onClick={() => setIsPreviewDialogOpen(true)}><Eye className="mr-2 h-4 w-4" /> Preview</Button>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                             <Label>Billing To (Contact)</Label>
                             <div className="flex gap-2">
                                <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between overflow-hidden">
                                            {selectedContact ? (
                                                <span className="truncate">{selectedContact.name} {selectedContact.businessName ? `(${selectedContact.businessName})` : ''}</span>
                                            ) : "Select contact..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search contacts..." />
                                            <CommandList>
                                                <CommandEmpty>No contact found.</CommandEmpty>
                                                <CommandGroup>
                                                    {contacts.map(c => (
                                                        <CommandItem
                                                            key={c.id}
                                                            value={c.name}
                                                            onSelect={() => {
                                                                setSelectedContactId(c.id);
                                                                setIsContactPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", selectedContactId === c.id ? "opacity-100" : "opacity-0")} />
                                                            {c.name} {c.businessName ? `(${c.businessName})` : ''}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Button variant="outline" size="icon" onClick={handleOpenNewContactDialog} title="Create New Contact">
                                    <UserPlus className="h-4 w-4" />
                                </Button>
                             </div>
                        </div>
                        <div className="space-y-2">
                             <Label>Billing From (Contact)</Label>
                             <div className="flex gap-2">
                                <Popover open={isSupplierPopoverOpen} onOpenChange={setIsSupplierPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between overflow-hidden">
                                            {selectedSupplier ? (
                                                <span className="truncate">{selectedSupplier.name} {selectedSupplier.businessName ? `(${selectedSupplier.businessName})` : ''}</span>
                                            ) : "Select contact..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search contacts..." />
                                            <CommandList>
                                                <CommandEmpty>No contact found.</CommandEmpty>
                                                <CommandGroup>
                                                    {contacts.map(c => (
                                                        <CommandItem
                                                            key={c.id}
                                                            value={c.name}
                                                            onSelect={() => {
                                                                setSelectedSupplierId(c.id);
                                                                setIsSupplierPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", selectedSupplierId === c.id ? "opacity-100" : "opacity-0")} />
                                                            {c.name} {c.businessName ? `(${c.businessName})` : ''}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Button variant="outline" size="icon" onClick={handleOpenNewContactDialog} title="Create New Contact">
                                    <UserPlus className="h-4 w-4" />
                                </Button>
                             </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="invoiceNumber">Invoice #</Label>
                                <Input id="invoiceNumber" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="businessNumber">Business Number (BN)</Label>
                                <Input id="businessNumber" value={businessNumber} onChange={e => setBusinessNumber(e.target.value)} />
                            </div>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="invoiceDate">Invoice Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !invoiceDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {invoiceDate ? format(invoiceDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <CustomCalendar mode="single" selected={invoiceDate} onSelect={(date) => date && setInvoiceDate(date)} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>Payment Terms</Label>
                            <Select onValueChange={handlePaymentTermsChange} defaultValue={paymentTermsDays}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Set due date..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Due on receipt</SelectItem>
                                    <SelectItem value="14">Net 14</SelectItem>
                                    <SelectItem value="30">Net 30</SelectItem>
                                    <SelectItem value="60">Net 60</SelectItem>
                                    <SelectItem value="90">Net 90</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="dueDate">Due Date</Label>
                            <Input id="dueDate" value={format(dueDate, 'PPP')} readOnly disabled />
                        </div>
                    </div>
                     <div>
                        <Label>Line Items</Label>
                        <div className="border rounded-md mt-2">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-2/5">Description</TableHead>
                                        <TableHead className="text-center">Quantity</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lineItems.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{item.description}</span>
                                                    {item.categoryNumber && (
                                                        <Badge variant="outline" className="w-fit text-[10px] h-4 mt-1">
                                                            {expenseCategories.find(c => (c.categoryNumber || c.id) === item.categoryNumber)?.name || item.categoryNumber}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(item.price)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(item.quantity * item.price)}</TableCell>
                                            <TableCell>
                                                <div className="flex justify-end">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenAddItemDialog(item)}><Edit className="h-4 w-4"/></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="mr-2 h-4 w-4"/></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {lineItems.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">No items added to this invoice yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-4 flex gap-2">
                           <Button variant="secondary" onClick={() => handleOpenAddItemDialog(null)}>
                                <Plus className="mr-2 h-4 w-4" /> Add Line Item
                            </Button>
                            <Button variant="secondary" onClick={() => setIsTimeLogDialogOpen(true)} disabled={!selectedContactId}>
                                <Clock className="mr-2 h-4 w-4" /> Add from Time Log
                            </Button>
                        </div>
                    </div>

                    <div className="p-4 border-2 border-dashed rounded-xl bg-primary/5 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" /> Evidence Orchestration
                        </h4>
                        <div className="flex items-center gap-6">
                            <Label className="font-semibold">Attach Work Activity Evidence Report?</Label>
                            <RadioGroup value={attachReport ? 'yes' : 'no'} onValueChange={v => setAttachReport(v === 'yes')} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="rep-yes" />
                                    <Label htmlFor="rep-yes">Yes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="rep-no" />
                                    <Label htmlFor="rep-no">No</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">
                            This will include a high-fidelity summary of all billable sessions and tasks linked to this client for the invoice period.
                        </p>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                         <div className="space-y-2">
                             <div className="flex items-center gap-2">
                                <Label htmlFor="notes">Terms & Explanation</Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent side="top" align="start">
                                            <p className="max-w-xs text-xs">
                                                Interest on overdue accounts will be charged at 1% for 30 days, 2% for 60 days, 3% for 90 days, and 5% thereafter, calculated monthly not in advance.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Add additional terms or explanation..."/>
                         </div>
                         <div className="space-y-2 border rounded-lg p-4 bg-muted/50 h-fit self-end">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span className="font-mono">{formatCurrency(subtotal)}</span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tax:</span>
                                <span className="font-mono">{formatCurrency(tax)}</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total Due:</span>
                                <span className="font-mono text-primary">{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-between border-t p-4">
                 <Button variant="ghost" size="sm" onClick={handleClearInvoice}><X className="mr-2 h-4 w-4" /> Clear Form</Button>
                 <Button onClick={() => handlePrint()} className="font-bold shadow-lg">
                    <Printer className="mr-2 h-4 w-4" /> Print Invoice & Report
                 </Button>
            </CardFooter>
        </Card>

        <div className="hidden">
            <div ref={contentRef}>
                <InvoiceDocument {...documentProps} />
            </div>
        </div>
      </div>

      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-muted/30">
              <DialogHeader className="p-4 border-b bg-background shrink-0 text-black">
                  <div className="flex justify-between items-center">
                      <DialogTitle>High-Fidelity Preview</DialogTitle>
                      <div className="flex gap-2 mr-8">
                          <Button variant="outline" onClick={() => handlePrint()}>
                              <Printer className="mr-2 h-4 w-4" /> Print
                          </Button>
                          <Button variant="ghost" onClick={() => setIsPreviewDialogOpen(false)}>Close</Button>
                      </div>
                  </div>
              </DialogHeader>
              <ScrollArea className="flex-1 p-8">
                  <InvoiceDocument {...documentProps} />
              </ScrollArea>
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
      <AddLineItemDialog
        isOpen={isAddLineItemDialogOpen}
        onOpenChange={setIsAddLineItemDialogOpen}
        itemToEdit={itemToEdit}
        onSave={handleSaveLineItem}
        serviceItems={serviceItems}
        expenseCategories={expenseCategories}
        onSaveRepeatable={handleSaveRepeatableItem}
        taxTypes={taxTypes}
        onTaxTypesChange={setTaxTypes}
      />
      {selectedContactId && (
          <TimeLogImportDialog
              isOpen={isTimeLogDialogOpen}
              onOpenChange={setIsTimeLogDialogOpen}
              contactId={selectedContactId}
              onSave={handleAddTimeLogEntries}
          />
      )}
    </>
  );
}
