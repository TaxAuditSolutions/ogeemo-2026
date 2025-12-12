
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Link2, GitMerge, UserCheck, AlertTriangle, ShieldCheck, ExternalLink, LoaderCircle, ChevronsUpDown, Check, PlusCircle, MoreVertical, Pencil, Trash2, View, Info } from 'lucide-react';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from '../ui/separator';
import { useAuth } from '@/context/auth-context';
import { getIncomeTransactions, getExpenseTransactions, deleteIncomeTransaction, deleteExpenseTransaction, type IncomeTransaction, type ExpenseTransaction, addExpenseTransaction, addIncomeTransaction, getCompanies, getExpenseCategories, getIncomeCategories, addCompany, addExpenseCategory, addIncomeCategory, type Company, type ExpenseCategory, type IncomeCategory } from '@/services/accounting-service';
import { format } from 'date-fns';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { ScrollArea } from '../ui/scroll-area';
import { Calendar } from '../ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type BankAccount = {
  id: string;
  name: string;
  bank: string;
  type: "Business" | "Personal";
  institutionNumber: string;
  transitNumber: string;
  accountNumber: string;
  balance: number;
  address?: string;
  phone?: string;
  accountManager?: string;
};

type BankTransaction = {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  status: "reconciled" | "unreconciled" | "personal";
};

const initialMockAccounts: BankAccount[] = [
  { id: 'acc_1', name: 'Primary Checking', bank: 'Chase', type: 'Business', institutionNumber: '001', transitNumber: '12345', accountNumber: '111222333', balance: 15430.22, address: '123 Banking St, Financial District, NY', phone: '555-0100', accountManager: 'John Smith' },
  { id: 'acc_2', name: 'High-Yield Savings', bank: 'Marcus', type: 'Business', institutionNumber: '002', transitNumber: '67890', accountNumber: '444555666', balance: 85000.00 },
  { id: 'acc_3', name: 'Personal Checking', bank: 'Chase', type: 'Personal', institutionNumber: '001', transitNumber: '12345', accountNumber: '777888999', balance: 5210.50 },
];

const mockBankTransactions: BankTransaction[] = [
  { id: 'txn_b_1', accountId: 'acc_1', date: '2024-07-25', description: 'ACH from Client Alpha', amount: 5000, status: 'reconciled' },
  { id: 'txn_b_2', accountId: 'acc_1', date: '2024-07-25', description: 'Cloud Hosting Inc.', amount: -150, status: 'reconciled' },
  { id: 'txn_b_3', accountId: 'acc_1', date: '2024-07-24', description: 'Stripe Payout', amount: 850.75, status: 'reconciled' },
  { id: 'txn_b_4', accountId: 'acc_1', date: '2024-07-23', description: 'SaaS Tools Co.', amount: -75.99, status: 'unreconciled' },
  { id: 'txn_b_5', accountId: 'acc_1', date: '2024-07-22', description: 'TRANSFER TO ACC_2', amount: -10000, status: 'reconciled' },
  { id: 'txn_b_6', accountId: 'acc_1', date: '2024-07-21', description: 'Gas Station - Shell', amount: -55.45, status: 'unreconciled' },
  { id: 'txn_b_7', accountId: 'acc_1', date: '2024-07-20', description: 'Office Depot', amount: -45.30, status: 'unreconciled' },
  { id: 'txn_s_1', accountId: 'acc_2', date: '2024-07-22', description: 'TRANSFER FROM ACC_1', amount: 10000, status: 'reconciled' },
  { id: 'txn_s_2', accountId: 'acc_2', date: '2024-07-31', description: 'Interest Payment', amount: 35.42, status: 'unreconciled' },
  { id: 'txn_p_1', accountId: 'acc_3', date: '2024-07-21', description: 'Freelance Designer', amount: -800, status: 'unreconciled' },
  { id: 'txn_p_2', accountId: 'acc_3', date: '2024-07-22', description: 'Restaurant - The Cafe', amount: -125.60, status: 'personal' },
  { id: 'txn_p_3', accountId: 'acc_3', date: '2024-07-23', description: 'Salary Deposit', amount: 4500, status: 'personal' },
];

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const emptyTransactionForm = { date: '', company: '', description: '', totalAmount: '', taxRate: '', preTaxAmount: '', taxAmount: '', category: '', incomeCategory: '', explanation: '', documentNumber: '', documentUrl: '', type: 'business' as 'business' | 'personal', depositedTo: '' };
const defaultDepositAccounts = ["Bank Account #1", "Credit Card #1", "Cash Account"];


const ReconciliationActions = () => (
  <Card className="bg-muted/50">
    <CardHeader>
      <CardTitle className="text-base">Reconciliation Actions</CardTitle>
      <CardDescription className="text-xs">For unreconciled transactions from a business account:</CardDescription>
    </CardHeader>
    <CardContent className="grid gap-4">
        <div className="flex items-start gap-3">
          <Link2 className="h-5 w-5 mt-1 text-primary shrink-0"/>
          <div>
            <h4 className="font-semibold">Match to Ledger</h4>
            <p className="text-sm text-muted-foreground">Find and link this to an existing income or expense entry.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <GitMerge className="h-5 w-5 mt-1 text-primary shrink-0"/>
          <div>
            <h4 className="font-semibold">Create & Reconcile</h4>
            <p className="text-sm text-muted-foreground">Create a new ledger entry from this transaction and link them.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <UserCheck className="h-5 w-5 mt-1 text-primary shrink-0"/>
          <div>
            <h4 className="font-semibold">Mark as Personal</h4>
            <p className="text-sm text-muted-foreground">Tag as a personal expense. It will be ignored in business reports.</p>
          </div>
        </div>
    </CardContent>
  </Card>
);

const emptyAccountForm: Omit<BankAccount, 'id' | 'balance'> & { balance: number | '' } = {
    name: '',
    bank: '',
    type: 'Business',
    institutionNumber: '',
    transitNumber: '',
    accountNumber: '',
    address: '',
    phone: '',
    accountManager: '',
    balance: '',
};

export function BankStatementsView() {
  const [mockAccounts, setMockAccounts] = React.useState<BankAccount[]>(initialMockAccounts);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>(initialMockAccounts[0].id);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);
  const [isNewAccountOpen, setIsNewAccountOpen] = React.useState(false);
  const [newAccount, setNewAccount] = React.useState(emptyAccountForm);
  const [transactionToReconcile, setTransactionToReconcile] = React.useState<BankTransaction | null>(null);
  const [isLedgerLoading, setIsLedgerLoading] = React.useState(true);
  const [incomeLedger, setIncomeLedger] = React.useState<IncomeTransaction[]>([]);
  const [expenseLedger, setExpenseLedger] = React.useState<ExpenseTransaction[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [expenseCategories, setExpenseCategories] = React.useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = React.useState<IncomeCategory[]>([]);
  const [bankTransactions, setBankTransactions] = React.useState<BankTransaction[]>(mockBankTransactions);
  const [isNewTransactionDialogOpen, setIsNewTransactionDialogOpen] = React.useState(false);

  const [newTransaction, setNewTransaction] = React.useState(emptyTransactionForm);
  const [newTransactionType, setNewTransactionType] = React.useState<'income' | 'expense'>('income');
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
  
  const [accountToView, setAccountToView] = React.useState<BankAccount | null>(null);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = React.useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    async function loadLedgerData() {
        if (!user) {
            setIsLedgerLoading(false);
            return;
        }
        setIsLedgerLoading(true);
        try {
            const [incomeData, expenseData, fetchedCompanies, fetchedExpenseCategories, fetchedIncomeCategories] = await Promise.all([
                getIncomeTransactions(user.uid),
                getExpenseTransactions(user.uid),
                getCompanies(user.uid),
                getExpenseCategories(user.uid),
                getIncomeCategories(user.uid),
            ]);
            setIncomeLedger(incomeData);
            setExpenseLedger(expenseData);
            setCompanies(fetchedCompanies);
            setExpenseCategories(fetchedExpenseCategories);
            setIncomeCategories(fetchedIncomeCategories);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load ledger data', description: error.message });
        } finally {
            setIsLedgerLoading(false);
        }
    }
    loadLedgerData();
  }, [user, toast]);
  
    React.useEffect(() => {
        if (!transactionToReconcile) return;

        const isIncome = transactionToReconcile.amount > 0;
        const formDate = transactionToReconcile.date || format(new Date(), 'yyyy-MM-dd');

        setNewTransactionType(isIncome ? 'income' : 'expense');
        setNewTransaction({
            ...emptyTransactionForm,
            date: formDate,
            company: transactionToReconcile.description,
            description: `Reconciled from bank transaction`,
            totalAmount: String(Math.abs(transactionToReconcile.amount)),
        });
    }, [transactionToReconcile]);
    
    React.useEffect(() => {
        const totalAmount = parseFloat(newTransaction.totalAmount);
        const taxRate = parseFloat(newTransaction.taxRate);

        if (!isNaN(totalAmount) && !isNaN(taxRate) && taxRate > 0) {
            const preTax = totalAmount / (1 + taxRate / 100);
            const tax = totalAmount - preTax;
            setNewTransaction(prev => ({ ...prev, preTaxAmount: preTax.toFixed(2), taxAmount: tax.toFixed(2) }));
        } else if (!isNaN(totalAmount)) {
             setNewTransaction(prev => ({ ...prev, preTaxAmount: totalAmount.toFixed(2), taxAmount: '0.00' }));
        } else {
            setNewTransaction(prev => ({ ...prev, preTaxAmount: '', taxAmount: '' }));
        }
    }, [newTransaction.totalAmount, newTransaction.taxRate]);


  const handlePlaidContinue = () => {
    setIsLinkDialogOpen(false);
    toast({
        title: "Connecting to Plaid...",
        description: "In a real application, the secure Plaid Link flow would start now."
    });
  };

  const getStatusBadge = (status: BankTransaction['status']) => {
    switch (status) {
      case 'reconciled':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Reconciled</Badge>;
      case 'unreconciled':
        return <Badge variant="destructive">Unreconciled</Badge>;
      case 'personal':
        return <Badge variant="outline">Personal</Badge>;
    }
  };

  const suggestedMatches = React.useMemo(() => {
    if (!transactionToReconcile) return [];
    const allLedgerEntries = [...incomeLedger, ...expenseLedger];
    const amountToMatch = transactionToReconcile.amount;
    
    return allLedgerEntries.filter(entry => 
        Math.abs(Math.abs(entry.totalAmount) - Math.abs(amountToMatch)) < 0.01
    );
  }, [transactionToReconcile, incomeLedger, expenseLedger]);

  const handleMatch = async (ledgerEntryId: string, ledgerType: 'income' | 'expense') => {
    if (!transactionToReconcile) return;

    try {
        if (ledgerType === 'income') {
            await deleteIncomeTransaction(ledgerEntryId);
            setIncomeLedger(prev => prev.filter(tx => tx.id !== ledgerEntryId));
        } else {
            await deleteExpenseTransaction(ledgerEntryId);
            setExpenseLedger(prev => prev.filter(tx => tx.id !== ledgerEntryId));
        }

        setBankTransactions(prev => prev.map(tx => tx.id === transactionToReconcile.id ? { ...tx, status: 'reconciled' } : tx));
        setTransactionToReconcile(null);
        toast({ title: 'Match Successful', description: 'The transaction has been reconciled.' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Match Failed', description: error.message });
    }
  };
  
    const handleMarkAsPersonal = (transaction: BankTransaction) => {
        setBankTransactions(prev => prev.map(tx => tx.id === transaction.id ? { ...tx, status: 'personal' } : tx));
        toast({ title: 'Transaction Marked as Personal' });
    };

    const handleOpenNewAccountDialog = () => {
        setNewAccount(emptyAccountForm);
        setIsNewAccountOpen(true);
    };

    const handleSaveNewAccount = () => {
        if (!newAccount.name || !newAccount.bank || !newAccount.institutionNumber || !newAccount.transitNumber || !newAccount.accountNumber || newAccount.balance === '') {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill out all fields correctly.' });
            return;
        }
        const newMockAccount: BankAccount = {
            id: `acc_${Date.now()}`,
            ...newAccount,
            balance: Number(newAccount.balance)
        };
        setMockAccounts(prev => [...prev, newMockAccount]);
        setSelectedAccountId(newMockAccount.id);
        setIsNewAccountOpen(false);
        toast({ title: 'Account Added', description: 'New mock account has been created.' });
    };


  const handleCreateNewEntry = () => {
    if (!transactionToReconcile) return;
    setIsNewTransactionDialogOpen(true);
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
            handleNewEntryCreated();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
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

    const handleCreateExpenseCategory = async () => {
        if (!user || !newExpenseCategoryName.trim()) return;
        try {
            const newCategory = await addExpenseCategory({ name: newExpenseCategoryName.trim(), userId: user.uid });
            setExpenseCategories(prev => [...prev, newCategory]);
            setNewTransaction(prev => ({ ...prev, category: newExpenseCategoryName.trim() }));
            setShowAddExpenseCategory(false);
            setNewExpenseCategoryName('');
            toast({ title: 'Category Created' });
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
            toast({ title: 'Category Created' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to create category', description: error.message });
        }
    };

  const handleNewEntryCreated = () => {
      if (transactionToReconcile) {
          setBankTransactions(prev => prev.map(tx => tx.id === transactionToReconcile.id ? { ...tx, status: 'reconciled' } : tx));
      }
      setTransactionToReconcile(null);
      setIsNewTransactionDialogOpen(false);
  };

  const selectedAccount = mockAccounts.find(acc => acc.id === selectedAccountId);
  const transactions = bankTransactions.filter(txn => txn.accountId === selectedAccountId);

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="Bank Statements" />
        <header className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-3xl font-bold font-headline text-primary">Bank Statement Reconciliation</h1>
              <Button variant="ghost" size="icon" onClick={() => setIsInfoDialogOpen(true)}>
                <Info className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">How to use this page</span>
              </Button>
            </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Connect your bank accounts to automatically import transactions. Reconcile them against your ledgers to ensure accuracy.
          </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Bank Accounts</CardTitle><CardDescription>Your connected accounts.</CardDescription></div>
                <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" onClick={handleOpenNewAccountDialog}><Plus className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => setIsLinkDialogOpen(true)}><Link2 className="mr-2 h-4 w-4" /> Link</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAccounts.map(account => (
                    <div key={account.id} className={cn("w-full p-3 rounded-lg border transition-colors", selectedAccountId === account.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50 cursor-pointer")} onClick={() => setSelectedAccountId(account.id)}>
                      <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold">{account.name} ({account.bank})</span>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); setAccountToView(account); }}>View Details</Button>
                            <Badge variant={account.type === 'Business' ? 'default' : 'secondary'}>{account.type}</Badge>
                          </div>
                      </div>
                      <div className="flex justify-between items-end text-sm"><span className="text-muted-foreground">...{account.accountNumber && account.accountNumber.length > 4 ? account.accountNumber.slice(-4) : account.accountNumber}</span><span className="font-mono">{account.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <ReconciliationActions />
          </div>
          
          <div className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle>Transactions for {selectedAccount?.name}</CardTitle><CardDescription>Review and reconcile transactions for the selected account.</CardDescription></CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {transactions.map(txn => (
                        <TableRow key={txn.id}>
                          <TableCell>{txn.date}</TableCell>
                          <TableCell>
                            {txn.description}
                            {txn.accountId === 'acc_3' && txn.description.includes('Freelance Designer') && (<div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1"><AlertTriangle className="h-3 w-3" /><span>Business expense on personal account.</span></div>)}
                            {txn.accountId === 'acc_1' && txn.description.includes('Gas Station') && (<div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 mt-1"><AlertTriangle className="h-3 w-3" /><span>Potential mixed business/personal use.</span></div>)}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono", txn.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{txn.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                          <TableCell className="text-center">{getStatusBadge(txn.status)}</TableCell>
                          <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setTransactionToReconcile(txn)} disabled={txn.status === 'reconciled'}>
                                        <GitMerge className="mr-2 h-4 w-4" />Reconcile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleMarkAsPersonal(txn)} disabled={txn.status !== 'unreconciled'}>
                                        <UserCheck className="mr-2 h-4 w-4" />Mark as Personal
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>How to Reconcile Bank Statements</DialogTitle>
            <DialogDescription>
              A quick guide to keeping your books accurate.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">1</div>
              <div>
                <h4 className="font-semibold">Link Your Bank</h4>
                <p className="text-sm text-muted-foreground">Click the "Link" button to securely connect your bank account via Plaid. This will import your transactions. (This is a simulation).</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">2</div>
              <div>
                <h4 className="font-semibold">Review Transactions</h4>
                <p className="text-sm text-muted-foreground">Select a bank account to see its recent transactions. Items marked as "Unreconciled" need your attention.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">3</div>
              <div>
                <h4 className="font-semibold">Reconcile</h4>
                <p className="text-sm text-muted-foreground">Click the menu on an unreconciled transaction and choose "Reconcile." This dialog helps you match the bank record to your ledger.</p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  <li><strong>Match:</strong> If you've already entered this transaction in your ledger, select the matching entry to link them.</li>
                  <li><strong>Create:</strong> If it's a new transaction, use the "Create New" button to add it directly to your income or expense ledger.</li>
                  <li><strong>Mark as Personal:</strong> If the transaction was not for business, mark it as personal to exclude it from reports.</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsInfoDialogOpen(false)}>Got It</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />Securely Link Your Bank Account</DialogTitle><DialogDescription>Ogeemo uses Plaid to securely connect to your financial institutions. Your credentials are never shared with us.</DialogDescription></DialogHeader><div className="py-4 text-sm text-muted-foreground"><p>By clicking "Continue", you will be redirected to Plaid, a trusted third-party service, to select your bank and log in. This process is secure and encrypted.</p><p className="mt-2">Ogeemo does not see, store, or have access to your bank login credentials at any point.</p></div><DialogFooter><Button variant="ghost" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button><Button onClick={handlePlaidContinue}>Continue with Plaid <ExternalLink className="ml-2 h-4 w-4" /></Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={isNewAccountOpen} onOpenChange={setIsNewAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Bank Account</DialogTitle>
            <DialogDescription>Enter the details for your new mock bank account.</DialogDescription>
          </DialogHeader>
          <div className="py-4 grid gap-4">
            <div className="space-y-2"><Label htmlFor="acc-name">Account Name</Label><Input id="acc-name" value={newAccount.name} onChange={(e) => setNewAccount(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="acc-bank">Bank Name</Label><Input id="acc-bank" value={newAccount.bank} onChange={(e) => setNewAccount(p => ({ ...p, bank: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="acc-address">Address</Label><Input id="acc-address" value={newAccount.address} onChange={(e) => setNewAccount(p => ({ ...p, address: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="acc-phone">Phone</Label><Input id="acc-phone" value={newAccount.phone} onChange={(e) => setNewAccount(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="acc-manager">Account Manager</Label><Input id="acc-manager" value={newAccount.accountManager} onChange={(e) => setNewAccount(p => ({ ...p, accountManager: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="acc-institution">Institution #</Label><Input id="acc-institution" value={newAccount.institutionNumber} onChange={(e) => setNewAccount(p => ({ ...p, institutionNumber: e.target.value }))} maxLength={3} /></div>
                <div className="space-y-2"><Label htmlFor="acc-transit">Transit #</Label><Input id="acc-transit" value={newAccount.transitNumber} onChange={(e) => setNewAccount(p => ({ ...p, transitNumber: e.target.value }))} maxLength={5} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="acc-number">Account Number</Label><Input id="acc-number" value={newAccount.accountNumber} onChange={(e) => setNewAccount(p => ({ ...p, accountNumber: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Account Type</Label><RadioGroup value={newAccount.type} onValueChange={(v) => setNewAccount(p => ({ ...p, type: v as 'Business' | 'Personal' }))} className="flex"><div className="flex items-center space-x-2"><RadioGroupItem value="Business" id="type-biz"/><Label htmlFor="type-biz">Business</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Personal" id="type-pers"/><Label htmlFor="type-pers">Personal</Label></div></RadioGroup></div>
            <div className="space-y-2"><Label htmlFor="acc-balance">Current Balance</Label><Input id="acc-balance" type="number" value={newAccount.balance} onChange={(e) => setNewAccount(p => ({ ...p, balance: e.target.value === '' ? '' : Number(e.target.value) }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewAccountOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNewAccount}>Add Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!accountToView} onOpenChange={() => setAccountToView(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{accountToView?.name}</DialogTitle>
                <DialogDescription>{accountToView?.bank}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{accountToView?.type}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Institution #:</span>
                    <span>{accountToView?.institutionNumber}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Transit #:</span>
                    <span>{accountToView?.transitNumber}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Account #:</span>
                    <span>{accountToView?.accountNumber}</span>
                </div>
                <Separator/>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Address:</span>
                    <span>{accountToView?.address || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{accountToView?.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Manager:</span>
                    <span>{accountToView?.accountManager || 'N/A'}</span>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={() => setAccountToView(null)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!transactionToReconcile} onOpenChange={() => setTransactionToReconcile(null)}>
        <DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Reconcile Transaction</DialogTitle><DialogDescription>Match this bank transaction to an existing ledger entry or create a new one.</DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            <Card><CardContent className="p-4 flex justify-between items-center text-sm"><div><p className="font-semibold">{transactionToReconcile?.description}</p><p className="text-xs text-muted-foreground">{transactionToReconcile?.date}</p></div><p className={cn("text-lg font-mono font-semibold", (transactionToReconcile?.amount || 0) < 0 ? 'text-destructive' : 'text-green-600')}>{formatCurrency(transactionToReconcile?.amount || 0)}</p></CardContent></Card>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Suggested Matches</h4>
              {isLedgerLoading ? <div className="flex items-center justify-center p-4"><LoaderCircle className="h-6 w-6 animate-spin"/></div> : (
              <div className="space-y-2">
                 {suggestedMatches.length > 0 ? suggestedMatches.map(match => (
                      <div key={match.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                          <div>
                              <p className="text-sm font-medium">{match.description || match.company}</p>
                              <p className="text-xs text-muted-foreground">{match.date}</p>
                          </div>
                          <div className="flex items-center gap-2">
                               <p className="text-sm font-mono">{formatCurrency(match.totalAmount * ('incomeCategory' in match ? 1 : -1))}</p>
                               <Button size="sm" onClick={() => handleMatch(match.id, 'incomeCategory' in match ? 'income' : 'expense')}>Match</Button>
                          </div>
                      </div>
                 )) : (
                     <div className="text-center text-sm text-muted-foreground p-4 border-2 border-dashed rounded-lg"><p>No suggested matches found in your ledger.</p></div>
                 )}
              </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row sm:justify-between items-center">
             <Button variant="outline" onClick={handleCreateNewEntry}>Create New Ledger Entry</Button>
             <Button variant="ghost" onClick={() => setTransactionToReconcile(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isNewTransactionDialogOpen} onOpenChange={setIsNewTransactionDialogOpen}>
        <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="text-center sm:text-center shrink-0">
            <DialogTitle className="text-2xl text-primary font-bold">Create New {newTransactionType === 'income' ? 'Income' : 'Expense'}</DialogTitle>
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
                            <Popover open={isCompanyPopoverOpen} onOpenChange={setIsCompanyPopoverOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">{newTransaction.company || "Select company..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search company..." /><CommandList><CommandEmpty>No company found.</CommandEmpty><CommandGroup>{companies.map((c) => (<CommandItem key={c.id} value={c.name} onSelect={() => { setNewTransaction(prev => ({ ...prev, company: c.name })); setIsCompanyPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", newTransaction.company.toLowerCase() === c.name.toLowerCase() ? "opacity-100" : "opacity-0")} />{c.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
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
                                <Popover open={isIncomeCategoryPopoverOpen} onOpenChange={setIsIncomeCategoryPopoverOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">{newTransaction.incomeCategory || "Select category..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search category..." /><CommandList><CommandEmpty>No category found.</CommandEmpty><CommandGroup>{incomeCategories.map((c) => (<CommandItem key={c.id} value={c.name} onSelect={() => { setNewTransaction(prev => ({ ...prev, incomeCategory: c.name })); setIsIncomeCategoryPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", newTransaction.incomeCategory.toLowerCase() === c.name.toLowerCase() ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
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
                                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between">{newTransaction.category || "Select category..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search category..." /><CommandList><CommandEmpty>No category found.</CommandEmpty><CommandGroup>{expenseCategories.map((c) => (<CommandItem key={c.id} value={c.name} onSelect={() => { setNewTransaction(prev => ({ ...prev, category: c.name })); setIsCategoryPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", newTransaction.category.toLowerCase() === c.name.toLowerCase() ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
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
            <Button variant="ghost" onClick={() => setIsNewTransactionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTransaction}>Create Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
