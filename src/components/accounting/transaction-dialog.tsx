'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Clock, 
    Landmark, 
    FileSignature, 
    PlusCircle, 
    Calculator, 
    Settings, 
    Check, 
    ChevronsUpDown, 
    X, 
    Percent, 
    Save, 
    LoaderCircle,
    Info,
    Plus,
    Calendar as CalendarIcon,
    TrendingUp,
    TrendingDown,
    ShieldCheck,
    Contact as ContactIcon
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { CustomCalendar } from '@/components/ui/custom-calendar';

import { 
    addIncomeTransaction, 
    addExpenseTransaction, 
    addPayableBill, 
    addInvoiceWithLineItems,
    addCompany,
    addIncomeCategory,
    addExpenseCategory,
    type IncomeCategory,
    type ExpenseCategory,
    type Company,
    type TaxType
} from '@/services/accounting-service';
import { type Contact } from '@/services/contact-service';
import { ManageTaxTypesDialog } from './manage-tax-types-dialog';

const transactionSchema = z.object({
    date: z.string().min(1, "Date is required."),
    company: z.string().min(1, "Contact selection is required."),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.01, "Quantity must be at least 0.01"),
    unitPrice: z.coerce.number().min(0, "Price must be positive"),
    taxType: z.string().optional(),
    taxRate: z.coerce.number().min(0, "Tax rate cannot be negative"),
    category: z.string().min(1, "Category is required."),
    paymentMethod: z.string().optional(),
    depositedTo: z.string().optional(),
    explanation: z.string().optional(),
    documentNumber: z.string().optional(),
    documentUrl: z.string().optional(),
    type: z.enum(['business', 'personal']).default('business'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    initialType?: 'income' | 'expense' | 'payable' | 'receivable';
    incomeCategories: IncomeCategory[];
    expenseCategories: ExpenseCategory[];
    companies: Company[];
    contacts: Contact[];
    taxTypes: TaxType[];
    onSuccess: () => void;
}

export function TransactionDialog({
    isOpen,
    onOpenChange,
    initialType = 'income',
    incomeCategories,
    expenseCategories,
    companies,
    contacts,
    taxTypes,
    onSuccess,
}: TransactionDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const { preferences } = useUserPreferences();
    const [isSaving, setIsSaving] = React.useState(false);
    const [transactionType, setTransactionType] = React.useState(initialType);
    
    // UI states
    const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
    const [isCompanyPopoverOpen, setIsCompanyPopoverOpen] = React.useState(false);
    const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = React.useState(false);
    const [isManageTaxDialogOpen, setIsManageTaxDialogOpen] = React.useState(false);
    const [companySearchValue, setCompanySearchValue] = React.useState("");
    const [categorySearchValue, setCategorySearchValue] = React.useState("");

    const form = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            company: "",
            description: "",
            quantity: 1,
            unitPrice: 0,
            taxType: "None",
            taxRate: preferences?.defaultTaxRate || 0,
            category: "",
            paymentMethod: "Bank Transfer",
            depositedTo: "Bank Account #1",
            explanation: "",
            documentNumber: "",
            documentUrl: "",
            type: "business",
        },
    });

    const watchQuantity = form.watch('quantity');
    const watchUnitPrice = form.watch('unitPrice');
    const watchTaxRate = form.watch('taxRate');
    const watchCategory = form.watch('category');

    const totals = React.useMemo(() => {
        const gross = (Number(watchQuantity) || 0) * (Number(watchUnitPrice) || 0);
        const net = gross / (1 + ((Number(watchTaxRate) || 0) / 100));
        const tax = gross - net;
        return { gross, net, tax };
    }, [watchQuantity, watchUnitPrice, watchTaxRate]);

    const activeCategories = (transactionType === 'income' || transactionType === 'receivable') ? incomeCategories : expenseCategories;
    const selectedCategory = activeCategories.find(c => c.categoryNumber === watchCategory || c.id === watchCategory);

    // High-Fidelity Contact Formatting: Name - Business
    const contactOptions = React.useMemo(() => {
        const standaloneCompanies = companies.map(c => ({ id: c.id, label: c.name, type: 'company' }));
        const individualContacts = contacts.map(c => ({
            id: c.id,
            label: c.businessName ? `${c.name} - ${c.businessName}` : c.name,
            type: 'contact'
        }));
        return [...standaloneCompanies, ...individualContacts].sort((a, b) => a.label.localeCompare(b.label));
    }, [companies, contacts]);

    React.useEffect(() => {
        if (isOpen) {
            setTransactionType(initialType);
            form.reset({
                date: format(new Date(), 'yyyy-MM-dd'),
                company: "",
                description: "",
                quantity: 1,
                unitPrice: 0,
                taxType: "None",
                taxRate: preferences?.defaultTaxRate || 0,
                category: "",
                paymentMethod: "Bank Transfer",
                depositedTo: "Bank Account #1",
                explanation: "",
                documentNumber: "",
                documentUrl: "",
                type: "business",
            });
        }
    }, [isOpen, initialType, form, preferences]);

    const handleCreateCompany = async (name: string) => {
        if (!user || !name.trim()) return;
        try {
            const newCompany = await addCompany({ name: name.trim(), userId: user.uid });
            form.setValue('company', newCompany.name);
            setIsCompanyPopoverOpen(false);
            setCompanySearchValue("");
            onSuccess();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    const handleCreateCategory = async (name: string) => {
        if (!user || !name.trim()) return;
        try {
            let newCat;
            if (transactionType === 'income' || transactionType === 'receivable') {
                newCat = await addIncomeCategory({ name: name.trim(), userId: user.uid });
            } else {
                newCat = await addExpenseCategory({ name: name.trim(), userId: user.uid });
            }
            form.setValue('category', newCat.categoryNumber || newCat.id);
            setIsCategoryPopoverOpen(false);
            setCategorySearchValue("");
            onSuccess();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    const handleSelectTaxType = (typeName: string) => {
        const type = taxTypes.find(t => t.name === typeName);
        if (type) {
            form.setValue('taxType', type.name);
            form.setValue('taxRate', type.rate);
        } else {
            form.setValue('taxType', 'None');
            form.setValue('taxRate', 0);
        }
    };

    async function onSubmit(values: TransactionFormData) {
        if (!user) return;
        setIsSaving(true);
        try {
            const baseData = {
                date: values.date,
                company: values.company,
                description: values.description || "",
                totalAmount: totals.gross,
                preTaxAmount: totals.net,
                taxAmount: totals.tax,
                taxRate: values.taxRate,
                taxType: values.taxType,
                explanation: values.explanation,
                documentNumber: values.documentNumber,
                documentUrl: values.documentUrl,
                type: values.type,
                userId: user.uid,
            };

            if (transactionType === 'income') {
                await addIncomeTransaction({
                    ...baseData,
                    incomeCategory: values.category,
                    depositedTo: values.depositedTo || 'Bank Account #1',
                    paymentMethod: values.paymentMethod || 'Bank Transfer',
                });
                toast({ title: 'Income Posted' });
            } else if (transactionType === 'expense') {
                await addExpenseTransaction({
                    ...baseData,
                    category: values.category,
                    paymentMethod: values.paymentMethod || 'Bank Transfer',
                });
                toast({ title: 'Expense Posted' });
            } else if (transactionType === 'payable') {
                await addPayableBill({
                    vendor: values.company,
                    dueDate: values.date,
                    totalAmount: totals.gross,
                    category: values.category,
                    description: values.description,
                    taxRate: values.taxRate,
                    taxType: values.taxType,
                    documentUrl: values.documentUrl,
                    userId: user.uid,
                });
                toast({ title: 'Payable Logged' });
            } else if (transactionType === 'receivable') {
                const contactMatch = contacts.find(c => c.name === values.company || (c.businessName && `${c.name} - ${c.businessName}` === values.company));
                await addInvoiceWithLineItems({
                    invoiceNumber: values.documentNumber || `INV-${Date.now().toString().slice(-6)}`,
                    companyName: values.company,
                    contactId: contactMatch?.id || 'unknown',
                    originalAmount: totals.gross,
                    amountPaid: 0,
                    dueDate: new Date(new Date(values.date).getTime() + 14 * 24 * 60 * 60 * 1000),
                    invoiceDate: new Date(values.date),
                    status: 'outstanding',
                    notes: values.explanation || "",
                    taxType: values.taxType || 'None',
                    userId: user.uid,
                }, [
                    {
                        invoiceId: '',
                        description: values.description || 'Service Rendered',
                        quantity: values.quantity,
                        price: values.unitPrice,
                        taxRate: values.taxRate,
                        taxType: values.taxType,
                        userId: user.uid
                    }
                ]);
                toast({ title: 'Receivable Logged' });
            }

            onSuccess();
            onOpenChange(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl flex flex-col max-h-[95vh] p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 shrink-0 border-b bg-muted/10">
                    <div className="flex items-center gap-3 text-primary mb-1">
                        <div className="p-2 bg-white rounded-lg shadow-sm border border-primary/10">
                            <Calculator className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-headline uppercase tracking-tight">Unified Transaction Entry</DialogTitle>
                            <DialogDescription>BKS System: High-Fidelity Data Orchestration</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1">
                    <Form {...form}>
                        <form id="transaction-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-6">
                            {/* Operational Context */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                                    <ShieldCheck className="h-4 w-4" />
                                    Operational Context
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3 p-4 border rounded-lg bg-muted/30">
                                                <FormLabel>Operational Mode</FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                        className="flex gap-4"
                                                    >
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl><RadioGroupItem value="business" /></FormControl>
                                                            <FormLabel className="font-normal">Business</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl><RadioGroupItem value="personal" /></FormControl>
                                                            <FormLabel className="font-normal">Personal</FormLabel>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="space-y-2">
                                        <Label>Entry Mode</Label>
                                        <Select value={transactionType} onValueChange={(v: any) => setTransactionType(v)}>
                                            <SelectTrigger className="h-12 border-2">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="income">Income (Post to GL)</SelectItem>
                                                <SelectItem value="expense">Expense (Post to GL)</SelectItem>
                                                <SelectItem value="receivable">Receivable (Log Invoice)</SelectItem>
                                                <SelectItem value="payable">Payable (Log Bill)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            {/* Identity & Timing */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                                    <ContactIcon className="h-4 w-4" />
                                    Identity & Timing
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Transaction Date</FormLabel>
                                                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant="outline" className={cn("h-12 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <CustomCalendar mode="single" selected={field.value ? parseISO(field.value) : undefined} onSelect={(d) => { if(d) field.onChange(format(d, 'yyyy-MM-dd')); setIsDatePickerOpen(false); }} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="company"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Contact Association (Name - Business)</FormLabel>
                                                <Popover open={isCompanyPopoverOpen} onOpenChange={setIsCompanyPopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant="outline" role="combobox" className="h-12 justify-between font-normal">
                                                                <span className="truncate">{field.value || "Select contact..."}</span>
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Search contact..." value={companySearchValue} onValueChange={setCompanySearchValue} />
                                                            <CommandList>
                                                                <CommandEmpty>
                                                                    <Button variant="ghost" className="w-full justify-start text-primary" onClick={() => handleCreateCompany(companySearchValue)}>
                                                                        <Plus className="mr-2 h-4 w-4" /> Create "{companySearchValue}"
                                                                    </Button>
                                                                </CommandEmpty>
                                                                <CommandGroup>
                                                                    {contactOptions.map(opt => (
                                                                        <CommandItem key={opt.id} onSelect={() => { field.onChange(opt.label); setIsCompanyPopoverOpen(false); }}>
                                                                            <Check className={cn("mr-2 h-4 w-4", field.value === opt.label ? "opacity-100" : "opacity-0")} />
                                                                            {opt.label}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>

                            <Separator />

                            {/* Categorization Section */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                                    <FileSignature className="h-4 w-4" />
                                    Tax Categorization
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="category"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>CRA Audit Category</FormLabel>
                                                <div className="flex gap-2">
                                                    <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant="outline" role="combobox" className="h-12 justify-between font-normal flex-1">
                                                                    <span className="truncate">{selectedCategory ? selectedCategory.name : "Select audit line..."}</span>
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                            <Command>
                                                                <CommandInput placeholder="Search CRA lines..." value={categorySearchValue} onValueChange={setCategorySearchValue} />
                                                                <CommandList>
                                                                    <CommandEmpty>
                                                                        <Button variant="ghost" className="w-full justify-start text-primary" onClick={() => handleCreateCategory(categorySearchValue)}>
                                                                            <Plus className="mr-2 h-4 w-4" /> Add custom: "{categorySearchValue}"
                                                                        </Button>
                                                                    </CommandEmpty>
                                                                    <CommandGroup>
                                                                        {activeCategories.map(cat => (
                                                                            <CommandItem key={cat.id} onSelect={() => { field.onChange(cat.categoryNumber || cat.id); setIsCategoryPopoverOpen(false); }}>
                                                                                <Check className={cn("mr-2 h-4 w-4", (field.value === cat.categoryNumber || field.value === cat.id) ? "opacity-100" : "opacity-0")} />
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-medium text-[10px] text-muted-foreground">LINE {cat.categoryNumber}</span>
                                                                                    <span className="text-sm">{cat.name}</span>
                                                                                </div>
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={() => handleCreateCategory('')}>
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="space-y-2">
                                        <Label>CRA Line # Mapping</Label>
                                        <div className="h-12 flex items-center px-4 rounded-md border-2 border-primary/20 bg-primary/5 font-mono font-bold text-primary">
                                            {selectedCategory?.categoryNumber || "None Assigned"}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            {/* Financial Details Section */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                                    <Landmark className="h-4 w-4" />
                                    Financial Precision
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" step="0.01" className="h-12" {...field} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="unitPrice" render={({ field }) => (<FormItem><FormLabel>Unit Price ($)</FormLabel><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span><FormControl><Input type="number" step="0.01" className="h-12 pl-7" {...field} /></FormControl></div></FormItem>)} />
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label>Select Tax Type</Label>
                                            <Button variant="link" size="sm" onClick={() => setIsManageTaxDialogOpen(true)} className="h-auto p-0 text-[10px] font-bold">Manage</Button>
                                        </div>
                                        <Select value={form.watch('taxType')} onValueChange={handleSelectTaxType}>
                                            <SelectTrigger className="h-12">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="None">None (0%)</SelectItem>
                                                {taxTypes.map(t => <SelectItem key={t.id} value={t.name}>{t.name} ({t.rate}%)</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <FormField control={form.control} name="taxRate" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tax Rate (%)</FormLabel>
                                            <div className="relative">
                                                <FormControl><Input type="number" step="0.01" className="h-12 pr-8" {...field} /></FormControl>
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">%</span>
                                            </div>
                                        </FormItem>
                                    )} />
                                </div>

                                {/* Calculation Summary Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border-2 border-primary/10 bg-primary/5">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Gross Total</p>
                                        <p className="text-2xl font-mono font-bold text-primary">${totals.gross.toFixed(2)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Net (Pre-Tax)</p>
                                        <p className="text-xl font-mono font-semibold text-foreground/70">${totals.net.toFixed(2)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Tax Portion</p>
                                        <p className="text-xl font-mono font-semibold text-foreground/70">${totals.tax.toFixed(2)}</p>
                                    </div>
                                </div>
                            </section>

                            <Separator />

                            {/* Logistics & Routing */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                                    <Clock className="h-4 w-4" />
                                    Operational Routing
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                                        <FormItem><FormLabel>Payment Method</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-12"><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                            {["Bank Transfer", "Credit Card", "Cash", "Cheque", "Email Transfer", "GL Adjustment"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                        </SelectContent></Select></FormItem>
                                    )} />
                                    <FormField control={form.control} name="depositedTo" render={({ field }) => (
                                        <FormItem><FormLabel>{transactionType === 'income' ? 'Deposited To' : 'Paid From'}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-12"><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                            {["Bank Account #1", "Credit Card #1", "Cash Account", "Trust Account"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                        </SelectContent></Select></FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="documentNumber" render={({ field }) => (<FormItem><FormLabel>Doc / Invoice #</FormLabel><FormControl><Input placeholder="e.g., INV-1001" className="h-12" {...field} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="documentUrl" render={({ field }) => (<FormItem><FormLabel>Digital Evidence Link</FormLabel><FormControl><Input placeholder="https://drive.google.com/..." className="h-12" {...field} /></FormControl></FormItem>)} />
                                </div>
                                <FormField control={form.control} name="explanation" render={({ field }) => (
                                    <FormItem><FormLabel>Audit Notes / Internal Reason</FormLabel><FormControl><Textarea placeholder="Explain the business purpose of this entry..." rows={3} {...field} /></FormControl></FormItem>
                                )} />
                            </section>
                        </form>
                    </Form>
                </ScrollArea>

                <DialogFooter className="p-6 border-t bg-muted/10 shrink-0 sm:justify-between items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground italic font-medium">
                        <Info className="h-3 w-3 text-primary" />
                        One-click BKS Ledger synchronization
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                        <Button type="submit" form="transaction-form" className="flex-1 sm:flex-initial h-12 px-8 text-lg font-bold shadow-lg" disabled={isSaving}>
                            {isSaving ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                            {transactionType === 'payable' || transactionType === 'receivable' ? 'Log Promise' : 'Post Transaction'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <ManageTaxTypesDialog
            isOpen={isManageTaxDialogOpen}
            onOpenChange={setIsManageTaxDialogOpen}
            taxTypes={taxTypes}
            onTaxTypesChange={() => onSuccess()}
        />
        </>
    );
}