'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Clock, 
    Landmark, 
    FileSignature, 
    Calculator, 
    Settings, 
    Check, 
    ChevronsUpDown, 
    Plus,
    Calendar as CalendarIcon,
    ShieldCheck,
    Contact as ContactIcon,
    Save,
    LoaderCircle,
    Info,
    Percent,
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
            taxRate: 0,
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
                taxRate: 0,
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
            toast({ title: "Custom Category Created", description: `"${name}" added to your tax lines.` });
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
            <DialogContent className="sm:max-w-5xl flex flex-col max-h-[95vh] p-0 overflow-hidden">
                <DialogHeader className="p-6 shrink-0 border-b bg-muted/10 text-center">
                    <div className="flex flex-col items-center gap-2 text-primary">
                        <Calculator className="h-8 w-8" />
                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-headline uppercase tracking-tight">Unified Transaction Entry</DialogTitle>
                            <DialogDescription className="text-sm">Precision BKS Financial Orchestration</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1">
                    <Form {...form}>
                        <form id="transaction-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3 p-4 border rounded-xl bg-muted/30">
                                            <FormLabel className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4" /> Transaction Mode
                                            </FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-6">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="business" id="mode-biz"/>
                                                        <Label htmlFor="mode-biz" className="font-semibold cursor-pointer">Business Operations</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="personal" id="mode-pers"/>
                                                        <Label htmlFor="mode-pers" className="font-semibold cursor-pointer">Personal Account</Label>
                                                    </div>
                                                </RadioGroup>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <div className="space-y-2">
                                    <Label className="text-sm uppercase font-bold text-primary">Entry Type</Label>
                                    <Select value={transactionType} onValueChange={(v: any) => setTransactionType(v)}>
                                        <SelectTrigger className="h-12 text-base">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="income">Income (Post directly to General Ledger)</SelectItem>
                                            <SelectItem value="expense">Expense (Post directly to General Ledger)</SelectItem>
                                            <SelectItem value="receivable">Receivable (Log outstanding Invoice)</SelectItem>
                                            <SelectItem value="payable">Payable (Log outstanding Bill)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                                <CalendarIcon className="h-4 w-4" /> Transaction Date
                                            </FormLabel>
                                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" className={cn("h-11 w-full text-left font-normal px-3", !field.value && "text-muted-foreground")}>
                                                            {field.value ? format(parseISO(field.value), "PPP") : "Pick a date"}
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
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                                <ContactIcon className="h-4 w-4" /> Contact Association
                                            </FormLabel>
                                            <Popover open={isCompanyPopoverOpen} onOpenChange={setIsCompanyPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button variant="outline" role="combobox" className="h-11 w-full justify-between font-normal px-3">
                                                            <span className="truncate">{field.value || "Select/Add Contact"}</span>
                                                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Search name or business..." value={companySearchValue} onValueChange={setCompanySearchValue} />
                                                        <CommandList>
                                                            <CommandEmpty>
                                                                <Button variant="ghost" className="w-full justify-start text-sm text-primary" onClick={() => handleCreateCompany(companySearchValue)}>
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
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                                <FileSignature className="h-4 w-4" /> Audit Category
                                            </FormLabel>
                                            <div className="flex gap-2">
                                                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant="outline" role="combobox" className="h-11 flex-1 justify-between font-normal px-3">
                                                                <span className="truncate">{selectedCategory ? selectedCategory.name : "Select tax line..."}</span>
                                                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Search standard categories..." value={categorySearchValue} onValueChange={setCategorySearchValue} />
                                                            <CommandList>
                                                                <CommandEmpty>
                                                                    <Button variant="ghost" className="w-full justify-start text-sm text-primary" onClick={() => handleCreateCategory(categorySearchValue)}>
                                                                        <Plus className="mr-2 h-4 w-4" /> Create "{categorySearchValue}"
                                                                    </Button>
                                                                </CommandEmpty>
                                                                <CommandGroup>
                                                                    {activeCategories.map(cat => (
                                                                        <CommandItem key={cat.id} onSelect={() => { field.onChange(cat.categoryNumber || cat.id); setIsCategoryPopoverOpen(false); }}>
                                                                            <Check className={cn("mr-2 h-4 w-4", (field.value === cat.categoryNumber || field.value === cat.id) ? "opacity-100" : "opacity-0")} />
                                                                            <div className="flex flex-col">
                                                                                <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">CRA Line {cat.categoryNumber}</span>
                                                                                <span className="text-sm">{cat.name}</span>
                                                                            </div>
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={() => handleCreateCategory(categorySearchValue)} title="Create New Category">
                                                    <Plus className="h-5 w-5" />
                                                </Button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Separator />

                            <div className="p-6 border-2 border-primary/10 rounded-2xl space-y-6 bg-primary/5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="quantity"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Quantity</FormLabel>
                                                <FormControl><Input type="number" step="0.01" className="h-11 font-mono font-bold" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="unitPrice"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Unit Price ($)</FormLabel>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
                                                    <FormControl><Input type="number" step="0.01" className="h-11 pl-8 font-mono font-bold" {...field} /></FormControl>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Select Tax Type</Label>
                                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setIsManageTaxDialogOpen(true)}><Settings className="h-3 w-3"/></Button>
                                        </div>
                                        <Select value={form.watch('taxType')} onValueChange={handleSelectTaxType}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Tax logic..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="None">No Tax Applied</SelectItem>
                                                {taxTypes.map(t => <SelectItem key={t.id} value={t.name}>{t.name} ({t.rate}%)</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex flex-wrap justify-between items-center gap-4 px-8 py-4 rounded-xl bg-white border border-primary/20 shadow-inner">
                                    <div className="text-center min-w-[120px]">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Gross Total</p>
                                        <p className="font-mono text-2xl font-bold text-primary">${totals.gross.toFixed(2)}</p>
                                    </div>
                                    <Separator orientation="vertical" className="h-12 hidden md:block" />
                                    <div className="text-center min-w-[120px]">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Net (Pre-Tax)</p>
                                        <p className="font-mono text-xl font-semibold text-foreground/70">${totals.net.toFixed(2)}</p>
                                    </div>
                                    <Separator orientation="vertical" className="h-12 hidden md:block" />
                                    <div className="text-center min-w-[120px]">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Tax Portion ({form.watch('taxRate')}%)</p>
                                        <p className="font-mono text-xl font-semibold text-foreground/70">${totals.tax.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="paymentMethod"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                                    <Clock className="h-4 w-4" /> Settlement Method
                                                </FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {["Bank Transfer", "Credit Card", "Cash", "Cheque", "Email Transfer", "GL Adjustment"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="depositedTo"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                                    <Landmark className="h-4 w-4" /> Ledger Routing
                                                </FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {["Bank Account #1", "Credit Card #1", "Cash Account", "Trust Account"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="documentNumber"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm uppercase font-bold text-primary">Doc / Invoice #</FormLabel>
                                                <FormControl><Input placeholder="e.g., INV-2024-001" className="h-11" {...field} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="documentUrl"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm uppercase font-bold text-primary">Digital Evidence Link</FormLabel>
                                                <FormControl><Input placeholder="https://drive.google.com/..." className="h-11" {...field} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-sm uppercase font-bold text-primary">Short Description</FormLabel>
                                            <FormControl><Input placeholder="Transaction summary..." className="h-11" {...field} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="explanation"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-sm uppercase font-bold text-primary">Audit Rationale (Notes)</FormLabel>
                                            <FormControl><Textarea placeholder="Explain the business purpose for audit records..." rows={1} className="resize-none" {...field} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </form>
                    </Form>
                </ScrollArea>

                <DialogFooter className="p-6 border-t bg-muted/10 shrink-0 sm:justify-between items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground italic font-medium max-w-md">
                        <Info className="h-4 w-4 text-primary" />
                        Records will be instantly synchronized with the Ogeemo BKS database.
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                        <Button type="submit" form="transaction-form" className="h-12 px-10 font-bold shadow-xl text-lg" disabled={isSaving}>
                            {isSaving ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                            {transactionType === 'payable' || transactionType === 'receivable' ? 'Log Financial Promise' : 'Post to General Ledger'}
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