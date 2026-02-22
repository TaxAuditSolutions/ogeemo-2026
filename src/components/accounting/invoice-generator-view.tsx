
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
import { Plus, Trash2, Save, Eye, ChevronsUpDown, Check, LoaderCircle, X, Calendar as CalendarIcon, MoreVertical, Edit, Info, FileDown, Clock, UserPlus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { InvoicePageHeader } from '@/components/accounting/invoice-page-header';
import { useAuth } from '@/context/auth-context';
import { getInvoiceById, getLineItemsForInvoice, getServiceItems, type ServiceItem, addInvoiceWithLineItems, updateInvoiceWithLineItems, addServiceItem, getTaxTypes, type TaxType, type Invoice, type InvoiceLineItem } from '@/services/accounting-service';
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


interface LocalLineItem {
  id: string;
  description: string;
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
const INVOICE_PREVIEW_KEY = 'invoicePreviewData';


export function InvoiceGeneratorView() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [invoiceToEditId, setInvoiceToEditId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
  const [businessNumber, setBusinessNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 14));
  const [paymentTermsDays, setPaymentTermsDays] = setPaymentTermsDays('14');
  const [notes, setNotes] = useState("Thank you for your business!");

  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LocalLineItem[]>([]);
  
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [isSupplierPopoverOpen, setIsSupplierPopoverOpen] = useState(false);
  const [isAddLineItemDialogOpen, setIsAddLineItemDialogOpen] = useState(false);
  const [isTimeLogDialogOpen, setIsTimeLogDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<LocalLineItem | null>(null);
  
  
  const loadInvoiceForEditing = useCallback(async (invoiceId: string) => {
      setIsLoading(true);
      try {
          const [invoiceData, lineItemsData] = await Promise.all([
              getInvoiceById(invoiceId),
              getLineItemsForInvoice(invoiceId),
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
  }, [toast]);


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
          fetchedFolders,
          fetchedTaxTypes,
          profile,
          fetchedIndustries
        ] = await Promise.all([
          getCompanies(user.uid),
          getContacts(user.uid),
          getServiceItems(user.uid),
          getContactFolders(user.uid),
          getTaxTypes(user.uid),
          getUserProfile(user.uid),
          getIndustries(user.uid),
        ]);

        setCompanies(fetchedCompanies);
        setContacts(fetchedContacts);
        setServiceItems(fetchedServiceItems);
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
        } else {
          setSelectedContactId(null);
        }
        
        setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);

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
    
    const itemsToSave = lineItems.map(({id, ...rest}) => rest);

    try {
        if (invoiceToEditId) {
            await updateInvoiceWithLineItems(invoiceToEditId, invoiceData, itemsToSave, user.uid);
            toast({ title: 'Invoice Updated', description: `Invoice ${invoiceNumber} has been saved.` });
        } else {
            const newInvoice = await addInvoiceWithLineItems(invoiceData, itemsToSave);
            setInvoiceToEditId(newInvoice.id);
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
    toast({ title: "Form Cleared" });
  };
  
  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
    if (isEditing) {
        setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
    } else {
        setContacts(prev => [...prev, savedContact]);
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
  
  const handlePreview = () => {
      const selectedContact = contacts.find(c => c.id === selectedContactId);
      if (!selectedContact) {
          toast({ variant: 'destructive', title: 'Contact not selected', description: 'Please select a contact before previewing.'});
          return;
      }

      const companyName = selectedContact.businessName || selectedContact.name;

      const previewData = {
          invoiceNumber,
          businessNumber,
          companyName: companyName,
          contactAddress: {
            street: selectedContact.streetAddress,
            city: selectedContact.city,
            provinceState: selectedContact.provinceState,
            postalCode: selectedContact.postalCode,
            country: selectedContact.country,
          },
          invoiceDate: invoiceDate.toISOString(),
          dueDate: dueDate.toISOString(),
          lineItems,
          notes,
          userProfile: userProfile || undefined,
      };

      try {
          sessionStorage.setItem(INVOICE_PREVIEW_KEY, JSON.stringify(previewData));
          window.open('/accounting/invoices/preview?action=print', '_blank');
      } catch (error) {
          toast({ variant: 'destructive', title: 'Preview Error', description: 'Could not generate the preview.' });
      }
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const selectedSupplier = contacts.find(c => c.id === selectedSupplierId);

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <InvoicePageHeader pageTitle="Create Invoice" />
        <header className="relative text-center">
          <h1 className="text-3xl font-bold font-headline text-primary">Create an Invoice</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Select a contact from your master list to generate a professional invoice.
          </p>
          <div className="absolute top-0 right-0">
            <Button asChild variant="ghost" size="icon">
                <a onClick={() => router.back()} className="cursor-pointer">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                </a>
            </Button>
          </div>
        </header>

        <Card>
            <CardHeader className="flex-row justify-between items-center">
                <CardTitle>Invoice Header</CardTitle>
                <div className="flex items-center gap-2">
                    <Button onClick={handleSaveInvoice} disabled={isSaving}>
                        {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Invoice
                    </Button>
                    <Button variant="outline" onClick={handlePreview}><Eye className="mr-2 h-4 w-4" /> Preview</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                             <Label>Billing Contact (Client)</Label>
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
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
                             <Label>Supplier</Label>
                             <div className="flex gap-2">
                                <Popover open={isSupplierPopoverOpen} onOpenChange={setIsSupplierPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between overflow-hidden">
                                            {selectedSupplier ? (
                                                <span className="truncate">{selectedSupplier.name} {selectedSupplier.businessName ? `(${selectedSupplier.businessName})` : ''}</span>
                                            ) : "Select supplier..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search suppliers..." />
                                            <CommandList>
                                                <CommandEmpty>No supplier found.</CommandEmpty>
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
                                <Button variant="outline" size="icon" onClick={handleOpenNewContactDialog} title="Create New Supplier">
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
                                            <TableCell className="font-medium">{item.description}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(item.price)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(item.quantity * item.price)}</TableCell>
                                            <TableCell>
                                                <div className="flex justify-end">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenAddItemDialog(item)}><Edit className="h-4 w-4"/></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-4 w-4"/></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                         <div className="space-y-2">
                             <div className="flex items-center gap-2">
                                <Label htmlFor="notes">Notes / Terms</Label>
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
                            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4}/>
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
                 <Button variant="outline" size="sm" onClick={handlePreview}><FileDown className="mr-2 h-4 w-4" /> Download PDF</Button>
            </CardFooter>
        </Card>
      </div>
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
