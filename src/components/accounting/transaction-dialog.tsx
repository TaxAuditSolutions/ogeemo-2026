'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
    LoaderCircle, 
    Check, 
    ChevronsUpDown, 
    Plus, 
    Calendar as CalendarIcon,
    UserPlus,
    PlusCircle,
    Info,
    FileSignature,
    Settings,
    Percent
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { 
    addIncomeTransaction, 
    updateIncomeTransaction, 
    addExpenseTransaction, 
    updateExpenseTransaction,
    addPayableBill,
    addInvoiceWithLineItems,
    addCompany,
    addIncomeCategory,
    addExpenseCategory,
    type IncomeTransaction,
    type ExpenseTransaction,
    type Company,
    type ExpenseCategory,
    type IncomeCategory,
    type TaxType
} from '@/services/accounting-service';
import { type Contact } from '@/services/contact-service';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { ManageTaxTypesDialog } from './manage-tax-types-dialog';

const transactionSchema = z.object({
    date: z.string().min(1, "Date is required."),
    company: z.string().min(1, "Contact is required."),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.01, "Quantity must be positive."),
    unitPrice: z.coerce.number().min(0, "Unit price must be non-negative."),
    taxType: z.string().optional(),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    category: z.string().min(1, "Category is required."),
    explanation: z.string().optional(),
    documentNumber: z.string().optional(),
    documentUrl: z.string().optional(),
    type: z.enum(['business', 'personal']),
    paymentMethod: z.string().optional(),
    depositedTo: z.string().optional(),
    paymentStatus: z.enum(['paid', 'unpaid']),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    transactionToEdit?: any | null;
    initialType?: 'income' | 'expense';
    initialPaymentStatus?: 'paid' | 'unpaid';
    contacts: Contact[];
    companies: Company[];
    incomeCategories: IncomeCategory[];
    expenseCategories: ExpenseCategory[];
    taxTypes: TaxType[];
    onTaxTypesChange: (taxTypes: TaxType[]) => void;
    onSuccess: () => void;
    onOpenContactForm: () => void;
}

const paymentMethodOptions = ["Cash", "Cheque", "Credit Card", "Email Transfer", "Bank Transfer", "In Kind", "Miscellaneous", "GL Adjustment"];
const defaultDepositAccounts = ["Bank Account #1", "Credit Card #1", "Cash Account"];

export function TransactionDialog({
    isOpen,
    onOpenChange,
    transactionToEdit,
    initialType = 'income',
    initialPaymentStatus = 'paid',
    contacts,
    companies,
    incomeCategories,
    expenseCategories,
    taxTypes,
    onTaxTypesChange,
    onSuccess,
    onOpenContactForm,
}: TransactionDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const { preferences, updatePreferences } = useUserPreferences();
    const [transactionType, setTransactionType] = React.useState<'income' | 'expense'>(initialType);
    const [isSaving, setIsSaving] = React.useState(false);
    
    const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
    const [isContactPopoverOpen, setIsContactPopoverOpen] = React.useState(false);
    const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = React.useState(false);
    const [showAddCategory, setShowAddCategory] = React.useState(false);
    const [newCategoryName, setNewCategoryName] = React.useState('');
    const [isManageTaxDialogOpen, setIsManageTaxDialogOpen] = React.useState(false);

    const form = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            company: '',
            description: '',
            quantity: 1,
            unitPrice: 0,
            taxType: 'None',
            taxRate: preferences?.defaultTaxRate ?? 15,
            category: '',
            type: 'business',
            paymentMethod: 'Bank Transfer',
            depositedTo: 'Bank Account #1',
            paymentStatus: initialPaymentStatus,
        },
    });

    const watchQuantity = form.watch('quantity');
    const watchUnitPrice = form.watch('unitPrice');
    const watchTaxRate = form.watch('taxRate');
    const watchCategory = form.watch('category');

    const totals = React.useMemo(() => {
        const qty = parseFloat(String(watchQuantity)) || 0;
        const price = parseFloat(String(watchUnitPrice)) || 0;
        const rate = parseFloat(String(watchTaxRate)) || 0;
        const total = qty * price;
        const preTax = total / (1 + rate / 100);
        const tax = total - preTax;
        return { total, preTax, tax };
    }, [watchQuantity, watchUnitPrice, watchTaxRate]);

    const currentCategories = React.useMemo(() => 
        transactionType === 'income' ? incomeCategories : expenseCategories
    , [transactionType, incomeCategories, expenseCategories]);

    const categoryNumberDisplay = React.useMemo(() => {
        const cat = currentCategories.find(c => c.id === watchCategory || c.categoryNumber === watchCategory);
        return cat?.categoryNumber || '';
    }, [currentCategories, watchCategory]);

    React.useEffect(() => {
        if (isOpen) {
            if (transactionToEdit) {
                setTransactionType(transactionToEdit.transactionType || initialType);
                const catNum = transactionToEdit.transactionType === 'income' ? transactionToEdit.incomeCategory : transactionToEdit.category;
                form.reset({
                    date: transactionToEdit.date,
                    company: transactionToEdit.company,
                    description: transactionToEdit.description || '',
                    quantity: transactionToEdit.quantity || 1,
                    unitPrice: transactionToEdit.unitPrice || transactionToEdit.totalAmount,
                    taxType: transactionToEdit.taxType || 'None',
                    taxRate: transactionToEdit.taxRate ?? preferences?.defaultTaxRate ?? 0,
                    category: catNum || '',
                    type: transactionToEdit.type || 'business',
                    paymentMethod: transactionToEdit.paymentMethod || 'Bank Transfer',
                    depositedTo: transactionToEdit.depositedTo || 'Bank Account #1',
                    paymentStatus: initialPaymentStatus,
                    explanation: transactionToEdit.explanation || '',
                    documentNumber: transactionToEdit.documentNumber || '',
                    documentUrl: transactionToEdit.documentUrl || '',
                });
            } else {
                setTransactionType(initialType);
                form.reset({
                    date: format(new Date(), 'yyyy-MM-dd'),
                    company: '',
                    description: '',
                    quantity: 1,
                    unitPrice: 0,
                    taxType: 'None',
                    taxRate: preferences?.defaultTaxRate ?? 15,
                    category: '',
                    type: 'business',
                    paymentMethod: 'Bank Transfer',
                    depositedTo: 'Bank Account #1',
                    paymentStatus: initialPaymentStatus,
                });
            }
        }
    }, [isOpen, transactionToEdit, initialType, initialPaymentStatus, form, preferences]);

    const handleSetDefaultTaxRate = () => {
        const rate = parseFloat(String(watchTaxRate));
        if (!isNaN(rate)) {
            updatePreferences({ defaultTaxRate: rate });
            toast({ title: "Default Rate Saved", description: `${rate}% is now your default.` });
        }
    };

    const handleSelectTaxType = (typeName: string) => {
        const type = taxTypes.find(t => t.name === typeName);
        if (type) {
            form.setValue('taxType', type.name);
            form.setValue('taxRate', type.rate);
        } else {
            form.setValue('taxType', 'None');
            form.setValue('taxRate', preferences?.defaultTaxRate ?? 0);
        }
    };

    const handleInternalCreateCategory = async () => {
        if (!user || !newCategoryName.trim()) return;
        try {
            if (transactionType === 'income') {
                const newCat = await addIncomeCategory({ name: newCategoryName.trim(), userId: user.uid });
                form.setValue('category', newCat.categoryNumber || newCat.id);
            } else {
                const newCat = await addExpenseCategory({ name: newCategoryName.trim(), userId: user.uid });
                form.setValue('category', newCat.categoryNumber || newCat.id);
            }
            setShowAddCategory(false);
            setNewCategoryName('');
            onSuccess();
            toast({ title: 'Category Created' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const onSubmit = async (values: TransactionFormData) => {
        if (!user) return;
        setIsSaving(true);
        try {
            const baseData = {
                date: values.date,
                company: values.company,
                description: values.description || '',
                quantity: values.quantity,
                unitPrice: values.unitPrice,
                totalAmount: totals.total,
                preTaxAmount: totals.preTax,
                taxAmount: totals.tax,
                taxRate: values.taxRate || 0,
                taxType: values.taxType,
                explanation: values.explanation || '',
                documentNumber: values.documentNumber || '',
                documentUrl: values.documentUrl || '',
                type: values.type,
                paymentMethod: values.paymentMethod,
            };

            if (values.paymentStatus === 'unpaid') {
                const contact = contacts.find(c => c.name.trim().toLowerCase() === values.company.trim().toLowerCase());
                if (transactionType === 'income') {
                    if (!contact) throw new Error("A valid contact record is required for Accounts Receivable.");
                    await addInvoiceWithLineItems({
                        invoiceNumber: values.documentNumber || `INV-${Date.now()}`,
                        companyName: values.company,
                        contactId: contact.id,
                        originalAmount: totals.total,
                        amountPaid: 0,
                        dueDate: addDays(new Date(values.date), 14),
                        invoiceDate: new Date(values.date),
                        status: 'outstanding',
                        notes: values.description || '',
                        taxType: values.taxType || 'standard',
                        userId: user.uid,
                    }, [{
                        description: values.description || "Service Delivery",
                        quantity: values.quantity,
                        price: values.unitPrice,
                        taxRate: values.taxRate || 0,
                        taxType: values.taxType,
                        userId: user.uid
                    }]);
                    toast({ title: "Sent to Accounts Receivable" });
                } else {
                    await addPayableBill({
                        vendor: values.company,
                        invoiceNumber: values.documentNumber || `BILL-${Date.now()}`,
                        dueDate: format(addDays(new Date(values.date), 14), 'yyyy-MM-dd'),
                        totalAmount: totals.total,
                        quantity: values.quantity,
                        unitPrice: values.unitPrice,
                        preTaxAmount: totals.preTax,
                        taxAmount: totals.tax,
                        taxRate: values.taxRate || 0,
                        taxType: values.taxType,
                        category: values.category,
                        description: values.description,
                        documentUrl: values.documentUrl,
                        userId: user.uid
                    });
                    toast({ title: "Sent to Accounts Payable" });
                }
            } else {
                if (transactionToEdit) {
                    if (transactionType === 'income') {
                        await updateIncomeTransaction(transactionToEdit.id, { ...baseData, incomeCategory: values.category, depositedTo: values.depositedTo! });
                    } else {
                        await updateExpenseTransaction(transactionToEdit.id, { ...baseData, category: values.category });
                    }
                    toast({ title: "Transaction Updated" });
                } else {
                    if (transactionType === 'income') {
                        await addIncomeTransaction({ ...baseData, incomeCategory: values.category, depositedTo: values.depositedTo!, userId: user.uid });
                    } else {
                        await addExpenseTransaction({ ...baseData, category: values.category, userId: user.uid });
                    }
                    toast({ title: "Recorded in Ledger" });
                }
            }
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl flex flex-col max-h-[95vh] p-0">
                <DialogHeader className="p-6 pb-2 shrink-0">
                    <DialogTitle className="text-2xl font-bold text-primary">
                        {transactionToEdit ? 'Edit' : 'Post'} {transactionType === 'income' ? 'Income' : 'Expense'}
                    </DialogTitle>
                    <DialogDescription>Capture high-fidelity financial details for your BKS records.</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <ScrollArea className="flex-1 px-6">
                            <div className="space-y-6 pb-6">
                                {!transactionToEdit && (
                                    <RadioGroup 
                                        value={transactionType} 
                                        onValueChange={(v) => {
                                            setTransactionType(v as 'income' | 'expense');
                                            form.setValue('category', ''); // Clear category when type changes
                                        }} 
                                        className="grid grid-cols-2 gap-4"
                                    >
                                        <div><RadioGroupItem value="income" id="ut-income" className="peer sr-only" /><Label htmlFor="ut-income" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-600 [&:has([data-state=checked])]:border-green-600 cursor-pointer">Income</Label></div>
                                        <div><RadioGroupItem value="expense" id="ut-expense" className="peer sr-only" /><Label htmlFor="ut-expense" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-600 [&:has([data-state=checked])]:border-red-600 cursor-pointer">Expense</Label></div>
                                    </RadioGroup>
                                )}

                                <FormField
                                    control={form.control}
                                    name="paymentStatus"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                                            <FormLabel className="font-bold">Payment Status</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-6">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="paid" id="ps-paid" />
                                                        <Label htmlFor="ps-paid" className="cursor-pointer">Paid Now (Post to Ledger)</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="unpaid" id="ps-unpaid" />
                                                        <Label htmlFor="ps-unpaid" className="cursor-pointer">Pay Later (Post to {transactionType === 'income' ? 'A/R' : 'A/P'})</Label>
                                                    </div>
                                                </RadioGroup>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Date *</FormLabel>
                                                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <CustomCalendar 
                                                            mode="single" 
                                                            selected={field.value ? new Date(field.value) : undefined} 
                                                            onSelect={(date) => { if (date) field.onChange(format(date, 'yyyy-MM-dd')); setIsDatePickerOpen(false); }} 
                                                            initialFocus 
                                                        />
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
                                                <FormLabel>Contact *</FormLabel>
                                                <div className="flex gap-2">
                                                    <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant="outline" role="combobox" className="w-full justify-between truncate font-normal">
                                                                    {field.value ? (
                                                                        (() => {
                                                                            const match = contacts.find(c => c.name === field.value);
                                                                            return match ? `${match.name}${match.businessName ? ` (${match.businessName})` : ''}` : field.value;
                                                                        })()
                                                                    ) : "Select contact..."}
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                            <Command>
                                                                <CommandInput placeholder="Search or type name..." />
                                                                <CommandList>
                                                                    <CommandEmpty>No results found.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {contacts.map(c => (
                                                                            <CommandItem key={c.id} onSelect={() => { field.onChange(c.name); setIsContactPopoverOpen(false); }}>
                                                                                <Check className={cn("mr-2 h-4 w-4", field.value === c.name ? "opacity-100" : "opacity-0")}/> 
                                                                                {c.name} {c.businessName ? `(${c.businessName})` : ''}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Button type="button" variant="outline" size="icon" onClick={onOpenContactForm} title="Add New Record"><UserPlus className="h-4 w-4"/></Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                        <FileSignature className="h-4 w-4" />
                                        Tax Categorization
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Tax Category *</FormLabel>
                                                    <div className="flex gap-2">
                                                        <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button variant="outline" role="combobox" className="w-full justify-between truncate font-normal">
                                                                        {field.value ? (currentCategories.find(c => (c.categoryNumber || c.id) === field.value)?.name || field.value) : "Select category..."}
                                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                                <Command>
                                                                    <CommandInput placeholder="Search or type name..." onValueChange={setNewCategoryName}/>
                                                                    <CommandList>
                                                                        <CommandEmpty>
                                                                            <Button variant="ghost" className="w-full justify-start text-primary" onClick={handleInternalCreateCategory}>
                                                                                <Plus className="mr-2 h-4 w-4"/> Create "{newCategoryName}"
                                                                            </Button>
                                                                        </CommandEmpty>
                                                                        <CommandGroup>
                                                                            {currentCategories.map(c => (
                                                                                <CommandItem key={c.id} onSelect={() => { field.onChange(c.categoryNumber || c.id); setIsCategoryPopoverOpen(false); }}>
                                                                                    <Check className={cn("mr-2 h-4 w-4", field.value === (c.categoryNumber || c.id) ? "opacity-100" : "opacity-0")}/> 
                                                                                    {c.categoryNumber ? `(${c.categoryNumber}) ` : ''}{c.name}
                                                                                </CommandItem>
                                                                            ))}
                                                                        </CommandGroup>
                                                                    </CommandList>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                        <Button type="button" variant="outline" size="icon" onClick={() => setShowAddCategory(!showAddCategory)} title="Quick Add Category"><PlusCircle className="h-4 w-4"/></Button>
                                                    </div>
                                                    {showAddCategory && (
                                                        <div className="flex gap-2 animate-in fade-in-50 pt-2">
                                                            <Input placeholder="New name..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="h-8" />
                                                            <Button type="button" onClick={handleInternalCreateCategory} size="sm">Add</Button>
                                                        </div>
                                                    )}
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="space-y-2">
                                            <Label>CRA Line #</Label>
                                            <Input readOnly disabled value={categoryNumberDisplay} className="bg-muted/50" />
                                        </div>
                                    </div>
                                </div>

                                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Operational Description</FormLabel><FormControl><Input placeholder="Briefly describe this transaction..." {...field} /></FormControl><FormMessage /></FormItem> )} />

                                <Separator />

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="unitPrice" render={({ field }) => ( <FormItem><FormLabel>Unit Price</FormLabel><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span><FormControl><Input type="number" step="0.01" className="pl-7" {...field} /></FormControl></div><FormMessage /></FormItem> )} />
                                    <div className="space-y-2">
                                        <Label>Total Amount</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                            <Input value={totals.total.toFixed(2)} readOnly disabled className="pl-7 bg-muted/50 font-bold" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
                                    <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs uppercase tracking-widest">
                                        <Percent className="h-3.5 w-3.5" />
                                        Tax Configuration
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="taxType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tax Type</FormLabel>
                                                    <div className="flex gap-2">
                                                        <Select value={field.value} onValueChange={handleSelectTaxType}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select tax type..." />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="None">No Tax</SelectItem>
                                                                {taxTypes.map(t => (
                                                                    <SelectItem key={t.id} value={t.name}>{t.name} ({t.rate}%)</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Button variant="outline" size="icon" onClick={() => setIsManageTaxDialogOpen(true)} title="Manage Tax Types">
                                                            <Settings className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="taxRate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex justify-between items-center">
                                                        <FormLabel>Tax Rate (%)</FormLabel>
                                                        <Button type="button" variant="link" className="h-auto p-0 text-[10px] font-bold text-primary" onClick={handleSetDefaultTaxRate}>Set Default</Button>
                                                    </div>
                                                    <div className="relative">
                                                        <FormControl>
                                                            <Input type="number" step="0.1" className="pr-8" {...field} />
                                                        </FormControl>
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Pre-Tax Amount</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                                <Input value={totals.preTax.toFixed(2)} readOnly disabled className="pl-7 h-8 bg-background/50 text-xs" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Tax Amount</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                                <Input value={totals.tax.toFixed(2)} readOnly disabled className="pl-7 h-8 bg-background/50 text-xs" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {form.watch('paymentStatus') === 'paid' && (
                                        <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Payment Method</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="How was it paid?" /></SelectTrigger></FormControl>
                                                    <SelectContent>{paymentMethodOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                    )}
                                    {transactionType === 'income' && form.watch('paymentStatus') === 'paid' && (
                                        <FormField control={form.control} name="depositedTo" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Deposit To</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>{defaultDepositAccounts.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                    )}
                                </div>

                                <FormField control={form.control} name="explanation" render={({ field }) => ( <FormItem><FormLabel>Business Reason (Internal)</FormLabel><FormControl><Textarea placeholder="Explain why this transaction was made..." rows={2} {...field} /></FormControl><FormMessage /></FormItem> )} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="documentNumber" render={({ field }) => ( <FormItem><FormLabel>Doc # (Invoice/Receipt)</FormLabel><FormControl><Input placeholder="e.g., INV-1001" {...field} /></FormControl></FormItem> )} />
                                    <FormField control={form.control} name="documentUrl" render={({ field }) => ( <FormItem><FormLabel>Evidence Link (PDF/Image)</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl></FormItem> )} />
                                </div>
                            </div>
                        </ScrollArea>

                        <DialogFooter className="p-6 border-t shrink-0">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                {form.watch('paymentStatus') === 'unpaid' ? (transactionType === 'income' ? 'Record Receivable' : 'Record Payable') : 'Post to Ledger'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <ManageTaxTypesDialog
            isOpen={isManageTaxDialogOpen}
            onOpenChange={setIsManageTaxDialogOpen}
            taxTypes={taxTypes}
            onTaxTypesChange={onTaxTypesChange}
        />
        </>
    );
}
