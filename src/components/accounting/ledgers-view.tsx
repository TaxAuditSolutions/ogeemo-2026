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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountingPageHeader } from "@/components/accounting/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, MoreVertical, BookOpen, Pencil, Trash2, LoaderCircle, Check, ChevronsUpDown, FilterX, Plus, Calendar as CalendarIcon, X, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
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
} from '@/services/accounting-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { format } from 'date-fns';
import { ScrollArea } from "../ui/scroll-area";
import { Calendar } from "../ui/calendar";
import Link from "next/link";

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
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [expenseCategories, setExpenseCategories] = React.useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = React.useState<IncomeCategory[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
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

  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const highlightedId = searchParams.get('highlight');
  const rowRefs = React.useRef<Map<string, HTMLTableRowElement | null>>(new Map());

  const loadData = React.useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
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
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); }
    finally { setIsLoading(false); }
  }, [user, toast]);

  React.useEffect(() => { loadData(); }, [loadData]);

  const generalLedger = React.useMemo(() => {
    const combined: GeneralTransaction[] = [
      ...incomeLedger.map(item => ({ ...item, transactionType: 'income' as const })),
      ...expenseLedger.map(item => ({ ...item, transactionType: 'expense' as const })),
    ];
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomeLedger, expenseLedger]);

  const incomeTotal = React.useMemo(() => incomeLedger.reduce((sum, item) => sum + item.totalAmount, 0), [incomeLedger]);
  const expenseTotal = React.useMemo(() => expenseLedger.reduce((sum, item) => sum + item.totalAmount, 0), [expenseLedger]);
  const netIncome = incomeTotal - expenseTotal;

  const handleSaveTransaction = async () => {
      if (!user) return;
      const totalAmountNum = parseFloat(newTransaction.totalAmount);
      const taxRateNum = parseFloat(newTransaction.taxRate) || 0;
      
      // CRITICAL: We now use the selection from the dropdown which stores the ID (categoryNumber)
      const selectedCategoryNumber = newTransactionType === 'income' ? newTransaction.incomeCategory : newTransaction.category;

      if (!newTransaction.date || !newTransaction.company || !selectedCategoryNumber || !newTransaction.totalAmount || isNaN(totalAmountNum)) {
          toast({ variant: 'destructive', title: 'Missing Information', description: 'Please ensure Date, Company, Category, and Amount are provided.' });
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
      if (!transactionToDelete) return;
      try {
          if (transactionToDelete.transactionType === 'income') {
              await deleteIncomeTransaction(transactionToDelete.id);
          } else {
              await deleteExpenseTransaction(transactionToDelete.id);
          }
          toast({ title: "Transaction Deleted" });
          loadData();
      } catch (error: any) {
          toast({ variant: "destructive", title: "Delete Failed", description: error.message });
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
          toast({ title: 'Company Created' });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Failed to create company', description: error.message });
      }
  };

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

  const getCategoryName = (categoryNumber: string, type: 'income' | 'expense') => {
      if (type === 'income') {
          return incomeCategories.find(c => c.categoryNumber === categoryNumber)?.name || categoryNumber;
      }
      return expenseCategories.find(c => c.categoryNumber === categoryNumber)?.name || categoryNumber;
  };

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center p-4"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="BKS Ledger" hubPath="/accounting" hubLabel="Accounting Hub" />
        
        <header className="text-center relative">
            <h1 className="text-3xl font-bold font-headline text-primary">BKS General Ledger</h1>
            <p className="text-muted-foreground">Comprehensive record of all business income and expenses.</p>
            <div className="absolute top-0 right-0">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/action-manager"><X className="h-5 w-5"/></Link>
                </Button>
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
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

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Transactions</CardTitle>
                    <CardDescription>Review and manage your financial records.</CardDescription>
                </div>
                <Button onClick={() => { setTransactionToEdit(null); setNewTransaction(emptyTransactionForm); setIsTransactionDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Post Transaction
                </Button>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {generalLedger.map(item => (
                                <TableRow key={item.id} ref={el => rowRefs.current.set(item.id, el)} className={cn(highlightedId === item.id && "bg-primary/10 animate-pulse")}>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell className="font-medium">{item.company}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {getCategoryName(item.transactionType === 'income' ? (item as IncomeTransaction).incomeCategory : (item as ExpenseTransaction).category, item.transactionType)}
                                    </TableCell>
                                    <TableCell><Badge variant={item.transactionType === 'income' ? 'default' : 'destructive'}>{item.transactionType}</Badge></TableCell>
                                    <TableCell className="text-right font-mono font-semibold">${item.totalAmount.toFixed(2)}</TableCell>
                                    <TableCell>
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
                            {generalLedger.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No transactions found. Post your first entry to get started.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
            <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
                <DialogHeader className="text-center sm:text-center shrink-0">
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
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newTransaction.date ? new Date(newTransaction.date) : undefined} onSelect={(date) => { if (date) setNewTransaction(p => ({ ...p, date: format(date, 'yyyy-MM-dd') })); setIsDatePickerOpen(false); }} initialFocus /></PopoverContent>
                            </Popover>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Company *</Label>
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
                                            <Command>
                                                <CommandInput placeholder="Search company..." value={newCompanyName} onValueChange={setNewCompanyName}/>
                                                <CommandList>
                                                    <CommandEmpty>
                                                        <div className="p-2 flex flex-col gap-2">
                                                            <p className="text-xs text-muted-foreground text-center">No company found.</p>
                                                            <Button size="sm" variant="outline" className="w-full" onClick={() => handleCreateCompany()}>
                                                                <Plus className="mr-2 h-3 w-3"/> Create "{newCompanyName}"
                                                            </Button>
                                                        </div>
                                                    </CommandEmpty>
                                                    <CommandGroup>
                                                        {companies.map(c => (
                                                            <CommandItem 
                                                                key={c.id} 
                                                                value={c.name} 
                                                                onSelect={() => { 
                                                                    setNewTransaction(p => ({ ...p, company: c.name })); 
                                                                    setIsCompanyPopoverOpen(false); 
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
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Amount *</Label>
                            <div className="relative col-span-3">
                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                <Input type="number" step="0.01" value={newTransaction.totalAmount} onChange={e => setNewTransaction(p => ({ ...p, totalAmount: e.target.value }))} className="pl-7" placeholder="0.00" />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Category *</Label>
                            <div className="col-span-3">
                                <Select 
                                    value={newTransactionType === 'income' ? newTransaction.incomeCategory : newTransaction.category} 
                                    onValueChange={v => setNewTransaction(p => ({ ...p, [newTransactionType === 'income' ? 'incomeCategory' : 'category']: v }))}
                                >
                                    <SelectTrigger>
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
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Tax Rate (%)</Label>
                            <Input type="number" value={newTransaction.taxRate} onChange={e => setNewTransaction(p => ({ ...p, taxRate: e.target.value }))} className="col-span-3" placeholder="e.g., 15" />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Description</Label>
                            <Textarea value={newTransaction.description} onChange={e => setNewTransaction(p => ({ ...p, description: e.target.value }))} className="col-span-3" rows={3} placeholder="Optional details..."/>
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
    </div>
  );
}
