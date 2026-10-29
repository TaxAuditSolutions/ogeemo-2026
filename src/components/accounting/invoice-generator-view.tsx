'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HelpTip } from '@/components/ui/help-tip';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { format, addDays } from 'date-fns';
import { Plus, Trash2, Save, Eye, ChevronsUpDown, Check, LoaderCircle, X, Calendar as CalendarIcon, MoreVertical, Edit, Info, Printer, Clock, UserPlus, ClipboardList, ListPlus, Settings, ChevronDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { InvoicePageHeader } from '@/components/accounting/invoice-page-header';
import { useAuth } from '@/context/auth-context';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { getInvoices, getInvoiceById, getLineItemsForInvoice, getServiceItems, type ServiceItem, addInvoiceWithLineItems, updateInvoiceWithLineItems, addServiceItem, updateServiceItem, getTaxTypes, type TaxType, type Invoice, type InvoiceShippingAddress, type InvoiceLineItem, getIncomeCategories, type IncomeCategory } from '@/core/accounting-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { cn } from '@/lib/utils';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes';
import ContactFormDialog from '../contacts/contact-form-dialog';
import { getCompanies, type Company } from '@/core/accounting-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { getUserProfile } from '@/core/user-profile-service';
import type { UserProfile } from '@/core/user-profile-service';
import { getOrganization } from '@/core/organization-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { TimeLogImportDialog } from './time-log-import-dialog';
import { toInvoiceLineItem, type InvoiceableEntry, type EntryRef } from '@/lib/billing-eligibility';
import { readInvoiceDraftHandoff } from '@/lib/invoice-handoff';
import { DocumentBrandLogo } from '@/components/documents/document-brand-logo';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { AddLineItemDialog } from './add-line-item-dialog';
import { ManageTaxTypesDialog } from './manage-tax-types-dialog';
import { LibraryPickerPopover } from './library-picker-popover';

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
    // OG-070: time-log-derived lines point back at their source record.
    sourceEntryId?: string;
    sourceEntryType?: 'log' | 'event';
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

import { claimDocumentNumber, getNextDocumentNumbers } from '@/app/actions/numbering-actions';

const EDIT_INVOICE_ID_KEY = 'editInvoiceId';

const InvoiceDocument = ({
    invoiceNumber,
    sourceQuoteNumber,
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
    attachReport,
    shipToLines,
    senderName
}: any) => (
    <div className="p-12 bg-white text-black min-h-[11in] w-full max-w-[8.5in] mx-auto shadow-sm">
        <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900">
            <DocumentBrandLogo />
            <div className="text-right">
                <h1 className="text-4xl font-bold uppercase text-gray-700">Invoice</h1>
                <p className="text-gray-500">#{invoiceNumber}</p>
                {sourceQuoteNumber && <p className="text-sm text-gray-500 mt-1">Quote: {sourceQuoteNumber}</p>}
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
        {shipToLines && shipToLines.length > 0 && (
            <section className="mt-6">
                <h2 className="font-bold text-gray-500 uppercase mb-2 text-xs tracking-widest">Ship To</h2>
                <p className="font-bold text-lg">{selectedContact?.businessName || selectedContact?.name || 'N/A'}</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {shipToLines.join('\n')}
                </p>
            </section>
        )}
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
            <p className="text-sm font-bold text-gray-800">{senderName || 'Ogeemo User'}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Generated by Ogeemo</p>
        </footer>
    </div>
);

export function InvoiceGeneratorView() {
    const { toast } = useToast();
    const { user } = useAuth();
    const { preferences } = useUserPreferences();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { handlePrint, contentRef } = useReactToPrint();

    const [companies, setCompanies] = useState<Company[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
    const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
    const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
    const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [orgDetails, setOrgDetails] = useState<Awaited<ReturnType<typeof getOrganization>> | null>(null);

    const [invoiceToEditId, setInvoiceToEditId] = useState<string | null>(null);
    const [editingStatus, setEditingStatus] = useState<Invoice['status'] | null>(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    // User-assigned reference (Custom ID) - carried forward from the source
    // quote at conversion; editable here.
    const [customId, setCustomId] = useState('');
    const originalInvoiceNumberRef = useRef<string | null>(null);
    const numberEditedRef = useRef(false);

    // New documents preview today's next number; edits keep their stored number.
    // The preview is non-fatal - retry once, then notify (the real number is
    // still claimed at save). Never a fake timestamp number in the field.
    const previewFailedRef = useRef(false);
    const previewNextInvoiceNumber = useCallback(async () => {
        try {
            const next = await getNextDocumentNumbers();
            if (!numberEditedRef.current && !localStorage.getItem(EDIT_INVOICE_ID_KEY)) {
                setInvoiceNumber(next.INV);
            }
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            try {
                const next = await getNextDocumentNumbers();
                if (!numberEditedRef.current && !localStorage.getItem(EDIT_INVOICE_ID_KEY)) {
                    setInvoiceNumber(next.INV);
                }
            } catch {
                if (!previewFailedRef.current) {
                    previewFailedRef.current = true;
                    toast({ title: 'Number preview unavailable', description: 'The invoice number will be assigned automatically when you save.' });
                }
            }
        }
    }, [toast]);

    useEffect(() => {
        if (localStorage.getItem(EDIT_INVOICE_ID_KEY)) return;
        previewNextInvoiceNumber();
    }, [previewNextInvoiceNumber]);
    const [businessNumber, setBusinessNumber] = useState('');
    // Quote this invoice was converted from - shown on the document itself so
    // the link is visible; invoices keep their own independent number sequence.
    const [sourceQuoteNumber, setSourceQuoteNumber] = useState<string | null>(null);
    const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
    const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 14));
    const [paymentTermsDays, setPaymentTermsDays] = useState('14');
    const [notes, setNotes] = useState("Thank you for your business!");
    const [lineItemDetails, setLineItemDetails] = useState('');
    const [attachReport, setAttachReport] = useState(false);
    const [shippingAddress, setShippingAddress] = useState<InvoiceShippingAddress>({ mode: 'client' });
    const [isCustomAddressOpen, setIsCustomAddressOpen] = useState(false);
    const [draftInvoices, setDraftInvoices] = useState<Invoice[]>([]);

    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [lineItems, setLineItems] = useState<LocalLineItem[]>([{ id: `item_${Date.now()}`, description: '', quantity: 1, price: 0, taxType: 'None', taxRate: 0 }]);
    const [invoiceTemplates, setInvoiceTemplates] = useState<any[]>([]);

    const [isContactFormOpen, setIsContactFormOpen] = useState(false);
    const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
    const [isTimeLogDialogOpen, setIsTimeLogDialogOpen] = useState(false);
    // Time Log -> Invoice handoff: entries carried from the Time Log Report,
    // pre-checked in Add from Time Log (null once the dialog is closed).
    const [pendingEntryRefs, setPendingEntryRefs] = useState<EntryRef[] | null>(null);
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const [isAddLineItemDialogOpen, setIsAddLineItemDialogOpen] = useState(false);
    const [isManageTaxDialogOpen, setIsManageTaxDialogOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<LocalLineItem | null>(null);

    // Unsaved-changes guard. The auto-claimed invoice number and the derived
    // business number (org-doc only, no input) never count as user edits.
    const buildSnapshot = () =>
        JSON.stringify({
            qn: numberEditedRef.current ? invoiceNumber : null,
            contact: selectedContactId,
            supplier: selectedSupplierId,
            invoiceDate: invoiceDate.toISOString(),
            dueDate: dueDate.toISOString(),
            status: editingStatus,
            notes,
            details: lineItemDetails,
            shipping: shippingAddress,
            attachReport,
            customId,
            paymentTermsDays,
            lineItems,
        });
    const { markClean, markCleanNow, confirmLeave } = useUnsavedChangesGuard(buildSnapshot);

    const loadInvoiceForEditing = useCallback(async (invoiceId: string) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [invoiceData, lineItemsData] = await Promise.all([
                getInvoiceById(invoiceId, { quiet: true }),
                getLineItemsForInvoice(user.uid, invoiceId),
            ]);

            if (!invoiceData) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not find the invoice to edit.' });
                localStorage.removeItem(EDIT_INVOICE_ID_KEY);
                return;
            }

            setInvoiceNumber(invoiceData.invoiceNumber);
            setSourceQuoteNumber(invoiceData.sourceQuoteNumber || null);
            setCustomId(invoiceData.customId || '');
            originalInvoiceNumberRef.current = invoiceData.invoiceNumber;
            numberEditedRef.current = false;
            setBusinessNumber(invoiceData.businessNumber || '');
            setInvoiceDate(new Date(invoiceData.invoiceDate));
            setDueDate(new Date(invoiceData.dueDate));
            setNotes(invoiceData.notes);
            setLineItemDetails(invoiceData.lineItemDetails || '');
            setSelectedContactId(invoiceData.contactId);
            setSelectedSupplierId(invoiceData.supplierId || null);
            setShippingAddress(invoiceData.shippingAddress || { mode: 'client' });
            setEditingStatus(invoiceData.status);

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
            markClean();
            toast({
                title: 'Editing Existing Invoice',
                description: `Invoice ${invoiceData.invoiceNumber} loaded. Use "Clear Form" to start a brand new invoice.`,
            });

        } catch (error: any) {
            if (error?.code === 'permission-denied') {
                // Stale one-shot edit pointer: the invoice was deleted, lives in
                // another workspace, or is legacy data this org cannot read.
                // Clear it so Create Invoice stops retrying the denied read.
                localStorage.removeItem(EDIT_INVOICE_ID_KEY);
                setInvoiceToEditId(null);
                toast({
                    variant: 'destructive',
                    title: 'Invoice no longer available',
                    description: 'That invoice was deleted or belongs to a different workspace, so it cannot be opened here. The form is ready for a new invoice.',
                });
            } else {
                toast({ variant: 'destructive', title: 'Failed to load invoice', description: error.message });
            }
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    const handleOpenDraft = async (invoice: Invoice) => {
        if (!confirmLeave()) return;
        setInvoiceToEditId(invoice.id);
        await loadInvoiceForEditing(invoice.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const refreshDrafts = useCallback(async () => {
        if (!user) return;
        try {
            const all = await getInvoices(user.uid, { includeDrafts: true });
            setDraftInvoices(all.filter(inv => inv.status === 'draft'));
        } catch {
            // The drafts list is non-critical; the form works without it.
        }
    }, [user]);

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
                    fetchedIncomeCategories,
                ] = await Promise.all([
                    getCompanies(user.uid),
                    getServiceItems(user.uid),
                    getTaxTypes(user.uid).catch(() => [] as TaxType[]),
                    getIncomeCategories(user.uid).catch(() => [] as IncomeCategory[]),
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
                setIncomeCategories(fetchedIncomeCategories);
                setUserProfile(profile);
                setCustomIndustries(fetchedIndustries);

                const invoiceId = localStorage.getItem(EDIT_INVOICE_ID_KEY);
                if (invoiceId) {
                    // One-shot edit pointer: consume it so a refresh always
                    // starts with a blank invoice. The loaded invoice can be
                    // reopened from the Drafts menu or Invoicing Report.
                    localStorage.removeItem(EDIT_INVOICE_ID_KEY);
                    setInvoiceToEditId(invoiceId);
                    await loadInvoiceForEditing(invoiceId);
                }

                await refreshDrafts();

                const contactIdParam = searchParams.get('contactId');
                if (contactIdParam) {
                    setSelectedContactId(contactIdParam);
                }

                const contactNameParam = searchParams.get('contactName');
                if (contactNameParam) {
                    const targetName = decodeURIComponent(contactNameParam).trim().toLowerCase();
                    const matchedContact = fetchedContacts.find((contact) => {
                        const fullName = `${contact.name || ''} ${contact.businessName || ''}`.toLowerCase();
                        return fullName.includes(targetName) || (contact.name || '').toLowerCase() === targetName || (contact.businessName || '').toLowerCase() === targetName;
                    });
                    if (matchedContact) {
                        setSelectedContactId(matchedContact.id);
                    }
                }

                const rawTemplates = localStorage.getItem('invoiceTemplates');
                if (rawTemplates) {
                    setInvoiceTemplates(JSON.parse(rawTemplates));
                }

                const templateToEditRaw = localStorage.getItem('editInvoiceTemplate');
                if (templateToEditRaw) {
                    const template = JSON.parse(templateToEditRaw);
                    const templateItems = Array.isArray(template.items) ? template.items : [];
                    setLineItems(templateItems.map((i: any, idx: number) => ({ ...i, id: `item_${Date.now()}_${idx}` })));
                    if (template.notes) setNotes(template.notes);
                    localStorage.removeItem('editInvoiceTemplate');
                }

                // Time Log -> Invoice handoff (read-once): preselect the client
                // and open Add from Time Log with the carried entries checked.
                // Skipped when editing an existing invoice.
                if (!invoiceId) {
                    const handoff = readInvoiceDraftHandoff();
                    if (handoff && fetchedContacts.some((c) => c.id === handoff.contactId)) {
                        setSelectedContactId(handoff.contactId);
                        setPendingEntryRefs(handoff.entryRefs);
                        setIsTimeLogDialogOpen(true);
                    }
                }

            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
            } finally {
                setIsLoading(false);
                markClean();
            }
        }
        initializeView();
    }, [user, toast, loadInvoiceForEditing, refreshDrafts, searchParams]);

    useEffect(() => {
        const orgId = userProfile?.orgId;
        if (!orgId) return;
        let cancelled = false;
        getOrganization(orgId)
            .then(function (org) { if (!cancelled) setOrgDetails(org); })
            .catch(function () {});
        return function () { cancelled = true; };
    }, [userProfile?.orgId]);

    // The issuer's HST # comes from the workspace org doc (Settings > Company
    // Information) - never the selected contact's BN field. That is client data
    // and can contain a company name or other junk instead of a tax number.
    useEffect(() => {
        setBusinessNumber(orgDetails?.businessNumber || userProfile?.businessNumber || '');
    }, [userProfile, orgDetails]);

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
        const defaultTaxType = preferences?.defaultTaxRate
            ? taxTypes.find(t => t.rate === preferences.defaultTaxRate)
            : undefined;
        setLineItems(prev => [
            ...prev,
            {
                id: `item_${Date.now()}`,
                description: '',
                quantity: 1,
                price: 0,
                taxType: defaultTaxType ? defaultTaxType.name : 'None',
                taxRate: defaultTaxType ? defaultTaxType.rate : 0,
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

    const handleAddTimeLogEntries = (entries: InvoiceableEntry[]) => {
        const newItems: LocalLineItem[] = entries.map((entry, index) => toInvoiceLineItem(entry, index));
        setLineItems(prev => [...prev, ...newItems]);
        toast({ title: `${newItems.length} time entries added to invoice.` });
    };

    const handleSaveRepeatableItem = async (item: Omit<ServiceItem, 'id' | 'userId'>, lineItemId?: string) => {
        if (!user) return;
        if (!item.description?.trim()) {
            toast({ variant: 'destructive', title: 'Nothing to save', description: 'Enter a description for the item first.' });
            return;
        }
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
        // A saved invoice is always a real receivable: outstanding, unless the
        // one being edited has already been (partially) paid.
        let status: Invoice['status'] =
            editingStatus === 'paid' || editingStatus === 'partially_paid' ? editingStatus : 'outstanding';

        let finalInvoiceNumber = invoiceNumber;
        try {
            if (invoiceToEditId) {
                if (originalInvoiceNumberRef.current !== null && invoiceNumber !== originalInvoiceNumberRef.current) {
                    finalInvoiceNumber = await claimDocumentNumber('INV', { override: invoiceNumber, excludeDocId: invoiceToEditId });
                }
            } else if (numberEditedRef.current) {
                finalInvoiceNumber = await claimDocumentNumber('INV', { override: invoiceNumber });
            } else {
                finalInvoiceNumber = await claimDocumentNumber('INV');
            }
        } catch (claimError: any) {
            toast({ variant: 'destructive', title: 'Invalid Invoice Number', description: claimError?.message || 'Could not claim an invoice number.' });
            setIsSaving(false);
            return;
        }

        const invoiceData = {
            invoiceNumber: finalInvoiceNumber,
            customId: customId.trim(),
            businessNumber,
            companyName,
            contactId: selectedContactId,
            supplierId: selectedSupplierId,
            originalAmount: total,
            amountPaid: invoiceToEditId ? (await getInvoiceById(invoiceToEditId, { quiet: true }))?.amountPaid || 0 : 0,
            dueDate: dueDate,
            invoiceDate: invoiceDate,
            status,
            notes,
            lineItemDetails,
            shippingAddress,
            taxType: 'gst_hst',
            userId: user.uid,
        };

        const itemsToSave = lineItems.filter((item) => item.description.trim() !== '').map(({ id, ...rest }) => {
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
                toast({ title: 'Invoice Updated', description: `Invoice ${finalInvoiceNumber} has been saved.` });
            } else {
                await addInvoiceWithLineItems(invoiceData, itemsToSave);
                toast({ title: 'Invoice Saved', description: `Invoice ${finalInvoiceNumber} has been created.` });
            }
            localStorage.removeItem(EDIT_INVOICE_ID_KEY);
            markCleanNow();
            window.location.href = '/accounting/accounts-receivable';

        } catch (error: any) {
            console.error("Save Invoice Error:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveTemplate = () => {
        const templateName = prompt("Enter a name for this template:")?.trim();
        if (!templateName) return;

        const existing = invoiceTemplates.find((t: any) => t.name === templateName);
        if (existing && !window.confirm(`A template named "${templateName}" already exists. Overwrite it?`)) {
            return;
        }

        const newTemplate = {
            id: existing?.id || `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: templateName,
            items: lineItems,
            notes,
        };

        const updatedTemplates = existing
            ? invoiceTemplates.map((t: any) => (t.name === templateName ? newTemplate : t))
            : [...invoiceTemplates, newTemplate];
        setInvoiceTemplates(updatedTemplates);
        localStorage.setItem('invoiceTemplates', JSON.stringify(updatedTemplates));
        toast({ title: existing ? 'Template Updated' : 'Template Saved', description: `Invoice template "${templateName}" ${existing ? 'overwritten' : 'saved'}.` });
    };

    const handleLoadTemplate = (template: any) => {
        const items = Array.isArray(template.items) ? template.items : [];
        const isDirty = lineItems.length > 0 || !!lineItemDetails || !!invoiceToEditId || notes !== 'Thank you for your business!';
        if (isDirty && !window.confirm('Start a new invoice from this template?\nThe current form (line items, notes, and details) will be cleared.')) {
            return;
        }
        handleClearInvoice(true);
        setLineItems(items.map((i: any, idx: number) => ({ ...i, id: `item_${Date.now()}_${idx}` })));
        if (template.notes) setNotes(template.notes);
        toast({ title: 'Template Applied', description: `"${template.name}" - started a new invoice.` });
        markClean();
    };

    const loadTemplateMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" title="Start a new invoice from a saved template">Select from Template</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {invoiceTemplates.length > 0 ? invoiceTemplates.map((t, idx) => (
                    <DropdownMenuItem key={idx} onClick={() => handleLoadTemplate(t)}>
                        {t.name}
                    </DropdownMenuItem>
                )) : (
                    <DropdownMenuItem disabled>No templates saved yet</DropdownMenuItem>
                )}
                <Separator className="my-1" />
                <DropdownMenuItem onClick={handleSaveTemplate}>
                    <Save className="mr-2 h-4 w-4" /> Save as Template
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/accounting/invoices/templates">Manage Templates</Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const handleClearInvoice = (silent: boolean = false) => {
        localStorage.removeItem(EDIT_INVOICE_ID_KEY);
        setInvoiceToEditId(null);
        originalInvoiceNumberRef.current = null;
        numberEditedRef.current = false;
        setInvoiceNumber('');
        setSourceQuoteNumber(null);
        setCustomId('');
        previewNextInvoiceNumber();
        setBusinessNumber('');
        setInvoiceDate(new Date());
        setDueDate(addDays(new Date(), 14));
        setPaymentTermsDays('14');
        setNotes("Thank you for your business!");
        setLineItemDetails('');
        setSelectedContactId(null);
        setSelectedSupplierId(null);
        setShippingAddress({ mode: 'client' });
        setLineItems([{ id: `item_${Date.now()}`, description: '', quantity: 1, price: 0, taxType: 'None', taxRate: 0 }]);
        setAttachReport(false);
        setEditingStatus(null);
        if (!silent) toast({ title: "Form Cleared" });
        markClean();
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
    const senderName = orgDetails?.name || userProfile?.companyName || userProfile?.displayName || '';
    const senderAddress = orgDetails?.businessAddress || userProfile?.businessAddress;
    const senderAddressLines = senderAddress
        ? [senderAddress.street, [senderAddress.city, senderAddress.state, senderAddress.postalCode].filter(Boolean).join(", "), senderAddress.country].filter(Boolean)
        : [];

    const shipToLines = (() => {
        const mode = shippingAddress?.mode || 'client';
        if (mode === 'custom') {
            return [
                shippingAddress.street,
                [shippingAddress.city, shippingAddress.provinceState, shippingAddress.postalCode].filter(Boolean).join(', '),
                shippingAddress.country,
            ].filter(Boolean);
        }
        if (mode === 'home' && selectedContact?.homeAddress) {
            const h = selectedContact.homeAddress;
            return [
                h.street,
                [h.city, h.provinceState, h.postalCode].filter(Boolean).join(', '),
                h.country,
            ].filter(Boolean);
        }
        return [];
    })();

    // Form-only resolved shipping address for all modes, including the default
    // "client" mode. Kept separate from shipToLines, which feeds the printed
    // document and intentionally skips "Ship To" when it would only duplicate
    // "Bill To".
    const resolvedShippingLines = (() => {
        const mode = shippingAddress?.mode || 'client';
        if (mode === 'custom') {
            return [
                shippingAddress.street,
                [shippingAddress.city, shippingAddress.provinceState, shippingAddress.postalCode].filter(Boolean).join(', '),
                shippingAddress.country,
            ].filter(Boolean);
        }
        if (mode === 'home' && selectedContact?.homeAddress) {
            const h = selectedContact.homeAddress;
            return [
                h.street,
                [h.city, h.provinceState, h.postalCode].filter(Boolean).join(', '),
                h.country,
            ].filter(Boolean);
        }
        if (selectedContact) {
            return [
                selectedContact.streetAddress,
                [selectedContact.city, selectedContact.provinceState, selectedContact.postalCode].filter(Boolean).join(', '),
                selectedContact.country,
            ].filter(Boolean);
        }
        return [];
    })();

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
        attachReport,
        shipToLines,
        senderName,
        sourceQuoteNumber
    };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6 text-black bg-background min-h-screen max-w-6xl mx-auto">
        <InvoicePageHeader pageTitle="Create Invoice" />
        <header className="print:hidden flex flex-wrap items-start justify-between gap-4">
            <div>
                <div className="flex items-center gap-1">
                    <h1 className="text-3xl font-bold font-headline text-primary">Create an Invoice</h1>
                    <HelpTip title="Invoices" learnHref="/learn/guides/invoices" learnLabel="Learn about invoices">
                        Turn completed work into a billable invoice, send it to a contact, and track it in Accounts Receivable.
                    </HelpTip>
                </div>
                <p className="text-muted-foreground max-w-2xl">
                    Prepare and send a professional invoice to your client.
                </p>
            </div>
            <div className="flex items-center gap-2">
                {draftInvoices.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <ClipboardList className="mr-2 h-4 w-4" /> Drafts ({draftInvoices.length})
                                <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-80">
                            {draftInvoices.map(draft => (
                                <DropdownMenuItem key={draft.id} onSelect={() => handleOpenDraft(draft)}>
                                    <span className="flex-1 min-w-0 truncate">{draft.invoiceNumber} — {draft.companyName}</span>
                                    <span className="shrink-0 text-xs text-muted-foreground">{format(draft.invoiceDate, 'PP')}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                <Button variant="outline" onClick={() => setIsPreviewDialogOpen(true)}><Eye className="mr-2 h-4 w-4" /> Preview</Button>
                <Button variant="secondary" onClick={() => handlePrint()} className="font-bold shadow-sm border-2">
                    <Printer className="mr-2 h-4 w-4" /> Print & Export
                </Button>
                <Button onClick={() => handleSaveInvoice()} disabled={isSaving} className="font-bold">
                    {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Invoice
                </Button>
                <Button asChild variant="ghost" size="icon" onClick={() => { if (confirmLeave()) router.back(); }}>
                    <a className="cursor-pointer">
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </a>
                </Button>
            </div>
        </header>

                <Card className="print:hidden shadow-lg border-primary/10">
                    <CardHeader className="flex-row justify-between items-center bg-primary/5 border-b">
                        <div className="flex items-center gap-4">
                            <DocumentBrandLogo className="h-14" />
                            <div className="flex flex-col text-sm">
                                <span className="font-bold text-lg text-primary">{senderName || "Your Company"}</span>
                                {senderAddressLines.length > 0 && (
                                    <span className="text-muted-foreground">{senderAddressLines.join(", ")}</span>
                                )}
                                <span className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                                    {(orgDetails?.businessPhone || userProfile?.businessPhone || userProfile?.cellPhone) && <span>📞 {orgDetails?.businessPhone || userProfile?.businessPhone || userProfile?.cellPhone}</span>}
                                    {(orgDetails?.email || userProfile?.email) && <span>📧 {orgDetails?.email || userProfile?.email}</span>}
                                    {businessNumber && <span>HST #: {businessNumber}</span>}
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card className="print:hidden shadow-lg border-primary/10">
                    <CardHeader className="bg-primary/5 border-b">
                        <CardTitle className="text-base">Contact / Billing Details</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Contact <span className="text-destructive">*</span></Label>
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
                                {selectedContact ? (
                                    <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                                        <p className="font-bold text-lg">{selectedContact.businessName || selectedContact.name}</p>
                                        {selectedContact.businessName && selectedContact.name && selectedContact.name !== selectedContact.businessName && (
                                            <p className="text-muted-foreground">{selectedContact.name}</p>
                                        )}
                                        <p className="text-muted-foreground">
                                            {[selectedContact.streetAddress, selectedContact.city, selectedContact.provinceState].filter(Boolean).join(", ")}
                                        </p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-4">
                                            {selectedContact.email && <span>📧 {selectedContact.email}</span>}
                                            {(selectedContact.businessPhone || selectedContact.cellPhone || selectedContact.homePhone) && (
                                                <span>📞 {selectedContact.businessPhone || selectedContact.cellPhone || selectedContact.homePhone}</span>
                                            )}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Select a contact to see their details here.</p>
                                )}
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="shippingAddress">Shipping / Service Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                            <Select value={shippingAddress.mode} onValueChange={(v) => { setShippingAddress(prev => ({ ...prev, mode: v as InvoiceShippingAddress['mode'] })); if (v === 'custom') setIsCustomAddressOpen(true); }}>
                                                <SelectTrigger id="shippingAddress" className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="client">Same as contact's address</SelectItem>
                                                    {selectedContact?.homeAddress && (
                                                        <SelectItem value="home">Contact's home address</SelectItem>
                                                    )}
                                                    <SelectItem value="custom">Enter a different address...</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {resolvedShippingLines.length > 0 && (
                                            <div className="rounded-md border bg-muted/30 p-3 text-sm flex flex-col gap-1">
                                                {(selectedContact?.businessName || selectedContact?.name) && (
                                                    <span className="font-bold text-lg text-primary">
                                                        {selectedContact?.businessName || selectedContact?.name}
                                                    </span>
                                                )}
                                                <span className="text-muted-foreground">{resolvedShippingLines.join(', ')}</span>
                                            </div>
                                        )}
                                        {shippingAddress.mode === 'custom' && !isCustomAddressOpen && (
                                            <button
                                                type="button"
                                                className="text-sm text-primary hover:underline"
                                                onClick={() => setIsCustomAddressOpen(true)}
                                            >
                                                Edit shipping address
                                            </button>
                                        )}
                                        {shippingAddress.mode === 'custom' && isCustomAddressOpen && (
                                            <div
                                                className="space-y-3 rounded-md border p-3"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        setIsCustomAddressOpen(false);
                                                    }
                                                }}
                                            >
                                                <div className="space-y-2">
                                                    <Label htmlFor="shipStreet">Street</Label>
                                                    <Input id="shipStreet" value={shippingAddress.street || ''} onChange={(e) => setShippingAddress(prev => ({ ...prev, street: e.target.value }))} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="shipCity">City</Label>
                                                        <Input id="shipCity" value={shippingAddress.city || ''} onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="shipProvince">Province / State</Label>
                                                        <Input id="shipProvince" value={shippingAddress.provinceState || ''} onChange={(e) => setShippingAddress(prev => ({ ...prev, provinceState: e.target.value }))} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="shipPostal">Postal Code</Label>
                                                        <Input id="shipPostal" value={shippingAddress.postalCode || ''} onChange={(e) => setShippingAddress(prev => ({ ...prev, postalCode: e.target.value }))} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="shipCountry">Country</Label>
                                                        <Input id="shipCountry" value={shippingAddress.country || ''} onChange={(e) => setShippingAddress(prev => ({ ...prev, country: e.target.value }))} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_3fr_3fr_3fr] gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="invoiceNumber">Invoice #</Label>
                                    <Input id="invoiceNumber" value={invoiceNumber} onChange={e => { numberEditedRef.current = true; setInvoiceNumber(e.target.value); }} />
                                </div>
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
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <CustomCalendar mode="single" selected={dueDate} onSelect={(date) => date && setDueDate(date)} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <p className="text-xs text-muted-foreground">
                                        Based on {paymentTermsDays === '0' ? 'Due on receipt' : `Net ${paymentTermsDays}`}. You can edit the due date.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="customId">Custom ID</Label>
                                    <Input id="customId" value={customId} onChange={e => setCustomId(e.target.value)} placeholder="Your own reference number" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="print:hidden shadow-lg border-primary/10">
                    <CardHeader className="flex-row justify-between items-center bg-primary/5 border-b">
                        <div>
                            <div className="flex items-center gap-1">
                                <CardTitle className="text-base">Services &amp; Items</CardTitle>
                                <HelpTip title="Services & Items" learnHref="/learn/guides/invoices" learnLabel="Learn about invoices">
                                    Pull items from your Products & Services library, import billable time, or start from a saved template.
                                </HelpTip>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Add products, services or billable time to this invoice.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleAddEmptyLineItem} className="font-semibold">
                                <Plus className="mr-2 h-4 w-4" /> Add Item
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsTimeLogDialogOpen(true)} disabled={!selectedContactId} className="font-semibold">
                                <Clock className="mr-2 h-4 w-4" /> Add from Time Log
                            </Button>
                            {loadTemplateMenu}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                <div className="border rounded-md overflow-x-auto">
                  <Table className="min-w-[950px]">
                                        <TableHeader>
                                            <TableRow>
                        <TableHead className="w-[40%]">Select or Add an Item</TableHead>
                        <TableHead className="w-[16%]">Category</TableHead>
                        <TableHead className="w-[14%]">Tax</TableHead>
                        <TableHead className="w-32 text-center">Qty</TableHead>
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
                                className="w-full text-sm h-9 pr-24 [&::-webkit-calendar-picker-indicator]:!opacity-100 [&::-webkit-calendar-picker-indicator]:!cursor-pointer [&::-webkit-calendar-picker-indicator]:!block" 
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
                              <div className="absolute right-0 top-0 h-9 flex items-center gap-0.5 pr-1">
                                {item.description?.trim() && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    title="Save to Products & Services library"
                                    aria-label="Save to Products & Services library"
                                    onClick={() => handleSaveRepeatableItem({
                                      description: item.description,
                                      price: item.price,
                                      taxType: item.taxType || '',
                                      taxRate: item.taxRate || 0,
                                      itemType: 'service',
                                    }, item.id)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                )}
                                <LibraryPickerPopover
                                  serviceItems={serviceItems}
                                  onSelect={(service) => {
                                    handleUpdateLineItem(item.id, 'description', service.description);
                                    handleUpdateLineItem(item.id, 'price', service.price);
                                    handleUpdateLineItem(item.id, 'serviceItemId', service.id);
                                    if (service.taxType) {
                                      handleUpdateLineItem(item.id, 'taxType', service.taxType);
                                    }
                                  }}
                                />
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
                                    <DropdownMenuItem asChild>
                                      <Link href="/accounting/service-items">
                                        <ListPlus className="mr-2 h-4 w-4" /> Open Products &amp; Services
                                      </Link>
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
                                                            value={item.categoryNumber || 'uncategorized'}
                                                            onValueChange={(val) => handleUpdateLineItem(item.id, 'categoryNumber', val === 'uncategorized' ? '' : val)}
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="Category..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                                                                {incomeCategories.map(c => (
                                                                    <SelectItem key={c.id} value={c.categoryNumber || c.id}>
                                                                        {c.name}{c.categoryNumber ? ` (#${c.categoryNumber})` : ''}
                                                                    </SelectItem>
                                                                ))}
                                                                {incomeCategories.length === 0 && (
                                                                    <div className="px-2 py-1.5 text-center text-xs italic text-muted-foreground">
                                                                        No categories yet &mdash; add them in the Tax Center.
                                                                    </div>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="p-2 align-top">
                                                        <div className="flex items-center gap-1">
                                                            <Select 
                                                                value={taxTypes.find(t => t.name === item.taxType || t.id === item.taxType)?.name ?? (item.taxType && item.taxType !== 'None' ? item.taxType : 'None')} 
                                                                onValueChange={(val) => handleUpdateLineItem(item.id, 'taxType', val)}
                                                            >
                                                                <SelectTrigger className="h-9 flex-1 min-w-0">
                                                                    <SelectValue placeholder="Tax..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="None">No Tax</SelectItem>
                                                                    {taxTypes.map(t => (
                                                                        <SelectItem key={t.id} value={t.name}>
                                                                            {t.name} ({t.rate}%)
                                                                        </SelectItem>
                                                                    ))}
                                                                    {taxTypes.length === 0 && (
                                                                        <div className="px-2 py-1.5 text-center text-xs italic text-muted-foreground">
                                                                            No tax rates defined yet &mdash; click + to add.
                                                                        </div>
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-9 w-9 shrink-0"
                                                                onClick={() => setIsManageTaxDialogOpen(true)}
                                                                title="Add or manage tax rates"
                                                            >
                                                                <Settings className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="p-2 align-top">
                                                        <Input 
                                                            type="number" 
                                                            className="text-center h-9 min-w-28" 
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

                            <div className="flex items-center gap-2">
                                <Checkbox id="attachReport" checked={attachReport} onCheckedChange={(checked) => setAttachReport(checked === true)} />
                                <Label htmlFor="attachReport" className="text-sm font-normal cursor-pointer">Attach Work Activity Evidence Report</Label>
                            </div>

                    </div>
                </CardContent>
            </Card>

            <Card className="print:hidden shadow-lg border-primary/10">
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="notes">Notes to Client (optional)</Label>
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
                        <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Thank you for your business!" />
                    </div>
                    <div className="border rounded-lg p-4 bg-muted/50 h-fit self-end space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span className="font-mono">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax:</span>
                            <span className="font-mono">{formatCurrency(tax)}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between items-baseline">
                            <span className="font-semibold">Total Due</span>
                            <span className="font-mono font-bold text-2xl text-primary">{formatCurrency(total)}</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-between border-t p-4">
                    <Button variant="ghost" size="sm" onClick={() => handleClearInvoice()}><X className="mr-2 h-4 w-4" /> Clear Form</Button>
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
                            <DialogTitle>Invoice Preview</DialogTitle>
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
                incomeCategories={incomeCategories}
                taxTypes={taxTypes}
                onTaxTypesChange={setTaxTypes}
            />
            <ManageTaxTypesDialog
                isOpen={isManageTaxDialogOpen}
                onOpenChange={setIsManageTaxDialogOpen}
                taxTypes={taxTypes}
                onTaxTypesChange={setTaxTypes}
            />
            {selectedContactId && (
                <TimeLogImportDialog
                    isOpen={isTimeLogDialogOpen}
                    onOpenChange={(open) => {
                        setIsTimeLogDialogOpen(open);
                        if (!open) setPendingEntryRefs(null);
                    }}
                    contactId={selectedContactId}
                    onSave={handleAddTimeLogEntries}
                    preselectedEntryIds={pendingEntryRefs || undefined}
                />
            )}
        </>
    );
}
