

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountingPageHeader } from "@/components/accounting/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, MoreVertical, BookOpen, Pencil, Trash2, LoaderCircle, Check, ChevronsUpDown, FilterX, Plus, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from '@/context/auth-context';
import { 
    getIncomeTransactions, addIncomeTransaction, updateIncomeTransaction, deleteIncomeTransaction, type IncomeTransaction, 
    getExpenseTransactions, addExpenseTransaction, updateExpenseTransaction, deleteExpenseTransaction, type ExpenseTransaction, 
    getCompanies, addCompany, type Company, 
    getExpenseCategories, addExpenseCategory, type ExpenseCategory,
    getIncomeCategories, addIncomeCategory, type IncomeCategory,
    getPayableBills, type PayableBill,
    deletePayableBill,
} from "@/services/accounting-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { InvoicePaymentsView } from "./invoice-payments-view";
import { AccountsPayableView } from "./accounts-payable-view";
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { format } from 'date-fns';
import { ScrollArea } from "../ui/scroll-area";
import { Calendar } from "../ui/calendar";


type GeneralTransaction = (IncomeTransaction | ExpenseTransaction) & { transactionType: 'income' | 'expense' };

const defaultDepositAccounts = ["Bank Account #1", "Credit Card #1", "Cash Account"];

const emptyTransactionForm = { date: '', company: '', description: '', totalAmount: '', taxRate: '', preTaxAmount: '', taxAmount: '', category: '', incomeCategory: '', explanation: '', documentNumber: '', documentUrl: '', type: 'business' as 'business' | 'personal', depositedTo: '' };

const tabTitles: Record<string, string> = {
    bks: 'BKS (General Ledger)',
    income: 'Income Ledger',
    expenses: 'Expense Ledger',
    receivables: 'Accounts Receivable',
    payables: 'Payables',
};


export function LedgersView() {
  const [incomeLedger, setIncomeLedger] = React.useState<IncomeTransaction[]>([]);
  const [expenseLedger, setExpenseLedger] = React.useState<ExpenseTransaction[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [expenseCategories, setExpenseCategories] = React.useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = React.useState<IncomeCategory[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const { user } = useAuth();
  
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = React.useState(false);
  const [transactionToEdit, setTransactionToEdit] = React.useState<GeneralTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = React.useState<GeneralTransaction | null>(null);
  const [newTransactionType, setNewTransactionType] = React.useState<'income' | 'expense'>('income');
  const [newTransaction, setNewTransaction] = React.useState(emptyTransactionForm);
  
  const [isCompanyPopoverOpen, setIsCompanyPopoverOpen] = React.useState(false);
  const [showAddCompany, setShowAddCompany] = React.useState(false);
  const [newCompanyName, setNewCompanyName] = React.useState('');

  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = React.useState(false);
  const [showAddExpenseCategory, setShowAddExpenseCategory] = React.useState(false);
  const [newExpenseCategoryName, setNewExpenseCategoryName] = React.useState('');
  
  const [isIncomeCategoryPopoverOpen, setIsIncomeCategoryPopoverOpen] = React.useState(false);
  const [showAddIncomeCategory, setShowAddIncomeCategory] = React.useState(false);
  const [newIncomeCategoryName, setNewIncomeCategoryName] = React.useState('');

  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);

  const [showTotals, setShowTotals] = React.useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const filterCategory = searchParams.get('category');
  const highlightedId = searchParams.get('highlight');
  const initialTab = searchParams.get('tab') || (filterCategory ? 'bks' : 'bks');
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const rowRefs = React.useRef<Map<string, HTMLTableRowElement | null>>(new Map());


  React.useEffect(() => {
    if (highlightedId && !isLoading) {
        const element = rowRefs.current.get(highlightedId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-primary/20', 'transition-all', 'duration-1000');
            setTimeout(() => {
                element.classList.remove('bg-primary/20');
            }, 2500);
        }
    }
  }, [highlightedId, isLoading]);

  React.useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [income, expenses, fetchedCompanies, fetchedExpenseCategories, fetchedIncomeCategories] = await Promise.all([
                getIncomeTransactions(user.uid),
                getExpenseTransactions(user.uid),
                getCompanies(user.uid),
                getExpenseCategories(user.uid),
                getIncomeCategories(user.uid),
            ]);
            setIncomeLedger(income);
            setExpenseLedger(expenses);
            setCompanies(fetchedCompanies);
            setExpenseCategories(fetchedExpenseCategories);
            setIncomeCategories(fetchedIncomeCategories);
        } catch (error: any) {
             toast({ variant: "destructive", title: "Failed to load ledger data", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, [user, toast]);
  

  const generalLedger = React.useMemo(() => {
    const combined: GeneralTransaction[] = [
      ...incomeLedger.map(item => ({ ...item, transactionType: 'income' as const })),
      ...expenseLedger.map(item => ({ ...item, transactionType: 'expense' as const })),
    ];
    
    if (filterCategory) {
        return combined.filter(item => {
            const itemCategory = item.transactionType === 'income' ? item.incomeCategory : item.category;
            // Also need to handle cases where the filter might be for "Sales, commissions, or fees"
            const standardIncomeCategory = "Sales, commissions, or fees";
            const isPrimaryIncome = item.transactionType === 'income' && item.incomeCategory !== 'Other income';
            
            if (filterCategory === standardIncomeCategory && isPrimaryIncome) {
                return true;
            }

            return itemCategory === filterCategory;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomeLedger, expenseLedger, filterCategory]);

  const incomeTotal = React.useMemo(() => incomeLedger.reduce((sum, item) => sum + item.totalAmount, 0), [incomeLedger]);
  const expenseTotal = React.useMemo(() => expenseLedger.reduce((sum, item) => sum + item.totalAmount, 0), [expenseLedger]);

    React.useEffect(() => {
        const totalAmount = parseFloat(newTransaction.totalAmount);
        const taxRate = parseFloat(newTransaction.taxRate);

        if (!isNaN(totalAmount) && !isNaN(taxRate) && taxRate > 0) {
            const preTax = totalAmount / (1 + taxRate / 100);
            const tax = totalAmount - preTax;
            setNewTransaction(prev => ({
                ...prev,
                preTaxAmount: preTax.toFixed(2),
                taxAmount: tax.toFixed(2)
            }));
        } else if (!isNaN(totalAmount)) {
             setNewTransaction(prev => ({
                ...prev,
                preTaxAmount: totalAmount.toFixed(2),
                taxAmount: '0.00'
            }));
        } else {
            setNewTransaction(prev => ({ ...prev, preTaxAmount: '', taxAmount: '' }));
        }
    }, [newTransaction.totalAmount, newTransaction.taxRate]);
  
    const handleOpenTransactionDialog = (type: 'income' | 'expense', transaction?: GeneralTransaction) => {
        setNewTransactionType(type);
        if (transaction) {
            setTransactionToEdit(transaction);
            const categoryName = type === 'income'
                ? incomeCategories.find(c => c.categoryNumber === transaction.incomeCategory)?.name || transaction.incomeCategory
                : expenseCategories.find(c => c.categoryNumber === transaction.category)?.name || transaction.category;
                
            setNewTransaction({
                date: transaction.date,
                company: transaction.company,
                description: transaction.description,
                totalAmount: String(transaction.totalAmount),
                taxRate: String(transaction.taxRate || ''),
                preTaxAmount: String(transaction.preTaxAmount || ''),
                taxAmount: String(transaction.taxAmount || ''),
                category: type === 'expense' ? categoryName : '',
                incomeCategory: type === 'income' ? categoryName : '',
                explanation: transaction.explanation || '',
                documentNumber: transaction.documentNumber || '',
                documentUrl: transaction.documentUrl || '',
                type: transaction.type || 'business',
                depositedTo: (transaction as IncomeTransaction).depositedTo || '',
            });
        } else {
            setTransactionToEdit(null);
            setNewTransaction({...emptyTransactionForm, date: format(new Date(), 'yyyy-MM-dd')});
        }
        setShowAddCompany(false);
        setShowAddExpenseCategory(false);
        setShowAddIncomeCategory(false);
        setIsTransactionDialogOpen(true);
    };

    const handleSaveTransaction = async () => {
        if (!user) return;
        const totalAmountNum = parseFloat(newTransaction.totalAmount);
        const taxRateNum = parseFloat(newTransaction.taxRate) || 0;
        
        let categoryNumber: string | undefined;
        if (newTransactionType === 'income') {
            categoryNumber = incomeCategories.find(c => c.name === newTransaction.incomeCategory)?.categoryNumber;
        } else {
            categoryNumber = expenseCategories.find(c => c.name === newTransaction.category)?.categoryNumber;
        }

        if (!newTransaction.date || !newTransaction.company || !categoryNumber || !newTransaction.totalAmount || isNaN(totalAmountNum) || totalAmountNum <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill all required fields correctly.' });
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
                 if (transactionToEdit.transactionType === 'income') {
                    const updatedData = { ...baseData, incomeCategory: categoryNumber, depositedTo: newTransaction.depositedTo };
                    await updateIncomeTransaction(transactionToEdit.id, updatedData);
                    setIncomeLedger(prev => prev.map(item => item.id === transactionToEdit.id ? { ...item, ...updatedData } : item));
                    toast({ title: "Income Transaction Updated" });
                } else {
                    const updatedData = { ...baseData, category: categoryNumber };
                    await updateExpenseTransaction(transactionToEdit.id, updatedData);
                    setExpenseLedger(prev => prev.map(item => item.id === transactionToEdit.id ? { ...item, ...updatedData } : item));
                    toast({ title: "Expense Transaction Updated" });
                }
            } else {
                 if (newTransactionType === 'income') {
                    const newEntryData: Omit<IncomeTransaction, 'id'> = { ...baseData, incomeCategory: categoryNumber, depositedTo: newTransaction.depositedTo, userId: user.uid };
                    const newEntry = await addIncomeTransaction(newEntryData);
                    setIncomeLedger(prev => [newEntry, ...prev]);
                    toast({ title: "Income Transaction Added" });
                } else {
                    const newEntryData: Omit<ExpenseTransaction, 'id'> = { ...baseData, category: categoryNumber, userId: user.uid };
                    const newEntry = await addExpenseTransaction(newEntryData);
                    setExpenseLedger(prev => [newEntry, ...prev]);
                    toast({ title: "Expense Transaction Added" });
                }
            }
            setIsTransactionDialogOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!transactionToDelete) return;
        try {
            if (transactionToDelete.transactionType === 'income') {
                await deleteIncomeTransaction(transactionToDelete.id);
                setIncomeLedger(prev => prev.filter(item => item.id !== transactionToDelete.id));
            } else {
                await deleteExpenseTransaction(transactionToDelete.id);
                setExpenseLedger(prev => prev.filter(item => item.id !== transactionToDelete.id));
            }
            toast({ title: 'Transaction Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setTransactionToDelete(null);
        }
    };
    
    const handleCreateCompany = async () => {
        if (!user || !newCompanyName.trim()) return;
        
        try {
            const newCompany = await addCompany({ name: newCompanyName.trim(), userId: user.uid });
            setCompanies(prev => [...prev, newCompany]);
            setNewTransaction(prev => ({ ...prev, company: newCompanyName.trim() }));
            setShowAddCompany(false);
            setNewCompanyName('');
            toast({ title: 'Company Created', description: `"${newCompanyName.trim()}" has been added.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to create company', description: error.message });
        }
    };

    const handleCreateExpenseCategory = async () => {
        if (!user || !newExpenseCategoryName.trim()) return;
        try {
            const newCategory = await addExpenseCategory({ name: newExpenseCategoryName.trim(), userId: user.uid });
            setExpenseCategories(prev => [...prev, newCategory]);
            setNewTransaction(prev => ({ ...prev, category: newExpenseCategoryName.trim() }));
            setShowAddExpenseCategory(false);
            setNewExpenseCategoryName('');
            toast({ title: 'Category Created', description: `"${newExpenseCategoryName.trim()}" has been added.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to create category', description: error.message });
        }
    };

    const handleCreateIncomeCategory = async () => {
        if (!user || !newIncomeCategoryName.trim()) return;
        try {
            const newCategory = await addIncomeCategory({ name: newIncomeCategoryName.trim(), userId: user.uid });
            setIncomeCategories(prev => [...prev, newCategory]);
            setNewTransaction(prev => ({ ...prev, incomeCategory: newIncomeCategoryName.trim() }));
            setShowAddIncomeCategory(false);
            setNewIncomeCategoryName('');
            toast({ title: 'Category Created', description: `"${newIncomeCategoryName.trim()}" has been added.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to create category', description: error.message });
        }
    };

    const renderDocumentNumber = (item: GeneralTransaction) => {
        if (item.documentUrl) {
            return (
                <a href={item.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {item.documentNumber || 'View'}
                </a>
            );
        }
        return item.documentNumber;
    };
    
  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle={tabTitles[activeTab] || 'Ledgers'} hubPath="/accounting" hubLabel="Accounting Tools" />
        <div className="flex flex-col">
          <header className="text-center mb-6 w-full mx-auto">
            <h1 className="text-3xl font-bold font-headline text-primary">BKS Ledgers</h1>
            <p className="text-muted-foreground">A unified view of your income and expenses.</p>
          </header>

            <Tabs defaultValue={initialTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-center items-center mb-4">
                <TabsList>
                  <TabsTrigger value="bks">BKS (General Ledger)</TabsTrigger>
                  <TabsTrigger value="income">Income</TabsTrigger>
                  <TabsTrigger value="expenses">Expenses</TabsTrigger>
                  <TabsTrigger value="receivables">Accounts Receivable</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="bks">
                <Card>
                  <CardHeader className="flex flex-col items-center">
                    <div className="text-center">
                      <CardTitle>BKS General Ledger</CardTitle>
                      <CardDescription>A combined view of all income and expense transactions.</CardDescription>
                    </div>
                     {filterCategory && (
                        <div className="mt-4 flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 p-2 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                            <span>Filtering by category: <strong>{filterCategory}</strong></span>
                            <Button variant="ghost" size="sm" onClick={() => router.push('/accounting/ledgers')} className="h-auto p-1 text-blue-800 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/30">
                                <FilterX className="mr-1 h-4 w-4" /> Clear Filter
                            </Button>
                        </div>
                    )}
                    <div className="flex items-center justify-center gap-2 pt-4">
                        <Button variant="outline" onClick={() => handleOpenTransactionDialog('income')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Post Transaction
                        </Button>
                        <Button variant="outline" onClick={() => setShowTotals(!showTotals)}>Totals</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {showTotals && (
                      <div className="mb-4 rounded-lg border bg-muted/50 p-3">
                        <div className="w-full max-w-xs space-y-1 text-right ml-auto">
                          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Income:</span><span className="font-mono font-medium text-green-600">{incomeTotal.toLocaleString("en-US", { style: "currency", currency: "USD" })}</span></div>
                          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Expenses:</span><span className="font-mono font-medium text-red-600">({expenseTotal.toLocaleString("en-US", { style: "currency", currency: "USD" })})</span></div>
                          <Separator className="my-1" />
                          <div className="flex justify-between text-sm font-semibold"><span>Net Position:</span><span className="font-mono">{(incomeTotal - expenseTotal).toLocaleString("en-US", { style: "currency", currency: "USD" })}</span></div>
                        </div>
                      </div>
                    )}
                    {isLoading ? <div className="flex justify-center h-48 items-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div> : (
                        <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Company</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Type</TableHead><TableHead>Doc #</TableHead><TableHead className="text-right">Pre-Tax</TableHead><TableHead className="text-right">Tax</TableHead><TableHead className="text-right">Total</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                        <TableBody>
                            {generalLedger.map((item) => {
                                const categoryName = item.transactionType === 'income' 
                                    ? incomeCategories.find(c => c.categoryNumber === item.incomeCategory)?.name 
                                    : expenseCategories.find(c => c.categoryNumber === item.category)?.name;
                                return (
                                <TableRow key={item.id} ref={el => rowRefs.current.set(item.id, el)}>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>{item.company}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>{categoryName || (item.transactionType === 'income' ? item.incomeCategory : item.category)}</TableCell>
                                    <TableCell><Badge variant={item.transactionType === 'income' ? 'secondary' : 'destructive'} className={cn(item.transactionType === 'income' && 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200')}>{item.transactionType}</Badge></TableCell>
                                    <TableCell>{renderDocumentNumber(item as GeneralTransaction)}</TableCell>
                                    <TableCell className="text-right font-mono">{(item.preTaxAmount ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</TableCell>
                                    <TableCell className="text-right font-mono text-muted-foreground">{(item.taxAmount ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</TableCell>
                                    <TableCell className={cn("text-right font-mono font-semibold", item.transactionType === 'income' ? 'text-green-600' : 'text-red-600')}>{(item.totalAmount ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</TableCell>
                                    <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => handleOpenTransactionDialog(item.transactionType, item)}><BookOpen className="mr-2 h-4 w-4"/>Open</DropdownMenuItem><DropdownMenuItem onSelect={() => handleOpenTransactionDialog(item.transactionType, item)}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={() => setTransactionToDelete(item)}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                                </TableRow>
                                );
                            })}
                        </TableBody>
                        </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

               <TabsContent value="income">
                 <Card>
                    <CardHeader className="flex flex-col items-center justify-between sm:flex-row">
                        <div className="text-center sm:text-left"><CardTitle>Income Transactions</CardTitle><CardDescription>A list of all recorded income.</CardDescription></div>
                        <Button variant="outline" onClick={() => handleOpenTransactionDialog('income')}><PlusCircle className="mr-2 h-4 w-4" /> Add Income</Button>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <div className="flex justify-center items-center h-48"><LoaderCircle className="h-8 w-8 animate-spin" /></div> : (
                            <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Company</TableHead><TableHead>Doc #</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Pre-Tax</TableHead><TableHead className="text-right">Tax</TableHead><TableHead className="text-right">Total</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                                <TableBody>{incomeLedger.map(item => ( <TableRow key={item.id}><TableCell>{item.date}</TableCell><TableCell>{item.company}</TableCell><TableCell>{renderDocumentNumber(item as GeneralTransaction)}</TableCell><TableCell>{item.description}</TableCell><TableCell>{incomeCategories.find(c => c.categoryNumber === item.incomeCategory)?.name || item.incomeCategory}</TableCell><TableCell className="text-right font-mono">{(item.preTaxAmount ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</TableCell><TableCell className="text-right font-mono text-muted-foreground">{(item.taxAmount ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</TableCell><TableCell className="text-right font-mono font-semibold text-green-600">{(item.totalAmount ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => handleOpenTransactionDialog('income', {...item, transactionType: 'income'})}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={() => setTransactionToDelete({...item, transactionType: 'income'})}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>))}</TableBody>
                            </Table>
                        )}
                    </CardContent>
                 </Card>
               </TabsContent>

               <TabsContent value="expenses">
                <Card>
                    <CardHeader className="flex flex-col items-center justify-between sm:flex-row">
                        <div className="text-center sm:text-left"><CardTitle>Expense Transactions</CardTitle><CardDescription>A list of all recorded expenses.</CardDescription></div>
                        <Button variant="outline" onClick={() => handleOpenTransactionDialog('expense')}><PlusCircle className="mr-2 h-4 w-4" /> Add Expense</Button>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <div className="flex justify-center items-center h-48"><LoaderCircle className="h-8 w-8 animate-spin" /></div> : (
                            <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Company</TableHead><TableHead>Doc #</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Pre-Tax</TableHead><TableHead className="text-right">Tax</TableHead><TableHead className="text-right">Total</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                                <TableBody>{expenseLedger.map(item => (<TableRow key={item.id}><TableCell>{item.date}</TableCell><TableCell>{item.company}</TableCell><TableCell>{renderDocumentNumber(item as GeneralTransaction)}</TableCell><TableCell>{item.description}</TableCell><TableCell>{expenseCategories.find(c => c.categoryNumber === item.category)?.name || item.category}</TableCell><TableCell className="text-right font-mono">{(item.preTaxAmount ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</TableCell><TableCell className="text-right font-mono text-muted-foreground">{(item.taxAmount ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</TableCell><TableCell className="text-right font-mono font-semibold text-red-600">{(item.totalAmount ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}</TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => handleOpenTransactionDialog('expense', {...item, transactionType: 'expense'})}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem><DropdownMenuItem className="text-destructive" onSelect={() => setTransactionToDelete({...item, transactionType: 'expense'})}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>))}</TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
               </TabsContent>

               <TabsContent value="receivables">
                    <InvoicePaymentsView />
               </TabsContent>

            </Tabs>
        </div>
      </div>
      
      {/* Add/Edit Transaction Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="text-center sm:text-center shrink-0">
            <DialogTitle className="text-2xl text-primary font-bold">{transactionToEdit ? 'Edit Transaction' : `Post New ${newTransactionType === 'income' ? 'Income' : 'Expense'}`}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="grid gap-4 py-4 px-6">
                <RadioGroup value={newTransactionType} onValueChange={(value) => setNewTransactionType(value as 'income' | 'expense')} className="grid grid-cols-2 gap-4">
                    <div><RadioGroupItem value="income" id="r-income" className="peer sr-only" /><Label htmlFor="r-income" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-600 [&:has([data-state=checked])]:border-green-600">Income</Label></div>
                    <div><RadioGroupItem value="expense" id="r-expense" className="peer sr-only" /><Label htmlFor="r-expense" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-600 [&:has([data-state=checked])]:border-red-600">Expense</Label></div>
                </RadioGroup>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tx-date-gl" className="text-right">Date <span className="text-destructive">*</span></Label>
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("col-span-3 justify-start text-left font-normal", !newTransaction.date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {newTransaction.date ? format(new Date(newTransaction.date), "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newTransaction.date ? new Date(newTransaction.date) : undefined} onSelect={(date) => { if (date) setNewTransaction(p => ({ ...p, date: format(date, 'yyyy-MM-dd') })); setIsDatePickerOpen(false); }} initialFocus /></PopoverContent>
                    </Popover>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tx-company-gl" className="text-right">Company <span className="text-destructive">*</span></Label>
                    <div className="col-span-3 space-y-2">
                        <div className="flex gap-2">
                            <Popover open={isCompanyPopoverOpen} onOpenChange={setIsCompanyPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between">
                                        {newTransaction.company || "Select company..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command><CommandInput placeholder="Search company..." /><CommandList><CommandEmpty>No company found.</CommandEmpty><CommandGroup>{companies.map((c) => (<CommandItem key={c.id} value={c.name} onSelect={() => { setNewTransaction(prev => ({ ...prev, company: c.name })); setIsCompanyPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", newTransaction.company.toLowerCase() === c.name.toLowerCase() ? "opacity-100" : "opacity-0")} />{c.name}</CommandItem>))}</CommandGroup></CommandList></Command>
                                </PopoverContent>
                            </Popover>
                            <Button variant="outline" onClick={() => setShowAddCompany(p => !p)}>{showAddCompany ? 'Cancel' : 'Add New'}</Button>
                        </div>
                        {showAddCompany && <div className="flex gap-2 animate-in fade-in-50"><Input placeholder="New company name..." value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} /><Button onClick={handleCreateCompany}><Plus className="mr-2 h-4 w-4"/>Add</Button></div>}
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="tx-description-gl" className="text-right">Description</Label><Input id="tx-description-gl" value={newTransaction.description} onChange={(e) => setNewTransaction(prev => ({...prev, description: e.target.value}))} className="col-span-3" /></div>
                
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="tx-totalAmount-gl" className="text-right">Total Amount <span className="text-destructive">*</span></Label><div className="relative col-span-3"><span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span><Input id="tx-totalAmount-gl" type="number" value={newTransaction.totalAmount} onChange={(e) => setNewTransaction(prev => ({...prev, totalAmount: e.target.value}))} className="pl-7" step="0.01" placeholder="0.00"/></div></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="tx-taxRate-gl" className="text-right">Tax Rate (%)</Label><Input id="tx-taxRate-gl" type="number" value={newTransaction.taxRate} onChange={(e) => setNewTransaction(prev => ({...prev, taxRate: e.target.value}))} className="col-span-3" placeholder="e.g., 15"/></div>
                
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

                {newTransactionType === 'income' ? (
                    <>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tx-income-category-gl" className="text-right">Income Category <span className="text-destructive">*</span></Label>
                        <div className="col-span-3 space-y-2">
                            <div className="flex gap-2">
                                <Popover open={isIncomeCategoryPopoverOpen} onOpenChange={setIsIncomeCategoryPopoverOpen}>
                                    <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">{newTransaction.incomeCategory || "Select category..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search category..." /><CommandList><CommandEmpty>No category found.</CommandEmpty><CommandGroup>{incomeCategories.map((c) => (<CommandItem key={c.id} value={c.name} onSelect={() => { setNewTransaction(prev => ({ ...prev, incomeCategory: c.name })); setIsIncomeCategoryPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", newTransaction.incomeCategory.toLowerCase() === c.name.toLowerCase() ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                                </Popover>
                                <Button variant="outline" onClick={() => setShowAddIncomeCategory(p => !p)}>{showAddIncomeCategory ? 'Cancel' : 'Add New'}</Button>
                            </div>
                            {showAddIncomeCategory && <div className="flex gap-2 animate-in fade-in-50"><Input placeholder="New income category..." value={newIncomeCategoryName} onChange={e => setNewIncomeCategoryName(e.target.value)} /><Button onClick={handleCreateIncomeCategory}><Plus className="mr-2 h-4 w-4"/>Add</Button></div>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="tx-deposit-account-gl" className="text-right">Deposited To</Label><div className="col-span-3"><Select value={newTransaction.depositedTo} onValueChange={(value) => setNewTransaction(prev => ({...prev, depositedTo: value}))}><SelectTrigger id="tx-deposit-account-gl" className="w-full"><SelectValue placeholder="Select an account" /></SelectTrigger><SelectContent>{defaultDepositAccounts.map(acc => <SelectItem key={acc} value={acc}>{acc}</SelectItem>)}</SelectContent></Select></div></div>
                    </>
                ) : (
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tx-category-gl" className="text-right">Category <span className="text-destructive">*</span></Label>
                        <div className="col-span-3 space-y-2">
                            <div className="flex gap-2">
                                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                                    <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">{newTransaction.category || "Select category..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search category..." /><CommandList><CommandEmpty>No category found.</CommandEmpty><CommandGroup>{expenseCategories.map((c) => (<CommandItem key={c.id} value={c.name} onSelect={() => { setNewTransaction(prev => ({ ...prev, category: c.name })); setIsCategoryPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", newTransaction.category.toLowerCase() === c.name.toLowerCase() ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                                </Popover>
                                <Button variant="outline" onClick={() => setShowAddExpenseCategory(p => !p)}>{showAddExpenseCategory ? 'Cancel' : 'Add New'}</Button>
                            </div>
                            {showAddExpenseCategory && <div className="flex gap-2 animate-in fade-in-50"><Input placeholder="New expense category..." value={newExpenseCategoryName} onChange={e => setNewExpenseCategoryName(e.target.value)} /><Button onClick={handleCreateExpenseCategory}><Plus className="mr-2 h-4 w-4"/>Add</Button></div>}
                        </div>
                    </div>
                )}
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tx-category-num-gl" className="text-right">Category #</Label>
                    <Input 
                        id="tx-category-num-gl" 
                        readOnly 
                        disabled 
                        value={(newTransactionType === 'income'
                            ? incomeCategories.find(c => c.name === newTransaction.incomeCategory)?.categoryNumber
                            : expenseCategories.find(c => c.name === newTransaction.category)?.categoryNumber) || ''
                        } 
                        className="col-span-3 bg-muted/50" 
                    />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="tx-explanation-gl" className="text-right">Explanation</Label><Input id="tx-explanation-gl" value={newTransaction.explanation} onChange={(e) => setNewTransaction(prev => ({...prev, explanation: e.target.value}))} className="col-span-3" /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="tx-doc-number-gl" className="text-right">Doc #</Label><Input id="tx-doc-number-gl" value={newTransaction.documentNumber} onChange={(e) => setNewTransaction(prev => ({...prev, documentNumber: e.target.value}))} className="col-span-3" /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="tx-doc-url-gl" className="text-right">Doc Link</Label><Input id="tx-doc-url-gl" placeholder="https://..." value={newTransaction.documentUrl} onChange={(e) => setNewTransaction(prev => ({...prev, documentUrl: e.target.value}))} className="col-span-3" /></div>
                <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="tx-type-gl" className="text-right">Type</Label><RadioGroup value={newTransaction.type} onValueChange={(value: 'business' | 'personal') => setNewTransaction(prev => ({ ...prev, type: value }))} className="col-span-3 flex items-center space-x-4" id="tx-type-gl"><div className="flex items-center space-x-2"><RadioGroupItem value="business" id="type-business-gl" /><Label htmlFor="type-business-gl">Business</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="personal" id="type-personal-gl" /><Label htmlFor="type-personal-gl">Personal</Label></div></RadioGroup></div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 pt-2 border-t shrink-0">
            <Button variant="ghost" onClick={() => setIsTransactionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTransaction}>{transactionToEdit ? 'Save Changes' : 'Save Transaction'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete the transaction: "{transactionToDelete?.description}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
