'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
import { getInvoiceById, getLineItemsForInvoice, getServiceItems, type ServiceItem, addInvoiceWithLineItems, updateInvoiceWithLineItems, addServiceItem, updateServiceItem, getTaxTypes, type TaxType, type Invoice, type InvoiceLineItem, getIncomeCategories, type IncomeCategory } from '@/core/accounting-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { cn } from '@/lib/utils';
import ContactFormDialog from '../contacts/contact-form-dialog';
import { getCompanies, type Company } from '@/core/accounting-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { getUserProfile } from '@/core/user-profile-service';
import type { UserProfile } from '@/core/user-profile-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { TimeLogImportDialog } from './time-log-import-dialog';
import { Event as TaskEvent } from '@/types/calendar-types';
import { Logo } from '@/components/logo';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { AddLineItemDialog } from './add-line-item-dialog';

interface LocalLineItem {
    id: string;
    description: string;
    internalNotes?: string;
    categoryNumber?: string;
    quantity: number;
    price: number;
    taxType?: string;
    taxRate?: number;
    serviceItemId?: string;
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
    lineItemDetails,
    notes,
    userProfile,
    subtotal,
    tax,
    total,
    attachReport
}: any) => (
    <div className="p-12 bg-white text-black min-h-[11in] w-full max-w-[8.5in] mx-auto shadow-sm">
        <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900">
            <Logo className="text-primary" />
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
            {lineItemDetails && (
                <div className="mt-4 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed italic">
                    {lineItemDetails}
                </div>
            )}
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
            <h4 className="font-bold text-gray-500 uppercase mb-2 text-xs tracking-widest">Terms & Explanation</h4>
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
    const [lineItemDetails, setLineItemDetails] = useState('');
    const [attachReport, setAttachReport] = useState(false);

    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [lineItems, setLineItems] = useState<LocalLineItem[]>([]);
    const [invoiceTemplates, setInvoiceTemplates] = useState<any[]>([]);

    const [isContactFormOpen, setIsContactFormOpen] = useState(false);
    const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
    const [isSupplierPopoverOpen, setIsSupplierPopoverOpen] = useState(false);
    const [isTimeLogDialogOpen, setIsTimeLogDialogOpen] = useState(false);
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const [isAddLineItemDialogOpen, setIsAddLineItemDialogOpen] = useState(false);
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
            if (invoiceData.lineItemDetails) setLineItemDetails(invoiceData.lineItemDetails);
            setSelectedContactId(invoiceData.contactId);
            setSelectedSupplierId(invoiceData.supplierId || null);

            const mappedLineItems = lineItemsData.map((item: any) => ({
                id: item.id || `item_${Math.random()}`,
                description: item.description,
                internalNotes: item.internalNotes || '',
                categoryNumber: item.categoryNumber || '',
                quantity: item.quantity,
                price: item.price,
                taxType: item.taxType,
                taxRate: item.taxRate,
                serviceItemId: item.serviceItemId,
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
                    fetchedServiceItems,
                    fetchedTaxTypes,
                ] = await Promise.all([
                    getCompanies(user.uid),
                    getServiceItems(user.uid),
                    getTaxTypes(user.uid),
                ]);

                const fetchedContacts = await getContacts().catch(() => []);
                const fetchedFolders = await getContactFolders(user.uid).catch(() => []);
                const profile = await getUserProfile(user.uid).catch(() => null);
                const fetchedIndustries = await getIndustries(user.uid).catch(() => []);

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
                }

                const contactIdParam = searchParams.get('contactId');
                if (contactIdParam) {
                    setSelectedContactId(contactIdParam);
                }

                const rawTemplates = localStorage.getItem('invoiceTemplates');
                if (rawTemplates) {
                    setInvoiceTemplates(JSON.parse(rawTemplates));
                }

                const templateToEditRaw = localStorage.getItem('editInvoiceTemplate');
                if (templateToEditRaw) {
                    const template = JSON.parse(templateToEditRaw);
                    setLineItems(template.items.map((i: any) => ({ ...i, id: `item_${Math.random()}` })));
                    if (template.notes) setNotes(template.notes);
                    localStorage.removeItem('editInvoiceTemplate');
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

    // Sync draft line items with library
    useEffect(() => {
        // invoices technically don't have 'draft' state in this implementation, but we can assume editing = draft if it hasn't been paid
        if (lineItems.length > 0 && serviceItems.length > 0) {
            setLineItems(prev => {
                let changed = false;
                const newItems = prev.map(item => {
                    if (item.serviceItemId) {
                        const libItem = serviceItems.find(s => s.id === item.serviceItemId);
                        if (libItem && (libItem.price !== item.price || libItem.description !== item.description || libItem.taxType !== item.taxType)) {
                            changed = true;
                            return {
                                ...item,
                                description: libItem.description,
                                price: libItem.price,
                                taxType: libItem.taxType || '',
                                taxRate: libItem.taxRate || 0,
                            };
                        }
                    }
                    return item;
                });
                return changed ? newItems : prev;
            });
        }
    }, [serviceItems]); // Run once when service items load

    const handleOpenEditDialog = (item: LocalLineItem) => {
        setItemToEdit(item);
        setIsAddLineItemDialogOpen(true);
    };

    const handleSaveLineItemFromDialog = (newItem: any) => {
        if (itemToEdit) {
            setLineItems(prev => prev.map(item => item.id === itemToEdit.id ? { ...newItem, id: itemToEdit.id } : item));
            setItemToEdit(null);
        }
    };

    const handleAddEmptyLineItem = () => {
        setLineItems(prev => [
            ...prev,
            {
                id: `item_${Date.now()}`,
                description: '',
                quantity: 1,
                price: 0,
                taxType: 'None',
                taxRate: 0,
            }
        ]);
    };

    const handleUpdateLineItem = (id: string, field: keyof LocalLineItem, value: any) => {
        setLineItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            if (field === 'taxType') {
                const selectedTax = taxTypes.find(t => t.id === value || t.name === value);
                if (selectedTax) {
                    updated.taxRate = selectedTax.rate;
                } else if (value === 'None' || value === '') {
                    updated.taxRate = 0;
                }
            }
            return updated;
        }));
    };

    const handleDeleteItem = (id: string) => {
        setLineItems(prev => prev.filter(item => item.id !== id));
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

    const handleSaveRepeatableItem = async (item: Omit<ServiceItem, 'id' | 'userId'>, lineItemId?: string) => {
        if (!user) return;
        try {
            const newServiceItem = await addServiceItem({ ...item, userId: user.uid });
            setServiceItems(prev => [newServiceItem, ...prev]);
            if (lineItemId) {
                handleUpdateLineItem(lineItemId, 'serviceItemId', newServiceItem.id);
            }
            toast({ title: "Saved to Library and Linked" });
        } catch (error: any) {
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
            toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to save.' });
            return;
        }
        if (!selectedContactId) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a contact.' });
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
            lineItemDetails,
            taxType: 'gst_hst',
            userId: user.uid,
        };

        const itemsToSave = lineItems.map(({ id, ...rest }) => {
            const payload: any = { ...rest, userId: user.uid };
            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
            return payload;
        });

        try {
            // Sync items back to library
            for (const item of lineItems) {
                if (item.serviceItemId) {
                    const original = serviceItems.find(s => s.id === item.serviceItemId);
                    if (original && (original.description !== item.description || original.price !== item.price || original.taxType !== item.taxType)) {
                        await updateServiceItem(item.serviceItemId, {
                            description: item.description,
                            price: item.price,
                            taxType: item.taxType,
                            taxRate: item.taxRate,
                        });
                        setServiceItems(prev => prev.map(s => s.id === item.serviceItemId ? { ...s, description: item.description, price: item.price, taxType: item.taxType, taxRate: item.taxRate } : s));
                    }
                }
            }

            if (invoiceToEditId) {
                await updateInvoiceWithLineItems(invoiceToEditId, invoiceData, itemsToSave, user.uid);
                toast({ title: 'Invoice Updated', description: `Invoice ${invoiceNumber} has been saved.` });
            } else {
                await addInvoiceWithLineItems(invoiceData, itemsToSave);
                toast({ title: 'Invoice Saved', description: `Invoice ${invoiceNumber} has been created.` });
            }
            localStorage.removeItem(EDIT_INVOICE_ID_KEY);
            window.location.href = '/accounting/accounts-receivable';

        } catch (error: any) {
            console.error("Save Invoice Error:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveTemplate = () => {
        const templateName = prompt("Enter a name for this template:");
        if (!templateName) return;

        const newTemplate = {
            name: templateName,
            items: lineItems,
            notes,
        };
        
        const updatedTemplates = [...invoiceTemplates, newTemplate];
        setInvoiceTemplates(updatedTemplates);
        localStorage.setItem('invoiceTemplates', JSON.stringify(updatedTemplates));
        toast({ title: 'Template Saved', description: `Invoice template "${templateName}" saved.` });
    };

    const handleLoadTemplate = (template: any) => {
        if (lineItems.length > 0 && !window.confirm("Loading a template will replace your current line items. Continue?")) return;
        setLineItems(template.items.map((i: any) => ({ ...i, id: `item_${Math.random()}` })));
        if (template.notes) setNotes(template.notes);
        toast({ title: 'Template Loaded' });
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
        setLineItemDetails('');
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
        lineItemDetails,
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
                    <div className="absolute top-0 right-0 flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">Load Template</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {invoiceTemplates.length > 0 ? invoiceTemplates.map((t, idx) => (
                                    <DropdownMenuItem key={idx} onClick={() => handleLoadTemplate(t)}>
                                        {t.name}
                                    </DropdownMenuItem>
                                )) : (
                                    <DropdownMenuItem disabled>No templates saved</DropdownMenuItem>
                                )}
                                <Separator className="my-1" />
                                <DropdownMenuItem asChild>
                                    <Link href="/accounting/invoices/templates">Manage Templates</Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/accounting/accounts-receivable">Invoice Library</Link>
                        </Button>
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
            <div>
              {selectedContact ? (
                <div className="flex flex-col">
                  <span className="font-bold text-xl text-primary">{selectedContact.businessName || selectedContact.name}</span>
                  {selectedContact.businessName && selectedContact.name && selectedContact.name !== selectedContact.businessName && (
                    <span className="text-sm font-medium text-muted-foreground">{selectedContact.name}</span>
                  )}
                  <span className="text-sm text-muted-foreground mt-1">
                    {[selectedContact.streetAddress, selectedContact.city, selectedContact.provinceState].filter(Boolean).join(', ')}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                    {selectedContact.email && <span>📧 {selectedContact.email}</span>}
                    {(selectedContact.businessPhone || selectedContact.cellPhone || selectedContact.homePhone) && (
                        <span>📞 {selectedContact.businessPhone || selectedContact.cellPhone || selectedContact.homePhone}</span>
                    )}
                  </span>
                </div>
              ) : (
                <CardTitle>Invoice Header</CardTitle>
              )}
            </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={handleSaveInvoice} disabled={isSaving} className="font-bold">
                                {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Invoice
                            </Button>
                            <Button variant="outline" onClick={() => setIsPreviewDialogOpen(true)}><Eye className="mr-2 h-4 w-4" /> Preview</Button>
                            <Button variant="secondary" onClick={() => handlePrint()} className="font-bold shadow-sm border-2">
                                <Printer className="mr-2 h-4 w-4" /> Print Invoice & Report
                            </Button>
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
                                <div className="flex items-center gap-2 mb-2">
                                    <Button variant="outline" size="sm" onClick={handleAddEmptyLineItem} className="font-semibold">
                                        <Plus className="mr-2 h-4 w-4" /> Line Items
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setIsTimeLogDialogOpen(true)} disabled={!selectedContactId} className="font-semibold">
                                        <Clock className="mr-2 h-4 w-4" /> Add from Time Log
                                    </Button>
                                </div>
                <datalist id="library-items">
                  {serviceItems.map(s => (
                    <option key={s.id} value={s.description}>
                      {formatCurrency(s.price)}
                    </option>
                  ))}
                </datalist>
                <div className="border rounded-md overflow-x-auto">
                  <Table className="min-w-[800px]">
                                        <TableHeader>
                                            <TableRow>
                        <TableHead className="w-[54%]">Description</TableHead>
                        <TableHead className="w-[14%]">Tax</TableHead>
                        <TableHead className="w-[8%] text-center">Qty</TableHead>
                        <TableHead className="w-[12%] text-right">Price</TableHead>
                        <TableHead className="w-[12%] text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="p-2 align-top">
                            <div className="relative flex items-center">
                              <Input 
                                list="library-items"
                                className="w-full text-sm h-9 pr-8 [&::-webkit-calendar-picker-indicator]:!opacity-100 [&::-webkit-calendar-picker-indicator]:!cursor-pointer [&::-webkit-calendar-picker-indicator]:!block" 
                                placeholder="Type or select from library..." 
                                value={item.description}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleUpdateLineItem(item.id, 'description', val);
                                  const service = serviceItems.find(s => s.description === val);
                                  if (service) {
                                    handleUpdateLineItem(item.id, 'price', service.price);
                                    handleUpdateLineItem(item.id, 'serviceItemId', service.id);
                                    if (service.taxType) {
                                      handleUpdateLineItem(item.id, 'taxType', service.taxType);
                                    }
                                  } else {
                                    handleUpdateLineItem(item.id, 'serviceItemId', '');
                                  }
                                }}
                              />
                              <div className="absolute right-0 top-0 h-9 flex items-center pr-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={() => toast({ title: "Line item saved to invoice" })}>
                                      Save to Invoice
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      toast({ title: "Line item saved to invoice" });
                                      handleAddEmptyLineItem();
                                    }}>
                                      Save and add a new line item
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleSaveRepeatableItem({
                                        description: item.description,
                                        price: item.price,
                                        taxType: item.taxType || '',
                                        taxRate: item.taxRate || 0,
                                        itemType: 'service',
                                      }, item.id)}
                                    >
                                      Save to Library
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenEditDialog(item)}>
                                      Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </TableCell>
                                                    <TableCell className="p-2 align-top">
                                                        <Select 
                                                            value={item.taxType || "None"} 
                                                            onValueChange={(val) => handleUpdateLineItem(item.id, 'taxType', val)}
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="Tax..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="None">No Tax</SelectItem>
                                                                {taxTypes.map(t => (
                                                                    <SelectItem key={t.id} value={t.name}>
                                                                        {t.name} ({t.rate}%)
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="p-2 align-top">
                                                        <Input 
                                                            type="number" 
                                                            className="text-center h-9" 
                                                            value={item.quantity} 
                                                            onChange={(e) => handleUpdateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} 
                                                        />
                                                    </TableCell>
                                                    <TableCell className="p-2 align-top">
                                                        <Input 
                                                            type="number" 
                                                            className="text-right h-9 font-mono" 
                                                            value={item.price} 
                                                            onChange={(e) => handleUpdateLineItem(item.id, 'price', parseFloat(e.target.value) || 0)} 
                                                        />
                                                    </TableCell>
                          <TableCell className="p-2 align-top text-right font-mono font-bold pt-4">
                            {formatCurrency(item.quantity * item.price)}
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
                            </div>

                            <div className="pt-2 border-t">
                                <Label htmlFor="lineItemDetails">Line Item Details</Label>
                                <Textarea id="lineItemDetails" value={lineItemDetails} onChange={e => setLineItemDetails(e.target.value)} rows={2} placeholder="Add extra details about the line items..." className="mt-2" />
                            </div>

                            <div className="p-4 border-2 border-dashed rounded-xl bg-primary/5 space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4" /> Work Coverage Summary
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
                                    This will include a high-fidelity summary of the amount of work covered by this invoice, based on billable sessions and tasks linked to this client for the invoice period.
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
                                    <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Add additional terms or explanation..." />
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
                        <Button variant="outline" size="sm" onClick={handleSaveTemplate}><Save className="mr-2 h-4 w-4" /> Save as a Template</Button>
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
                itemToEdit={itemToEdit as any}
                onSave={handleSaveLineItemFromDialog as any}
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
