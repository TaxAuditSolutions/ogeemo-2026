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
    Wallet,
    X,
    Pencil,
    Trash2
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
    getInternalAccounts,
    addInternalAccount,
    deleteInternalAccount,
    updateIncomeTransaction,
    updateExpenseTransaction,
    updatePayableBill,
    type IncomeCategory,
    type ExpenseCategory,
    type Company,
    type TaxType,
    type InternalAccount
} from '@/services/accounting-service';
import { type Contact } from '@/services/contact-service';
import { ManageTaxTypesDialog } from './manage-tax-types-dialog';

const transactionSchema = z.object({
    date: z.string().min(1, "Date is required."),
    company: z.string().min(1, "Contact selection is required."),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.01, "Quantity must be at least 0.01"),
    unitPrice: z.coerce.string(),
    taxType: z.string().optional(),
    taxRate: z.coerce.number().min(0, "Tax rate cannot be negative"),
    category: z.string().min(1, "Category is required."),
    paymentMethod: z.string().optional(),
    account: z.string().min(1, "Account selection is required."),
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
    transactionToEdit?: any | null;
}

/**
 * Helper to format a string or number with thousands separators (commas).
 */
const formatNumberWithCommas = (value: string | number) => {
  if (value === undefined || value === null || value === "") return "";
  const sValue = String(value).replace(/,/g, "");
  const parts = sValue.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

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
    transactionToEdit = null,
}: TransactionDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const { preferences } = useUserPreferences();
    const [isSaving, setIsSaving] = React.useState(false);
    const [transactionType, setTransactionType] = React.useState(initialType);
    const [internalAccounts, setInternalAccounts] = React.useState<InternalAccount[]>([]);
    
    const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
    const [isCompanyPopoverOpen, setIsCompanyPopoverOpen] = React.useState(false);
    const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = React.useState(false);
    const [isAccountPopoverOpen, setIsAccountPopoverOpen] = React.useState(false);
    const [isManageTaxDialogOpen, setIsManageTaxDialogOpen] = React.useState(false);
    
    const [companySearchValue, setCompanySearchValue] = React.useState("");
    const [categorySearchValue, setCategorySearchValue] = React.useState("");
    const [accountSearchValue, setAccountSearchValue] = React.useState("");
    const [accountToDelete, setAccountToDelete] = React.useState<InternalAccount | null>(null);

    const form = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            date: "",
            company: "",
            description: "",
            quantity: 1,
            unitPrice: "",
            taxType: "None",
            taxRate: preferences?.defaultTaxRate || 0,
            category: "",
            paymentMethod: "Bank Transfer",
            account: "",
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
    const watchAccount = form.watch('account');

    const totals = React.useMemo(() => {
        const cleanPrice = String(watchUnitPrice || "0").replace(/,/g, '');
        const gross = (Number(watchQuantity) || 0) * (Number(cleanPrice) || 0);
        const net = gross / (1 + ((Number(watchTaxRate) || 0) / 100));
        const tax = gross - net;
        return { gross, net, tax };
    }, [watchQuantity, watchUnitPrice, watchTaxRate]);

    const loadInternalAccounts = React.useCallback(async () => {
        if (!user) return;
        try {
            const accounts = await getInternalAccounts(user.uid);
            setInternalAccounts(accounts);
        } catch (e) {}
    }, [user]);

    const activeCategories = React.useMemo(() => {
        const raw = (transactionType === 'income' || transactionType === 'receivable') ? incomeCategories : expenseCategories;
        const seen = new Set<string>();
        return raw.filter(cat => {
            const key = cat.categoryNumber || cat.name;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [transactionType, incomeCategories, expenseCategories]);

    const selectedCategory = activeCategories.find(c => c.categoryNumber === watchCategory || c.id === watchCategory);
    const selectedAccount = internalAccounts.find(a => a.id === watchAccount || a.name === watchAccount);

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
            loadInternalAccounts();
            
            if (transactionToEdit) {
                const isIncome = !!transactionToEdit.incomeCategory;
                const isPayable = !isIncome && 'vendor' in transactionToEdit;
                const type = isIncome ? 'income' : isPayable ? 'payable' : 'expense';
                setTransactionType(type);

                form.reset({
                    date: transactionToEdit.date,
                    company: transactionToEdit.company || transactionToEdit.vendor,
                    description: transactionToEdit.description || "",
                    quantity: transactionToEdit.quantity || 1,
                    unitPrice: String(transactionToEdit.unitPrice || transactionToEdit.totalAmount),
                    taxType: transactionToEdit.taxType || "None",
                    taxRate: transactionToEdit.taxRate || 0,
                    category: transactionToEdit.incomeCategory || transactionToEdit.category,
                    paymentMethod: transactionToEdit.paymentMethod || "Bank Transfer",
                    account: transactionToEdit.depositedTo || transactionToEdit.paidFrom || "",
                    explanation: transactionToEdit.explanation || "",
                    documentNumber: transactionToEdit.documentNumber || transactionToEdit.invoiceNumber || "",
                    documentUrl: transactionToEdit.documentUrl || "",
                    type: transactionToEdit.type || "business",
                });
            } else {
                setTransactionType(initialType);
                form.reset({
                    date: format(new Date(), 'yyyy-MM-dd'),
                    company: "",
                    description: "",
                    quantity: 1,
                    unitPrice: "",
                    taxType: "None",
                    taxRate: preferences?.defaultTaxRate || 0,
                    category: "",
                    paymentMethod: "Bank Transfer",
                    account: "",
                    explanation: "",
                    documentNumber: "",
                    documentUrl: "",
                    type: "business",
                });
            }
        }
    }, [isOpen, initialType, form, loadInternalAccounts, preferences, transactionToEdit]);

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

    const handleCreateAccount = async (name: string) => {
        if (!user || !name.trim()) return;
        try {
            const newAcc = await addInternalAccount({ 
                name: name.trim(), 
                userId: user.uid, 
                type: 'Bank' 
            });
            setInternalAccounts(prev => [...prev, newAcc]);
            form.setValue('account', newAcc.name);
            setIsAccountPopoverOpen(false);
            setAccountSearchValue("");
            toast({ title: "Account Created", description: `"${name}" added to your registry.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    const handleDeleteAccount = async () => {
        if (!accountToDelete) return;
        try {
            await deleteInternalAccount(accountToDelete.id);
            setInternalAccounts(prev => prev.filter(a => a.id !== accountToDelete.id));
            if (form.getValues('account') === accountToDelete.name) {
                form.setValue('account', '');
            }
            toast({ title: 'Account Deleted' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
        } finally {
            setAccountToDelete(null);
        }
    };

    const handleSelectTaxType = (id: string) => {
        const type = taxTypes.find(t => t.id === id);
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
                quantity: values.quantity,
                unitPrice: Number(values.unitPrice.replace(/,/g, '')),
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

            if (transactionToEdit) {
                if (transactionType === 'income') {
                    await updateIncomeTransaction(transactionToEdit.id, {
                        ...baseData,
                        incomeCategory: values.category,
                        depositedTo: values.account,
                        paymentMethod: values.paymentMethod || 'Bank Transfer',
                    });
                } else if (transactionType === 'expense') {
                    await updateExpenseTransaction(transactionToEdit.id, {
                        ...baseData,
                        category: values.category,
                        paidFrom: values.account,
                        paymentMethod: values.paymentMethod || 'Bank Transfer',
                    });
                } else if (transactionType === 'payable') {
                    await updatePayableBill(transactionToEdit.id, {
                        vendor: values.company,
                        dueDate: values.date,
                        totalAmount: totals.gross,
                        category: values.category,
                        description: values.description,
                        taxRate: values.taxRate,
                        taxType: values.taxType,
                        documentUrl: values.documentUrl,
                    });
                }
                toast({ title: 'Record Updated' });
            } else {
                if (transactionType === 'income') {
                    await addIncomeTransaction({
                        ...baseData,
                        incomeCategory: values.category,
                        depositedTo: values.account,
                        paymentMethod: values.paymentMethod || 'Bank Transfer',
                    });
                    toast({ title: 'Income Posted' });
                } else if (transactionType === 'expense') {
                    await addExpenseTransaction({
                        ...baseData,
                        category: values.category,
                        paidFrom: values.account,
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
                            price: Number(values.unitPrice.replace(/,/g, '')),
                            taxRate: values.taxRate,
                            taxType: values.taxType,
                            userId: user.uid
                        }
                    ]);
                    toast({ title: 'Receivable Logged' });
                }
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
        <React.Fragment>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-none w-screen h-screen flex flex-col p-0 rounded-none overflow-hidden text-black bg-background">
                    <DialogHeader className="p-6 shrink-0 border-b bg-muted/10">
                        <div className="flex flex-col items-center gap-2 text-primary relative">
                            <Calculator className="h-10 w-10" />
                            <div className="space-y-1 text-center">
                                <DialogTitle className="text-3xl font-headline uppercase tracking-tight">
                                    {transactionToEdit ? 'Update Transaction Details' : 'Unified Transaction Entry'}
                                </DialogTitle>
                                <DialogDescription className="text-base">Precision BKS Financial Orchestration Hub</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="flex-1 bg-white">
                        <Form {...form}>
                            <form id="transaction-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-12 max-w-6xl mx-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3 p-6 border rounded-2xl bg-muted/30">
                                                <FormLabel className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                                    <ShieldCheck className="h-4 w-4" /> Transaction Mode
                                                </FormLabel>
                                                <FormControl>
                                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} value={field.value} className="flex gap-8">
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem value="business" id="mode-biz" className="h-5 w-5" />
                                                            <Label htmlFor="mode-biz" className="text-base font-semibold cursor-pointer">Business Operations</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem value="personal" id="mode-pers" className="h-5 w-5" />
                                                            <Label htmlFor="mode-pers" className="text-base font-semibold cursor-pointer">Personal Account</Label>
                                                        </div>
                                                    </RadioGroup>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="space-y-2">
                                        <Label className="text-sm uppercase font-bold text-primary">Entry Type</Label>
                                        <Select value={transactionType} onValueChange={(v: any) => setTransactionType(v)} disabled={!!transactionToEdit}>
                                            <SelectTrigger className="h-14 text-lg font-medium">
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

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                                                            <Button variant="outline" className={cn("h-12 w-full text-left font-normal px-4 text-base", !field.value && "text-muted-foreground")}>
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
                                                            <Button variant="outline" role="combobox" className="h-12 w-full justify-between font-normal px-4 text-base">
                                                                <span className="truncate">{field.value || "Select/Add Contact"}</span>
                                                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                        <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                                            <CommandInput placeholder="Search name or business..." value={companySearchValue} onValueChange={setCompanySearchValue} />
                                                            <CommandList>
                                                                <CommandEmpty>
                                                                    <Button variant="ghost" className="w-full justify-start text-sm text-primary" onClick={() => handleCreateCompany(companySearchValue)}>
                                                                        <Plus className="mr-2 h-4 w-4" /> Create "{companySearchValue}"
                                                                    </Button>
                                                                </CommandEmpty>
                                                                <CommandGroup>
                                                                    {contactOptions.map(opt => (
                                                                        <CommandItem key={opt.id} value={opt.label} onSelect={() => { field.onChange(opt.label); setIsCompanyPopoverOpen(false); }}>
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
                                                    <FileSignature className="h-4 w-4" /> Category Line Item
                                                </FormLabel>
                                                <div className="flex gap-2">
                                                    <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant="outline" role="combobox" className="h-12 flex-1 justify-between font-normal px-4 text-base">
                                                                    <span className="truncate">{selectedCategory ? selectedCategory.name : "Select/Add tax line..."}</span>
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                            <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                                                <CommandInput placeholder="Search standard categories..." value={categorySearchValue} onValueChange={setCategorySearchValue} />
                                                                <CommandList>
                                                                    <CommandEmpty>
                                                                        <Button variant="ghost" className="w-full justify-start text-sm text-primary" onClick={() => handleCreateCategory(categorySearchValue)}>
                                                                            <Plus className="mr-2 h-4 w-4" /> Create "{categorySearchValue}"
                                                                        </Button>
                                                                    </CommandEmpty>
                                                                    <CommandGroup>
                                                                        {activeCategories.map(cat => (
                                                                            <CommandItem key={cat.id} value={`${cat.name} ${cat.categoryNumber || ''}`} onSelect={() => { field.onChange(cat.categoryNumber || cat.id); setIsCategoryPopoverOpen(false); }}>
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
                                                    <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={() => handleCreateCategory(categorySearchValue)} title="Create New Category">
                                                        <Plus className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="p-8 border-2 border-primary/10 rounded-3xl space-y-8 bg-primary/5 shadow-inner">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                                        <FormField
                                            control={form.control}
                                            name="quantity"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Quantity</FormLabel>
                                                    <FormControl><Input type="number" step="0.01" className="h-12 text-lg font-mono font-bold" {...field} /></FormControl>
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
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-lg">$</span>
                                                        <FormControl>
                                                            <Input 
                                                                type="text" 
                                                                className="h-12 pl-10 text-lg font-mono font-bold" 
                                                                {...field}
                                                                value={formatNumberWithCommas(field.value)}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/,/g, '');
                                                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                                        field.onChange(val);
                                                                    }
                                                                }}
                                                            />
                                                        </FormControl>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Sales Tax Configuration</Label>
                                                <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsManageTaxDialogOpen(true)}><Settings className="h-4 w-4"/></Button>
                                            </div>
                                            <Select 
                                                value={taxTypes.find(t => t.name === form.watch('taxType'))?.id || "None"} 
                                                onValueChange={handleSelectTaxType}
                                            >
                                                <SelectTrigger className="h-12 text-base">
                                                    <SelectValue placeholder="Select tax type..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="None">No Tax Applied</SelectItem>
                                                    {taxTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.rate}%)</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap justify-around items-center gap-8 px-10 py-8 rounded-2xl bg-white border-2 border-primary/20 shadow-xl">
                                        <div className="text-center">
                                            <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest mb-2">Gross Total</p>
                                            <p className="font-mono text-4xl font-bold text-primary">${totals.gross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="hidden md:block h-16 w-px bg-muted" />
                                        <div className="text-center">
                                            <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest mb-2">Net (Pre-Tax)</p>
                                            <p className="font-mono text-3xl font-semibold text-foreground/70">${totals.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="hidden md:block h-16 w-px bg-muted" />
                                        <div className="text-center">
                                            <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest mb-2">Tax Portion ({form.watch('taxRate')}%)</p>
                                            <p className="font-mono text-3xl font-semibold text-foreground/70">${totals.tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <h3 className="text-sm uppercase font-bold text-primary flex items-center gap-2 border-b pb-2">
                                            <Wallet className="h-4 w-4" /> Financial Routing
                                        </h3>
                                        <FormField
                                            control={form.control}
                                            name="account"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <FormLabel className="text-sm font-semibold">
                                                        {transactionType === 'income' || transactionType === 'receivable' ? 'Deposited To' : 'Paid From'} Account *
                                                    </FormLabel>
                                                    <div className="flex gap-2">
                                                        <Popover open={isAccountPopoverOpen} onOpenChange={setIsAccountPopoverOpen}>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button variant="outline" role="combobox" className="h-12 flex-1 justify-between font-normal px-4 text-base">
                                                                        <span className="truncate">{selectedAccount ? selectedAccount.name : "Search or add account..."}</span>
                                                                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                                <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                                                    <CommandInput placeholder="Search bank, card, or cash..." value={accountSearchValue} onValueChange={setAccountSearchValue} />
                                                                    <CommandList>
                                                                        <CommandEmpty>
                                                                            <Button variant="ghost" className="w-full justify-start text-sm text-primary" onClick={() => handleCreateAccount(accountSearchValue)}>
                                                                                <Plus className="mr-2 h-4 w-4" /> Create "{accountSearchValue}"
                                                                            </Button>
                                                                        </CommandEmpty>
                                                                        <CommandGroup>
                                                                            {internalAccounts.map(acc => (
                                                                                <CommandItem 
                                                                                    key={acc.id} 
                                                                                    value={acc.name} 
                                                                                    onSelect={() => { field.onChange(acc.name); setIsAccountPopoverOpen(false); }}
                                                                                    className="flex justify-between items-center group cursor-pointer"
                                                                                >
                                                                                    <div className="flex items-center">
                                                                                        <Check className={cn("mr-2 h-4 w-4", field.value === acc.name ? "opacity-100" : "opacity-0")} />
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-sm font-semibold">{acc.name}</span>
                                                                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{acc.type}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setAccountToDelete(acc);
                                                                                        }}
                                                                                    >
                                                                                        <Trash2 className="h-3 w-3" />
                                                                                    </Button>
                                                                                </CommandItem>
                                                                            ))}
                                                                        </CommandGroup>
                                                                    </CommandList>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                        <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={() => handleCreateAccount(accountSearchValue)} title="Add Account">
                                                            <Plus className="h-5 w-5" />
                                                        </Button>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="paymentMethod"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <FormLabel className="text-sm font-semibold">Settlement Method</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {["Bank Transfer", "Credit Card", "Cash", "Cheque", "Email Transfer", "GL Adjustment"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-sm uppercase font-bold text-primary flex items-center gap-2 border-b pb-2">
                                            <Landmark className="h-4 w-4" /> Audit Evidence
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="documentNumber"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-2">
                                                        <FormLabel className="text-sm font-semibold">Doc / Invoice #</FormLabel>
                                                        <FormControl><Input placeholder="e.g., INV-2024-001" className="h-12 text-base" {...field} /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="documentUrl"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-2">
                                                        <FormLabel className="text-sm font-semibold">Digital Proof Link</FormLabel>
                                                        <FormControl><Input placeholder="https://drive.google.com/..." className="h-12 text-base" {...field} /></FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <FormLabel className="text-sm font-semibold">Short Summary</FormLabel>
                                                    <FormControl><Input placeholder="Line item summary..." className="h-12 text-base" {...field} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="explanation"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-sm uppercase font-bold text-primary flex items-center gap-2">
                                                <Info className="h-4 w-4" /> Audit Rationale (Internal Memo)
                                            </FormLabel>
                                            <FormControl><Textarea placeholder="Explain the business purpose of this transaction for audit records..." rows={4} className="text-base leading-relaxed" {...field} /></FormControl>
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    </ScrollArea>

                    <DialogFooter className="p-8 border-t bg-muted/10 shrink-0 flex flex-col sm:flex-row sm:justify-between items-center gap-6">
                        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground italic font-medium max-w-2xl">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                            </div>
                            <span>Finalizing this entry will immediately synchronize with the BKS General Ledger and update your financial snapshots.</span>
                        </div>
                        <div className="flex gap-4 w-full sm:w-auto">
                            <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)} disabled={isSaving} className="h-12 px-8">Cancel</Button>
                            <Button type="submit" form="transaction-form" size="lg" className="h-14 px-16 font-bold shadow-2xl text-xl" disabled={isSaving}>
                                {isSaving ? <LoaderCircle className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />}
                                {transactionToEdit ? 'Save Changes' : (transactionType === 'payable' || transactionType === 'receivable' ? 'Log Financial Promise' : 'Post to General Ledger')}
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

            <AlertDialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the account node <strong className="font-bold">"{accountToDelete?.name}"</strong>. 
                            Existing ledger entries will retain their text-based record of this account, but it will no longer be available for new transactions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                            Delete Account Node
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </React.Fragment>
    );
}
