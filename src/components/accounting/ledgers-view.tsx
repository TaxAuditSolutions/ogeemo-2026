'use client';

import * as React from "react";
import { useSearchParams, useRouter } from 'next/navigation';
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
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AccountingPageHeader } from "@/components/accounting/page-header";
import { Button } from "@/components/ui/button";
import { 
    PlusCircle, 
    MoreVertical, 
    BookOpen, 
    Pencil, 
    Trash2, 
    LoaderCircle, 
    Check, 
    ChevronsUpDown, 
    Plus, 
    Calendar as CalendarIcon, 
    X, 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    Link as LinkIcon, 
    UserPlus,
    ArrowUpDown,
    ArrowDownAZ,
    ArrowUpZA,
    Printer,
    FilterX,
    Clock,
    FileDigit
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/auth-context';
import { 
    getIncomeTransactions, addIncomeTransaction, updateIncomeTransaction, deleteIncomeTransaction, type IncomeTransaction, 
    getExpenseTransactions, addExpenseTransaction, updateExpenseTransaction, deleteExpenseTransaction, type ExpenseTransaction, 
    getExpenseCategories, addExpenseCategory, type ExpenseCategory,
    getIncomeCategories, addIncomeCategory, type IncomeCategory,
    getCompanies, addCompany, type Company,
    addInvoiceWithLineItems, addPayableBill
} from '@/services/accounting-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, ensureSystemFolders, type FolderData } from '@/services/contact-folder-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format, isWithinInterval, startOfDay, endOfDay, addDays } from 'date-fns';
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomCalendar } from "@/components/ui/custom-calendar";
import Link from "next/link";
import ContactFormDialog from "@/components/contacts/contact-form-dialog";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useReactToPrint } from "@/hooks/use-react-to-print";
import { Separator } from "../ui/separator";

type GeneralTransaction = (IncomeTransaction | ExpenseTransaction) & { transactionType: 'income' | 'expense' };

const defaultDepositAccounts = ["Bank Account #1", "Credit Card #1", "Cash Account"];
const paymentMethodOptions = ["Cash", "Cheque", "Credit Card", "Email Transfer", "Bank Transfer", "In Kind", "Miscellaneous", "GL Adjustment"];

const emptyTransactionForm = { 
    date: format(new Date(), 'yyyy-MM-dd'), 
    company: '', 
    description: '', 
    quantity: '1',
    unitPrice: '',
    totalAmount: '', 
    taxRate: '', 
    preTaxAmount: '', 
    taxAmount: '', 
    category: '', 
    incomeCategory: '', 
    explanation: '', 
    documentNumber: '', 
    documentUrl: '', 
    type: 'business' as 'business' | 'personal', 
    paymentMethod: 'Bank Transfer',
    depositedTo: 'Bank Account #1',
    paymentStatus: 'paid' as 'paid' | 'unpaid'
};

export function LedgersView() {
  const [incomeLedger, setIncomeLedger] = React.useState<IncomeTransaction[]>([]);
  const [expenseLedger, setExpenseLedger] = React.useState<ExpenseTransaction[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [contactFolders, setContactFolders] = React.useState<FolderData[]>([]);
  const [expenseCategories, setExpenseCategories] = React.useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = React.useState<IncomeCategory[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = React.useState<Industry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = React.useState(false);
  const [transactionToEdit, setTransactionToEdit] = React.useState<GeneralTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = React.useState<GeneralTransaction | null>(null);
  const [newTransactionType, setNewTransactionType] = React.useState<'income' | 'expense'>('income');
  const [newTransaction, setNewTransaction] = React.useState(emptyTransactionForm);
  
  const [isContactFormOpen, setIsContactFormOpen] = React.useState(false);
  const [isCompanyPopoverOpen, setIsCompanyPopoverOpen] = React.useState(false);
  const [newCompanyName, setNewCompanyName] = React.useState('');
  const [showAddCompany, setShowAddCompany] = React.useState(false);

  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  const [isStartFilterOpen, setIsStartFilterOpen] = React.useState(false);
  const [isEndFilterOpen, setIsEndFilterOpen] = React.useState(false);

  const [showAddCategory, setShowAddCategory] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = React.useState(false);
  const [isIncomeCategoryPopoverOpen, setIsIncomeCategoryPopoverOpen] = React.useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const { handlePrint, contentRef } = useReactToPrint();
  const { preferences, updatePreferences } = useUserPreferences();
  
  const searchParams = useSearchParams();
  const highlightedId = searchParams ? searchParams.get('highlight') : null;
  const initialTab = searchParams ? searchParams.get('tab') : 'all';
  const autoEdit = searchParams ? searchParams.get('edit') === 'true' : false;
  
  const [activeTab, setActiveTab] = React.useState(initialTab || 'all');
  const router = useRouter();

  const getCategoryName = React.useCallback((categoryNumber: string, type: 'income' | 'expense') => {
      if (type === 'income') {
          return incomeCategories.find(c => c.categoryNumber === categoryNumber)?.name || categoryNumber || 'Uncategorized';
      }
      return expenseCategories.find(c => c.categoryNumber === categoryNumber)?.name || categoryNumber || 'Uncategorized';
  }, [incomeCategories, expenseCategories]);

  const loadData = React.useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
        const [income, expenses, fetchedContacts, fetchedFolders, fetchedExpenseCategories, fetchedIncomeCategories, fetchedIndustries, fetchedCompanies] = await Promise.all([
            getIncomeTransactions(user.uid), 
            getExpenseTransactions(user.uid), 
            getContacts(user.uid),
            getContactFolders(user.uid),
            getExpenseCategories(user.uid), 
            getIncomeCategories(user.uid),
            getIndustries(user.uid),
            getCompanies(user.uid)
        ]);
        setIncomeLedger(income); 
        setExpenseLedger(expenses); 
        setContacts(fetchedContacts);
        setContactFolders(fetchedFolders);
        setExpenseCategories(fetchedExpenseCategories); 
        setIncomeCategories(fetchedIncomeCategories);
        setCustomIndustries(fetchedIndustries);
        setCompanies(fetchedCompanies);
    } catch (e: any) { 
        // Standard errors are already handled by emitting them from services
    }
    finally { setIsLoading(false); }
  }, [user, toast]);

  React.useEffect(() => { loadData(); }, [loadData]);

  const filteredIncome = React.useMemo(() => {
    if (!startDate && !endDate) return incomeLedger;
    return incomeLedger.filter(tx => {
        const txDate = new Date(tx.date);
        const start = startDate ? startOfDay(startDate) : new Date(0);
        const end = endDate ? endOfDay(endDate) : new Date(8640000000000000);
        return isWithinInterval(txDate, { start, end });
    });
  }, [incomeLedger, startDate, endDate]);

  const filteredExpenses = React.useMemo(() => {
    if (!startDate && !endDate) return expenseLedger;
    return expenseLedger.filter(tx => {
        const txDate = new Date(tx.date);
        const start = startDate ? startOfDay(startDate) : new Date(0);
        const end = endDate ? endOfDay(endDate) : new Date(8640000000000000);
        return isWithinInterval(txDate, { start, end });
    });
  }, [expenseLedger, startDate, endDate]);

  const generalLedger = React.useMemo(() => {
    const combined: GeneralTransaction[] = [
      ...filteredIncome.map(item => ({ ...item, transactionType: 'income' as const })),
      ...filteredExpenses.map(item => ({ ...item, transactionType: 'expense' as const })),
    ];
    
    if (sortConfig !== null) {
        combined.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortConfig.key) {
                case 'date':
                    aValue = new Date(a.date).getTime() || 0;
                    bValue = new Date(b.date).getTime() || 0;
                    break;
                case 'company':
                    aValue = (a.company || '').toLowerCase();
                    bValue = (b.company || '').toLowerCase();
                    break;
                case 'category':
                    aValue = getCategoryName(
                        a.transactionType === 'income' ? (a as IncomeTransaction).incomeCategory : (a as ExpenseTransaction).category, 
                        a.transactionType
                    ).toLowerCase();
                    bValue = getCategoryName(
                        b.transactionType === 'income' ? (b as IncomeTransaction).incomeCategory : (b as ExpenseTransaction).category, 
                        b.transactionType
                    ).toLowerCase();
                    break;
                case 'type':
                    aValue = a.transactionType;
                    bValue = b.transactionType;
                    break;
                default:
                    aValue = 0;
                    bValue = 0;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    return combined;
  }, [filteredIncome, filteredExpenses, sortConfig, getCategoryName]);

  const handleEditTransaction = (tx: GeneralTransaction) => {
      setTransactionToEdit(tx);
      setNewTransactionType(tx.transactionType);
      
      const currentCatNum = tx.transactionType === 'income' ? (tx as IncomeTransaction).incomeCategory : (tx as ExpenseTransaction).category;

      setNewTransaction({
          date: tx.date,
          company: tx.company,
          description: tx.description,
          quantity: String(tx.quantity || '1'),
          unitPrice: String(tx.unitPrice || tx.totalAmount),
          totalAmount: String(tx.totalAmount),
          taxRate: String(tx.taxRate || ''),
          preTaxAmount: String(tx.preTaxAmount || ''),
          taxAmount: String(tx.taxAmount || ''),
          incomeCategory: tx.transactionType === 'income' ? currentCatNum : '',
          category: tx.transactionType === 'expense' ? currentCatNum : '',
          explanation: tx.explanation || '',
          documentNumber: tx.documentNumber || '',
          documentUrl: tx.documentUrl || '',
          type: tx.type,
          paymentMethod: tx.paymentMethod || 'Bank Transfer',
          depositedTo: tx.transactionType === 'income' ? (tx as IncomeTransaction).depositedTo : '',
          paymentStatus: 'paid'
      });
      setIsTransactionDialogOpen(true);
  };

  React.useEffect(() => {
    if (highlightedId && !isLoading) {
        if (initialTab && initialTab !== activeTab) {
            setActiveTab(initialTab);
        }
        if (autoEdit) {
            const tx = generalLedger.find(t => t.id === highlightedId);
            if (tx) {
                handleEditTransaction(tx);
            }
        }
        const timeoutId = setTimeout(() => {
            const rowElement = document.getElementById(`row-${highlightedId}`);
            if (rowElement) {
                rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }
  }, [highlightedId, isLoading, initialTab, autoEdit, generalLedger, activeTab]);

  const incomeTotal = React.useMemo(() => filteredIncome.reduce((sum, item) => sum + item.totalAmount, 0), [filteredIncome]);
  const expenseTotal = React.useMemo(() => filteredExpenses.reduce((sum, item) => sum + item.totalAmount, 0), [filteredExpenses]);
  const netIncome = incomeTotal - expenseTotal;

  // Calculation effect for newTransaction
  React.useEffect(() => {
    const qty = parseFloat(newTransaction.quantity) || 0;
    const unitPrice = parseFloat(newTransaction.unitPrice) || 0;
    const taxRate = parseFloat(newTransaction.taxRate) || 0;

    const total = qty * unitPrice;
    const preTax = total / (1 + taxRate / 100);
    const tax = total - preTax;

    setNewTransaction(prev => ({
        ...prev,
        totalAmount: total.toFixed(2),
        preTaxAmount: preTax.toFixed(2),
        taxAmount: tax.toFixed(2)
    }));
  }, [newTransaction.quantity, newTransaction.unitPrice, newTransaction.taxRate]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSaveTransaction = () => {
      if (!user) return;
      const totalAmountNum = parseFloat(newTransaction.totalAmount);
      const quantityNum = parseFloat(newTransaction.quantity) || 1;
      const unitPriceNum = parseFloat(newTransaction.unitPrice) || totalAmountNum;
      const taxRateNum = parseFloat(newTransaction.taxRate) || 0;
      const selectedCategoryNumber = newTransactionType === 'income' ? newTransaction.incomeCategory : newTransaction.category;

      if (!newTransaction.date || !newTransaction.company || !selectedCategoryNumber || isNaN(totalAmountNum)) {
          toast({ variant: 'destructive', title: 'Missing Information', description: 'Please ensure Date, Contact, Category, and Amount are provided.' });
          return;
      }

      const preTaxAmount = totalAmountNum / (1 + taxRateNum / 100);
      const taxAmount = totalAmountNum - preTaxAmount;
      
      const baseData = {
          date: newTransaction.date,
          company: newTransaction.company,
          description: newTransaction.description,
          quantity: quantityNum,
          unitPrice: unitPriceNum,
          totalAmount: totalAmountNum,
          preTaxAmount: preTaxAmount,
          taxAmount: taxAmount,
          taxRate: taxRateNum,
          explanation: newTransaction.explanation,
          documentNumber: newTransaction.documentNumber,
          documentUrl: newTransaction.documentUrl,
          type: newTransaction.type,
          paymentMethod: newTransaction.paymentMethod,
      };

      if (newTransaction.paymentStatus === 'unpaid') {
          const contact = contacts.find(c => c.name === newTransaction.company);
          if (newTransactionType === 'income') {
              if (!contact) { toast({ variant: 'destructive', title: 'Error', description: "A valid contact record is required for Accounts Receivable entries." }); return; }
              addInvoiceWithLineItems({
                  invoiceNumber: newTransaction.documentNumber || `PRO-${Date.now()}`,
                  companyName: newTransaction.company,
                  contactId: contact.id,
                  originalAmount: totalAmountNum,
                  amountPaid: 0,
                  dueDate: addDays(new Date(newTransaction.date), 14),
                  invoiceDate: new Date(newTransaction.date),
                  status: 'outstanding',
                  notes: newTransaction.description,
                  taxType: 'standard',
                  userId: user.uid,
              }, [{
                  description: newTransaction.description || "Service Delivery",
                  quantity: quantityNum,
                  price: unitPriceNum,
                  taxRate: taxRateNum,
                  totalAmount: totalAmountNum,
                  preTaxAmount: preTaxAmount,
                  taxAmount: taxAmount,
                  userId: user.uid
              }]);
              toast({ title: "Sent to Accounts Receivable", description: "This unpaid item is now in your AR bucket." });
          } else {
              addPayableBill({
                  vendor: newTransaction.company,
                  invoiceNumber: newTransaction.documentNumber || `BILL-${Date.now()}`,
                  dueDate: format(addDays(new Date(newTransaction.date), 14), 'yyyy-MM-dd'),
                  totalAmount: totalAmountNum,
                  quantity: quantityNum,
                  unitPrice: unitPriceNum,
                  preTaxAmount: preTaxAmount,
                  taxAmount: taxAmount,
                  taxRate: taxRateNum,
                  category: selectedCategoryNumber,
                  description: newTransaction.description,
                  documentUrl: newTransaction.documentUrl,
                  userId: user.uid
              });
              toast({ title: "Sent to Accounts Payable", description: "This unpaid bill is now in your AP bucket." });
          }
      } else {
          if (transactionToEdit) {
              if (newTransactionType === 'income') {
                  updateIncomeTransaction(transactionToEdit.id, { ...baseData, incomeCategory: selectedCategoryNumber, depositedTo: newTransaction.depositedTo });
              } else {
                  updateExpenseTransaction(transactionToEdit.id, { ...baseData, category: selectedCategoryNumber });
              }
              toast({ title: "Transaction Updated" });
          } else {
              if (newTransactionType === 'income') {
                  addIncomeTransaction({ ...baseData, incomeCategory: selectedCategoryNumber, depositedTo: newTransaction.depositedTo, userId: user.uid });
                  toast({ title: "Income Recorded in GL" });
              } else {
                  addExpenseTransaction({ ...baseData, category: selectedCategoryNumber, userId: user.uid });
                  toast({ title: "Expense Recorded in GL" });
              }
          }
      }
      setIsTransactionDialogOpen(false);
      setTimeout(loadData, 500);
  };

  const handleSetDefaultTaxRate = () => {
      const rate = parseFloat(newTransaction.taxRate);
      if (!isNaN(rate)) {
          updatePreferences({ defaultTaxRate: rate });
          toast({
              title: "Default Rate Saved",
              description: `${rate}% is now your default tax rate.`
          });
      } else {
          toast({
              variant: 'destructive',
              title: "Invalid Rate",
              description: "Please enter a valid tax rate before setting it as the default."
          });
      }
  };

  const handleConfirmDelete = () => {
    if (!transactionToDelete || !user) return;
    if (transactionToDelete.transactionType === 'income') {
        deleteIncomeTransaction(transactionToDelete.id);
    } else {
        deleteExpenseTransaction(transactionToDelete.id);
    }
    setTransactionToDelete(null);
    setTimeout(loadData, 500);
  };

  const handleCreateCompany = (name: string) => {
      if (!user || !name.trim()) return;
      addCompany({ name: name.trim(), userId: user.uid });
      setShowAddCompany(false);
      setNewCompanyName('');
      setTimeout(loadData, 500);
  };

  const handleCreateCategory = () => {
    if (!user || !newCategoryName.trim()) return;
    if (newTransactionType === 'income') {
        addIncomeCategory({ name: newCategoryName.trim(), userId: user.uid });
    } else {
        addExpenseCategory({ name: newCategoryName.trim(), userId: user.uid });
    }
    setShowAddCategory(false);
    setNewCategoryName('');
    setTimeout(loadData, 500);
  };

  const clearFilters = () => {
      setStartDate(undefined);
      setEndDate(undefined);
  };

  const handleContactSave = (contact: Contact, isEditing: boolean) => {
      loadData();
      setIsContactFormOpen(false);
  };

  const renderTable = (data: GeneralTransaction[], type: 'income' | 'expense' | 'all') => (
    <div className="border rounded-md overflow-hidden bg-card">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="p-0">
                        <Button variant="ghost" onClick={() => requestSort('date')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                            Date {sortConfig?.key === 'date' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                        </Button>
                    </TableHead>
                    <TableHead className="p-0">
                        <Button variant="ghost" onClick={() => requestSort('company')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                            Contact {sortConfig?.key === 'company' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                        </Button>
                    </TableHead>
                    <TableHead className="p-0">
                        <Button variant="ghost" onClick={() => requestSort('category')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                            Category {sortConfig?.key === 'category' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                        </Button>
                    </TableHead>
                    {type === 'all' && (
                        <TableHead className="p-0">
                            <Button variant="ghost" onClick={() => requestSort('type')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                Type {sortConfig?.key === 'type' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                            </Button>
                        </TableHead>
                    )}
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center print:hidden">Doc</TableHead>
                    <TableHead className="w-12 print:hidden"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map(item => (
                    <TableRow id={`row-${item.id}`} key={item.id} className={cn(highlightedId === item.id && "bg-primary/10 animate-pulse ring-2 ring-primary ring-inset")}>
                        <TableCell>{item.date}</TableCell>
                        <TableCell className="font-medium">{item.company}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            {getCategoryName(item.transactionType === 'income' ? (item as IncomeTransaction).incomeCategory : (item as ExpenseTransaction).category, item.transactionType)}
                        </TableCell>
                        {type === 'all' && <TableCell><Badge variant={item.transactionType === 'income' ? 'default' : 'destructive'}>{item.transactionType}</Badge></TableCell>}
                        <TableCell className={cn("text-right font-mono font-semibold", item.transactionType === 'income' ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(item.totalAmount)}
                        </TableCell>
                        <TableCell className="text-center print:hidden">
                            {item.documentUrl ? (
                                <a href={item.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                    <LinkIcon className="h-4 w-4 mx-auto" />
                                </a>
                            ) : '-'}
                        </TableCell>
                        <TableCell className="print:hidden">
                            <div className="flex justify-end">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => handleEditTransaction(item)}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setTransactionToDelete(item)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
                {data.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={type === 'all' ? 7 : 6} className="h-32 text-center text-muted-foreground">No transactions found for the selected criteria.</TableCell>
                    </TableRow>
                )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={type === 'all' ? 4 : 3} className="text-right font-bold">Total</TableCell>
                    <TableCell className={cn("text-right font-bold font-mono", type === 'expense' ? "text-red-600" : type === 'income' ? "text-green-600" : (netIncome >= 0 ? "text-green-600" : "text-red-600"))}>
                        {formatCurrency(type === 'income' ? incomeTotal : type === 'expense' ? expenseTotal : netIncome)}
                    </TableCell>
                    <TableCell className="print:hidden" colSpan={2}/>
                </TableRow>
            </TableFooter>
        </Table>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="BKS Ledger" hubPath="/accounting" hubLabel="Accounting Hub" />
        
        <header className="text-center relative print:hidden">
            <h1 className="text-3xl font-bold font-headline text-primary">BKS General Ledger</h1>
            <p className="text-muted-foreground">Comprehensive record of all processed business income and expenses.</p>
            <div className="absolute top-0 right-0">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/action-manager"><X className="h-5 w-5"/></Link>
                </Button>
            </div>
        </header>

        <Card className="print:hidden">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-medium">Filter & Report Options</CardTitle>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint} disabled={generalLedger.length === 0}>
                        <Printer className="mr-2 h-4 w-4" /> Print Ledger
                    </Button>
                    <Button onClick={() => { setTransactionToEdit(null); setNewTransaction(emptyTransactionForm); setIsTransactionDialogOpen(true); }} size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" /> Post Transaction
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 flex flex-wrap items-end justify-center gap-4">
                <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                    <Popover open={isStartFilterOpen} onOpenChange={setIsStartFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-48 justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                {startDate ? format(startDate, "PPP") : <span>Beginning of time</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <CustomCalendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setIsStartFilterOpen(false); }} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Date</Label>
                    <Popover open={isEndFilterOpen} onOpenChange={setIsEndFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-48 justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                {endDate ? format(endDate, "PPP") : <span>End of time</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <CustomCalendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setIsEndFilterOpen(false); }} initialFocus disabled={(date) => startDate ? date < startDate : false} />
                        </PopoverContent>
                    </Popover>
                </div>
                <Button variant="ghost" onClick={clearFilters} disabled={!startDate && !endDate}>
                    <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                </Button>
            </CardContent>
        </Card>

        <div ref={contentRef}>
            <div className="hidden print:block text-center mb-8 border-b pb-4">
                <h1 className="text-3xl font-bold">BKS General Ledger</h1>
                <p className="text-muted-foreground">
                    {startDate ? format(startDate, 'PPP') : 'Beginning of time'} - {endDate ? format(endDate, 'PPP') : 'Present'}
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4 print:hidden">
                    <TabsTrigger value="all">General Ledger</TabsTrigger>
                    <TabsTrigger value="income">Income Ledger</TabsTrigger>
                    <TabsTrigger value="expenses">Expense Ledger</TabsTrigger>
                </TabsList>
                <TabsContent value="all">{renderTable(generalLedger, 'all')}</TabsContent>
                <TabsContent value="income">{renderTable(filteredIncome.map(i => ({...i, transactionType: 'income'})), 'income')}</TabsContent>
                <TabsContent value="expenses">{renderTable(filteredExpenses.map(e => ({...e, transactionType: 'expense'})), 'expense')}</TabsContent>
            </Tabs>
        </div>

        <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
            <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
                <DialogHeader className="text-center sm:text-center shrink-0">
                    <DialogTitle className="text-2xl text-primary font-bold">
                        {transactionToEdit ? 'Edit' : 'Post'} {newTransactionType === 'income' ? 'Income' : 'Expense'}
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 min-h-0">
                    <div className="grid gap-4 py-4 px-6">
                        {!transactionToEdit && (
                            <RadioGroup value={newTransactionType} onValueChange={(value) => setNewTransactionType(value as 'income' | 'expense')} className="grid grid-cols-2 gap-4">
                                <div><RadioGroupItem value="income" id="r-income" className="peer sr-only" /><Label htmlFor="r-income" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-600 [&:has([data-state=checked])]:border-green-600 cursor-pointer">Income</Label></div>
                                <div><RadioGroupItem value="expense" id="r-expense" className="peer sr-only" /><Label htmlFor="r-expense" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-600 [&:has([data-state=checked])]:border-red-600 cursor-pointer">Expense</Label></div>
                            </RadioGroup>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right font-bold">Payment Status</Label>
                            <div className="col-span-3">
                                <RadioGroup value={newTransaction.paymentStatus} onValueChange={(v) => setNewTransaction(p => ({...p, paymentStatus: v as 'paid' | 'unpaid'}))} className="flex space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="paid" id="ps-paid" />
                                        <Label htmlFor="ps-paid" className="cursor-pointer">Paid Now (Post to GL)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="unpaid" id="ps-unpaid" />
                                        <Label htmlFor="ps-unpaid" className="cursor-pointer">Pay Later (Post to {newTransactionType === 'income' ? 'A/R' : 'A/P'})</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Date *</Label>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !newTransaction.date && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {newTransaction.date ? format(new Date(newTransaction.date), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <CustomCalendar mode="single" selected={newTransaction.date ? new Date(newTransaction.date) : undefined} onSelect={(date) => { if (date) setNewTransaction(p => ({ ...p, date: format(date, 'yyyy-MM-dd') })); setIsDatePickerOpen(false); }} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Contact *</Label>
                            <div className="col-span-3 space-y-2">
                                <div className="flex gap-2">
                                    <Popover open={isCompanyPopoverOpen} onOpenChange={setIsCompanyPopoverOpen}>
                                        <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between truncate">{newTransaction.company || "Select or search..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search contact..." value={newCompanyName} onValueChange={setNewCompanyName}/>
                                                <CommandList>
                                                    <CommandEmpty>
                                                        <Button variant="ghost" className="w-full justify-start text-primary" onClick={() => handleCreateCompany(newCompanyName)}>
                                                            <Plus className="mr-2 h-4 w-4"/> Create "{newCompanyName}"
                                                        </Button>
                                                    </CommandEmpty>
                                                    <CommandGroup>
                                                        {companies.map(c => (
                                                            <CommandItem key={c.id} onSelect={() => { setNewTransaction(p => ({...p, company: c.name})); setIsCompanyPopoverOpen(false); }}>
                                                                <Check className={cn("mr-2 h-4 w-4", newTransaction.company === c.name ? "opacity-100" : "opacity-0")}/> {c.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <Button variant="outline" size="icon" onClick={() => setIsContactFormOpen(true)} title="Add New Contact"><UserPlus className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Description</Label><Input value={newTransaction.description} onChange={e => setNewTransaction(p => ({...p, description: e.target.value}))} className="col-span-3" /></div>
                        
                        <Separator />

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Quantity</Label>
                            <Input type="number" value={newTransaction.quantity} onChange={e => setNewTransaction(p => ({...p, quantity: e.target.value}))} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Unit Price</Label>
                            <div className="relative col-span-3">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input type="number" step="0.01" value={newTransaction.unitPrice} onChange={e => setNewTransaction(p => ({...p, unitPrice: e.target.value}))} className="pl-7" />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Total Amount *</Label>
                            <div className="relative col-span-3">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input type="number" step="0.01" value={newTransaction.totalAmount} readOnly disabled className="pl-7 bg-muted/50 font-bold" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <div className="flex flex-col items-end">
                                <Label className="text-right">Tax Rate (%)</Label>
                                <Button 
                                    variant="link" 
                                    className="h-auto p-0 text-[10px] font-bold text-primary hover:underline transition-all"
                                    onClick={handleSetDefaultTaxRate}
                                >
                                    Set as default
                                </Button>
                            </div>
                            <div className="relative col-span-3">
                                <Input type="number" value={newTransaction.taxRate} onChange={e => setNewTransaction(prev => ({...prev, taxRate: e.target.value}))} className="pr-8" placeholder="e.g., 15"/>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Pre-Tax Amount</Label>
                            <div className="relative col-span-3">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input value={newTransaction.preTaxAmount} readOnly disabled className="pl-7 bg-muted/50" />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Tax Amount</Label>
                            <div className="relative col-span-3">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input value={newTransaction.taxAmount} readOnly disabled className="pl-7 bg-muted/50" />
                            </div>
                        </div>

                        <Separator />

                        {newTransaction.paymentStatus === 'paid' && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Payment Method</Label>
                                <Select value={newTransaction.paymentMethod} onValueChange={v => setNewTransaction(p => ({...p, paymentMethod: v}))}>
                                    <SelectTrigger className="col-span-3"><SelectValue placeholder="How was this paid?" /></SelectTrigger>
                                    <SelectContent>{paymentMethodOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Category *</Label>
                            <div className="col-span-3">
                                <Popover open={newTransactionType === 'income' ? isIncomeCategoryPopoverOpen : isCategoryPopoverOpen} onOpenChange={newTransactionType === 'income' ? setIsIncomeCategoryPopoverOpen : setIsCategoryPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between truncate">
                                            {getCategoryName(newTransactionType === 'income' ? newTransaction.incomeCategory : newTransaction.category, newTransactionType)}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search category..." value={newCategoryName} onValueChange={setNewCategoryName}/>
                                            <CommandList>
                                                <CommandEmpty><Button variant="ghost" className="w-full justify-start text-primary" onClick={handleCreateCategory}><Plus className="mr-2 h-4 w-4"/> Create "{newCategoryName}"</Button></CommandEmpty>
                                                <CommandGroup>
                                                    {(newTransactionType === 'income' ? incomeCategories : expenseCategories).map(c => (
                                                        <CommandItem key={c.id} onSelect={() => { 
                                                            setNewTransaction(p => ({...p, [newTransactionType === 'income' ? 'incomeCategory' : 'category']: c.categoryNumber || c.id})); 
                                                            newTransactionType === 'income' ? setIsIncomeCategoryPopoverOpen(false) : setIsCategoryPopoverOpen(false); 
                                                        }}>
                                                            <Check className={cn("mr-2 h-4 w-4", (newTransactionType === 'income' ? newTransaction.incomeCategory : newTransaction.category) === (c.categoryNumber || c.id) ? "opacity-100" : "opacity-0")}/> 
                                                            {c.categoryNumber ? `(${c.categoryNumber}) ` : ''}{c.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {newTransactionType === 'income' && newTransaction.paymentStatus === 'paid' && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Deposit To</Label>
                                <Select value={newTransaction.depositedTo} onValueChange={v => setNewTransaction(p => ({...p, depositedTo: v}))}>
                                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                    <SelectContent>{defaultDepositAccounts.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">Explanation</Label>
                            <Textarea value={newTransaction.explanation} onChange={e => setNewTransaction(p => ({...p, explanation: e.target.value}))} className="col-span-3" rows={2} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Doc # / Link</Label>
                            <div className="col-span-3 flex gap-2">
                                <Input placeholder="Doc #" value={newTransaction.documentNumber} onChange={e => setNewTransaction(p => ({...p, documentNumber: e.target.value}))} className="w-1/3" />
                                <Input placeholder="Document URL..." value={newTransaction.documentUrl} onChange={e => setNewTransaction(p => ({...p, documentUrl: e.target.value}))} className="flex-1" />
                            </div>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 pt-2 border-t shrink-0">
                    <Button variant="ghost" onClick={() => setIsTransactionDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveTransaction}>
                        {newTransaction.paymentStatus === 'unpaid' ? (newTransactionType === 'income' ? 'Record Receivable' : 'Record Payable') : 'Post to Ledger'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!transactionToDelete} onOpenChange={setTransactionToDelete}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this ledger entry. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

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
