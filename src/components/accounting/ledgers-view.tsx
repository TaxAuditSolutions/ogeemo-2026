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
    FilterX
} from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/auth-context';
import { 
    getIncomeTransactions, addIncomeTransaction, updateIncomeTransaction, deleteIncomeTransaction, type IncomeTransaction, 
    getExpenseTransactions, addExpenseTransaction, updateExpenseTransaction, deleteExpenseTransaction, type ExpenseTransaction, 
    getExpenseCategories, addExpenseCategory, type ExpenseCategory,
    getIncomeCategories, addIncomeCategory, type IncomeCategory,
} from '@/services/accounting-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomCalendar } from "@/components/ui/custom-calendar";
import Link from "next/link";
import ContactFormDialog from "@/components/contacts/contact-form-dialog";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useReactToPrint } from "@/hooks/use-react-to-print";

type GeneralTransaction = (IncomeTransaction | ExpenseTransaction) & { transactionType: 'income' | 'expense' };

const defaultDepositAccounts = ["Bank Account #1", "Credit Card #1", "Cash Account"];
const emptyTransactionForm = { 
    date: format(new Date(), 'yyyy-MM-dd'), 
    company: '', 
    description: '', 
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
    depositedTo: 'Bank Account #1' 
};

export function LedgersView() {
  const [incomeLedger, setIncomeLedger] = React.useState<IncomeTransaction[]>([]);
  const [expenseLedger, setExpenseLedger] = React.useState<ExpenseTransaction[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [contactFolders, setContactFolders] = React.useState<FolderData[]>([]);
  const [expenseCategories, setExpenseCategories] = React.useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = React.useState<IncomeCategory[]>([]);
  const [customIndustries, setCustomIndustries] = React.useState<Industry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = React.useState(false);
  const [transactionToEdit, setTransactionToEdit] = React.useState<GeneralTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = React.useState<GeneralTransaction | null>(null);
  const [newTransactionType, setNewTransactionType] = React.useState<'income' | 'expense'>('income');
  const [newTransaction, setNewTransaction] = React.useState(emptyTransactionForm);
  
  const [isContactFormOpen, setIsContactFormOpen] = React.useState(false);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = React.useState(false);
  const [contactSearchValue, setContactSearchValue] = React.useState('');

  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

  // Filter State
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  const [isStartFilterOpen, setIsStartFilterOpen] = React.useState(false);
  const [isEndFilterOpen, setIsEndFilterOpen] = React.useState(false);

  // New Category State
  const [showAddCategory, setShowAddCategory] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');

  const { user } = useAuth();
  const { toast } = useToast();
  const { preferences, updatePreferences } = useUserPreferences();
  const { handlePrint, contentRef } = useReactToPrint();
  
  const searchParams = useSearchParams();
  const highlightedId = searchParams ? searchParams.get('highlight') : null;
  const initialTab = searchParams ? searchParams.get('tab') : 'all';
  const autoEdit = searchParams ? searchParams.get('edit') === 'true' : false;
  
  const [activeTab, setActiveTab] = React.useState(initialTab || 'all');

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
        const [income, expenses, fetchedContacts, fetchedFolders, fetchedExpenseCategories, fetchedIncomeCategories, fetchedIndustries] = await Promise.all([
            getIncomeTransactions(user.uid), 
            getExpenseTransactions(user.uid), 
            getContacts(user.uid),
            getContactFolders(user.uid),
            getExpenseCategories(user.uid), 
            getIncomeCategories(user.uid),
            getIndustries(user.uid),
        ]);
        setIncomeLedger(income); 
        setExpenseLedger(expenses); 
        setContacts(fetchedContacts);
        setContactFolders(fetchedFolders);
        setExpenseCategories(fetchedExpenseCategories); 
        setIncomeCategories(fetchedIncomeCategories);
        setCustomIndustries(fetchedIndustries);
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); }
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
          depositedTo: tx.transactionType === 'income' ? (tx as IncomeTransaction).depositedTo : '',
      });
      setIsTransactionDialogOpen(true);
  };

  // Deep linking and scroll effect
  React.useEffect(() => {
    if (highlightedId && !isLoading) {
        // Switch tab if needed
        if (initialTab && initialTab !== activeTab) {
            setActiveTab(initialTab);
        }
        
        // Handle "One-Click Edit"
        if (autoEdit) {
            const tx = generalLedger.find(t => t.id === highlightedId);
            if (tx) {
                handleEditTransaction(tx);
            }
        }
        
        // Use a short timeout to ensure the DOM has rendered the specific tab content
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

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSaveTransaction = async () => {
      if (!user) return;
      const totalAmountNum = parseFloat(newTransaction.totalAmount);
      const taxRateNum = parseFloat(newTransaction.taxRate) || 0;
      
      const selectedCategoryNumber = newTransactionType === 'income' ? newTransaction.incomeCategory : newTransaction.category;

      if (!newTransaction.date || !newTransaction.company || !selectedCategoryNumber || !newTransaction.totalAmount || isNaN(totalAmountNum)) {
          toast({ variant: 'destructive', title: 'Missing Information', description: 'Please ensure Date, Contact, Category, and Amount are provided.' });
          return;
      }

      const preTaxAmount = totalAmountNum / (1 + taxRateNum / 100);
      const taxAmount = totalAmountNum - preTaxAmount;
      
      const baseData = {
          date: newTransaction.date,
          company: newTransaction.company,
          description: newTransaction.description,
          totalAmount: totalAmountNum,
          preTaxAmount: preTaxAmount,
          taxAmount: taxAmount,
          taxRate: taxRateNum,
          explanation: newTransaction.explanation,
          documentNumber: newTransaction.documentNumber,
          documentUrl: newTransaction.documentUrl,
          type: newTransaction.type,
      };

      try {
          if (transactionToEdit) {
              if (newTransactionType === 'income') {
                  await updateIncomeTransaction(transactionToEdit.id, { ...baseData, incomeCategory: selectedCategoryNumber, depositedTo: newTransaction.depositedTo });
              } else {
                  await updateExpenseTransaction(transactionToEdit.id, { ...baseData, category: selectedCategoryNumber });
              }
              toast({ title: "Transaction Updated" });
          } else {
              if (newTransactionType === 'income') {
                  const newEntryData: Omit<IncomeTransaction, 'id'> = { ...baseData, incomeCategory: selectedCategoryNumber, depositedTo: newTransaction.depositedTo, userId: user.uid };
                  await addIncomeTransaction(newEntryData);
                  toast({ title: "Income Transaction Added" });
              } else {
                  const newEntryData: Omit<ExpenseTransaction, 'id'> = { ...baseData, category: selectedCategoryNumber, userId: user.uid };
                  await addExpenseTransaction(newEntryData);
                  toast({ title: "Expense Transaction Added" });
              }
          }
          setIsTransactionDialogOpen(false);
          loadData();
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
      }
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete || !user) return;
    try {
        if (transactionToDelete.transactionType === 'income') {
            await deleteIncomeTransaction(transactionToDelete.id);
            setIncomeLedger(prev => prev.filter(tx => tx.id !== transactionToDelete.id));
        } else {
            await deleteExpenseTransaction(transactionToDelete.id);
            setExpenseLedger(prev => prev.filter(tx => tx.id !== transactionToDelete.id));
        }
        toast({ title: 'Transaction Deleted' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
        setTransactionToDelete(null);
    }
  };

  const handleCreateCategory = async () => {
    if (!user || !newCategoryName.trim()) return;
    try {
        if (newTransactionType === 'income') {
            const newCat = await addIncomeCategory({ name: newCategoryName.trim(), userId: user.uid, categoryNumber: '' });
            setIncomeCategories(prev => [...prev, newCat].sort((a,b) => a.name.localeCompare(b.name)));
            setNewTransaction(prev => ({ ...prev, incomeCategory: newCat.categoryNumber || newCat.id }));
        } else {
            const newCat = await addExpenseCategory({ name: newCategoryName.trim(), userId: user.uid, categoryNumber: '' });
            setExpenseCategories(prev => [...prev, newCat].sort((a,b) => a.name.localeCompare(b.name)));
            setNewTransaction(prev => ({ ...prev, category: newCat.categoryNumber || newCat.id }));
        }
        setShowAddCategory(false);
        setNewCategoryName('');
        toast({ title: 'Category Created' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to create category', description: error.message });
    }
  };

  const clearFilters = () => {
      setStartDate(undefined);
      setEndDate(undefined);
  };

  const handleContactSave = (contact: Contact, isEditing: boolean) => {
      if (isEditing) {
          setContacts(prev => prev.map(c => c.id === contact.id ? contact : c));
      } else {
          setContacts(prev => [...prev, contact]);
      }
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
                            ${item.totalAmount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center print:hidden">
                            {item.documentUrl ? (
                                <a href={item.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                    <LinkIcon className="h-4 w-4 mx-auto" />
                                </a>
                            ) : '-'}
                        </TableCell>
                        <TableCell className="print:hidden">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => handleEditTransaction(item)}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setTransactionToDelete(item)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
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
                        ${(type === 'income' ? incomeTotal : type === 'expense' ? expenseTotal : netIncome).toFixed(2)}
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
            <p className="text-muted-foreground">Comprehensive record of all business income and expenses.</p>
            <div className="absolute top-0 right-0">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/action-manager"><X className="h-5 w-5"/></Link>
                </Button>
            </div>
        </header>

        {/* Filter & Print Bar */}
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
                            <Button variant="outline" className={cn("w-48 justify-start text-left font-normal", !endDate && "text-muted-foreground")} disabled={!startDate}>
                                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                {endDate ? format(endDate, "PPP") : <span>End of time</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <CustomCalendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setIsEndFilterOpen(false); }} disabled={(date) => startDate ? date < startDate : false} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
                <Button variant="ghost" onClick={clearFilters} disabled={!startDate && !endDate}>
                    <FilterX className="mr-2 h-4 w-4"/> Clear
                </Button>
            </CardContent>
        </Card>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto print:hidden">
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
                <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600"/> Total Income</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-green-600">${incomeTotal.toFixed(2)}</p></CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200">
                <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-600"/> Total Expenses</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-red-600">${expenseTotal.toFixed(2)}</p></CardContent>
            </Card>
            <Card className={cn("border-primary/20", netIncome >= 0 ? "bg-primary/5" : "bg-red-50")}>
                <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary"/> Net Position</CardTitle></CardHeader>
                <CardContent className="p-4 pt-0"><p className={cn("text-2xl font-bold", netIncome >= 0 ? "text-primary" : "text-destructive")}>${netIncome.toFixed(2)}</p></CardContent>
            </Card>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6" ref={contentRef}>
            {/* Print Header */}
            <div className="hidden print:block text-center mb-8 border-b pb-4">
                <h1 className="text-3xl font-bold">BKS General Ledger Report</h1>
                <p className="text-muted-foreground mt-2">
                    Period: {startDate ? format(startDate, 'PP') : 'Beginning'} to {endDate ? format(endDate, 'PP') : 'Present'}
                </p>
                <p className="text-xs mt-1">Generated on {format(new Date(), 'PPPP')}</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto print:hidden">
                    <TabsTrigger value="all">General Ledger</TabsTrigger>
                    <TabsTrigger value="income">Income</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-6 space-y-4">
                    <div className="hidden print:block mb-4"><h3 className="text-xl font-bold">Consolidated Transaction Registry</h3></div>
                    {isLoading ? <div className="flex justify-center p-12"><LoaderCircle className="h-8 w-8 animate-spin" /></div> : renderTable(generalLedger, 'all')}
                </TabsContent>
                
                <TabsContent value="income" className="mt-6 space-y-4">
                    <div className="hidden print:block mb-4"><h3 className="text-xl font-bold">Income Registry</h3></div>
                    {isLoading ? <div className="flex justify-center p-12"><LoaderCircle className="h-8 w-8 animate-spin" /></div> : renderTable(filteredIncome.map(i => ({ ...i, transactionType: 'income' as const })), 'income')}
                </TabsContent>
                
                <TabsContent value="expenses" className="mt-6 space-y-4">
                    <div className="hidden print:block mb-4"><h3 className="text-xl font-bold">Expense Registry</h3></div>
                    {isLoading ? <div className="flex justify-center p-12"><LoaderCircle className="h-8 w-8 animate-spin" /></div> : renderTable(filteredExpenses.map(e => ({ ...e, transactionType: 'expense' as const })), 'expense')}
                </TabsContent>
            </Tabs>
        </div>

        {/* Transaction Dialog */}
        <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
            <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
                <DialogHeader className="text-center shrink-0">
                    <DialogTitle className="text-2xl text-primary font-bold">{transactionToEdit ? 'Edit' : 'Post'} Transaction</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 min-h-0">
                    <div className="grid gap-4 py-4 px-6">
                        <RadioGroup value={newTransactionType} onValueChange={(v) => setNewTransactionType(v as 'income' | 'expense')} className="grid grid-cols-2 gap-4">
                            <div><RadioGroupItem value="income" id="r-income" className="peer sr-only"/><Label htmlFor="r-income" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-600">Income</Label></div>
                            <div><RadioGroupItem value="expense" id="r-expense" className="peer sr-only"/><Label htmlFor="r-expense" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-600">Expense</Label></div>
                        </RadioGroup>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Date *</Label>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !newTransaction.date && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {newTransaction.date ? format(new Date(newTransaction.date), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><CustomCalendar mode="single" selected={newTransaction.date ? new Date(newTransaction.date) : undefined} onSelect={(date) => { if (date) setNewTransaction(p => ({ ...p, date: format(date, 'yyyy-MM-dd') })); setIsDatePickerOpen(false); }} initialFocus /></PopoverContent>
                            </Popover>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Contact *</Label>
                            <div className="col-span-3 flex gap-2">
                                <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="flex-1 justify-between">
                                            <span className="truncate">{newTransaction.company || "Select contact..."}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search contact..." value={contactSearchValue} onValueChange={setContactSearchValue}/>
                                            <CommandList>
                                                <CommandEmpty>No contact found.</CommandEmpty>
                                                <CommandGroup>
                                                    {contacts.map(c => (
                                                        <CommandItem 
                                                            key={c.id} 
                                                            value={c.name} 
                                                            onSelect={() => { 
                                                                setNewTransaction(p => ({ ...p, company: c.name })); 
                                                                setIsContactPopoverOpen(false); 
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", newTransaction.company === c.name ? "opacity-100" : "opacity-0")} />
                                                            {c.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Button variant="outline" size="icon" onClick={() => setIsContactFormOpen(true)}>
                                    <UserPlus className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Amount *</Label>
                            <div className="relative col-span-3">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                <input type="number" step="0.01" min="0" value={newTransaction.totalAmount} onChange={e => setNewTransaction(p => ({ ...p, totalAmount: e.target.value.replace(/[^-0-9.]/g, '').replace(/^-/, '') }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-7" placeholder="0.00" />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Category *</Label>
                            <div className="col-span-3 space-y-2">
                                <div className="flex gap-2">
                                    <Select 
                                        value={newTransactionType === 'income' ? newTransaction.incomeCategory : newTransaction.category} 
                                        onValueChange={v => setNewTransaction(p => ({ ...p, [newTransactionType === 'income' ? 'incomeCategory' : 'category']: v }))}
                                    >
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select tax category..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(newTransactionType === 'income' ? incomeCategories : expenseCategories).map(c => (
                                                <SelectItem key={c.id} value={c.categoryNumber || c.id}>
                                                    {c.name} {c.categoryNumber ? `(${c.categoryNumber})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="icon" onClick={() => setShowAddCategory(!showAddCategory)} title="Add custom category">
                                        <Plus className="h-4 w-4"/>
                                    </Button>
                                </div>
                                {showAddCategory && (
                                    <div className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                                        <Input 
                                            placeholder="New category name..." 
                                            value={newCategoryName} 
                                            onChange={e => setNewCategoryName(e.target.value)} 
                                            onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                                        />
                                        <Button size="sm" onClick={handleCreateCategory}>Add</Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <div className="flex flex-col items-end">
                                <Label htmlFor="tx-taxRate-gl" className="text-right">Tax Rate (%)</Label>
                                <Button 
                                    type="button" 
                                    variant="link" 
                                    className="h-auto p-0 text-[10px] text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                        const rate = parseFloat(newTransaction.taxRate);
                                        if (!isNaN(rate)) {
                                            updatePreferences({ defaultTaxRate: rate });
                                            toast({ title: "Default Rate Saved", description: `${rate}% is now your default tax rate.` });
                                        }
                                    }}
                                >
                                    Set as default
                                </Button>
                            </div>
                            <div className="relative col-span-3">
                                <Input 
                                    id="tx-taxRate-gl" 
                                    type="number" 
                                    min="0" 
                                    max="100" 
                                    step="0.1" 
                                    value={newTransaction.taxRate} 
                                    onChange={e => setNewTransaction(p => ({ ...p, taxRate: e.target.value.replace(/[^-0-9.]/g, '').replace(/^-/, '') }))} 
                                    className="pr-8" 
                                    placeholder="e.g., 15" 
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Pre-Tax Amount</Label>
                            <div className="relative col-span-3">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                <Input value={newTransaction.preTaxAmount} readOnly disabled className="pl-7 bg-muted/50" />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Tax Amount</Label>
                            <div className="relative col-span-3">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                <Input value={newTransaction.taxAmount} readOnly disabled className="pl-7 bg-muted/50" />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Description</Label>
                            <Textarea value={newTransaction.description} onChange={e => setNewTransaction(p => ({ ...p, description: e.target.value }))} className="col-span-3" rows={3} placeholder="Optional details..."/>
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Doc Link</Label>
                            <Input value={newTransaction.documentUrl} onChange={e => setNewTransaction(p => ({ ...p, documentUrl: e.target.value }))} className="col-span-3" placeholder="Link to source file..."/>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 pt-2 border-t shrink-0">
                    <Button variant="ghost" onClick={() => setIsTransactionDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveTransaction}>Save Transaction</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this transaction record. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
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
            companies={[]}
            onCompaniesChange={() => {}}
            customIndustries={customIndustries}
            onCustomIndustriesChange={setCustomIndustries}
        />
    </div>
  );
}
