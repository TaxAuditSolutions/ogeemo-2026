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
import { 
    Plus, 
    Link2, 
    GitMerge, 
    UserCheck, 
    AlertTriangle, 
    ShieldCheck, 
    ExternalLink, 
    LoaderCircle, 
    ChevronsUpDown, 
    Check, 
    PlusCircle, 
    MoreVertical, 
    Pencil, 
    Trash2, 
    Info,
    ArrowRight,
    Landmark,
    Calendar as CalendarIcon,
    Search,
    FileDigit
} from 'lucide-react';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
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
import { 
    getIncomeTransactions, 
    deleteIncomeTransaction, 
    getExpenseTransactions, 
    deleteExpenseTransaction, 
    getInvoices,
    getPayableBills,
    reconcileLedgerEntry,
    reconcileInvoicePayment,
    reconcileBillPayment,
    type IncomeTransaction, 
    type ExpenseTransaction, 
    type Invoice,
    type PayableBill,
    getCompanies, 
    getExpenseCategories, 
    getIncomeCategories, 
    addCompany, 
    addExpenseCategory, 
    addIncomeCategory, 
    type Company, 
    type ExpenseCategory, 
    type IncomeCategory,
    type TaxType,
    getTaxTypes,
    addIncomeTransaction,
    addExpenseTransaction
} from '@/services/accounting-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, ensureSystemFolders, type FolderData } from '@/services/contact-folder-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { format, parseISO } from 'date-fns';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { ScrollArea } from '../ui/scroll-area';
import { CustomCalendar } from '../ui/custom-calendar';
import ContactFormDialog from '../contacts/contact-form-dialog';

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

const emptyTransactionForm = { 
    date: '', 
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
    paymentMethod: '',
    depositedTo: 'Bank Account #1' 
};

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
  
  const [incomeLedger, setIncomeLedger] = React.useState<IncomeTransaction[]>([]);
  const [expenseLedger, setExpenseLedger] = React.useState<ExpenseTransaction[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [payableBills, setPayableBills] = React.useState<PayableBill[]>([]);
  
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [expenseCategories, setExpenseCategories] = React.useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = React.useState<IncomeCategory[]>([]);
  const [bankTransactions, setBankTransactions] = React.useState<BankTransaction[]>(mockBankTransactions);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
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
  
  const [isInfoDialogOpen, setIsInfoDialogOpen] = React.useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = React.useState(false);
  const [contactFolders, setContactFolders] = React.useState<FolderData[]>([]);
  const [customIndustries, setCustomIndustries] = React.useState<Industry[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    if (!user) {
        setIsLoadingData(false);
        return;
    }
    setIsLoadingData(true);
    try {
        const [income, expenses, invs, bills, fetchedCompanies, fetchedExpenseCategories, fetchedIncomeCategories, fetchedFolders, fetchedIndustries, fetchedContacts] = await Promise.all([
            getIncomeTransactions(user.uid),
            getExpenseTransactions(user.uid),
            getInvoices(user.uid),
            getPayableBills(user.uid),
            getCompanies(user.uid),
            getExpenseCategories(user.uid),
            getIncomeCategories(user.uid),
            getContactFolders(user.uid),
            getIndustries(user.uid),
            getContacts()
        ]);
        setIncomeLedger(income);
        setExpenseLedger(expenses);
        setInvoices(invs.filter(i => i.originalAmount - i.amountPaid > 0.01));
        setPayableBills(bills);
        setCompanies(fetchedCompanies);
        setExpenseCategories(fetchedExpenseCategories);
        setIncomeCategories(fetchedIncomeCategories);
        setContactFolders(fetchedFolders);
        setCustomIndustries(fetchedIndustries);
        setContacts(fetchedContacts);
    } catch (error: any) {
        // Errors handled centrally
    } finally {
        setIsLoadingData(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);
  
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
            paymentMethod: 'Bank Transfer',
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
        return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Reconciled
        </Badge>;
      case 'unreconciled':
        return <Badge variant="destructive">Unreconciled</Badge>;
      case 'personal':
        return <Badge variant="outline">Personal</Badge>;
    }
  };

  const suggestedMatches = React.useMemo(() => {
    if (!transactionToReconcile) return [];
    const results: any[] = [];
    const amount = Math.abs(transactionToReconcile.amount);
    
    const allLedger = [...incomeLedger, ...expenseLedger];
    allLedger.forEach(entry => {
        if (Math.abs(entry.totalAmount - amount) < 0.01) {
            results.push({ ...entry, matchType: 'ledger', confidence: entry.date === transactionToReconcile.date ? 'High' : 'Medium' });
        }
    });

    if (transactionToReconcile.amount > 0) {
        invoices.forEach(inv => {
            const balance = inv.originalAmount - inv.amountPaid;
            if (Math.abs(balance - amount) < 0.01) {
                results.push({ ...inv, matchType: 'invoice', confidence: 'High' });
            }
        });
    }

    if (transactionToReconcile.amount < 0) {
        payableBills.forEach(bill => {
            if (Math.abs(bill.totalAmount - amount) < 0.01) {
                results.push({ ...bill, matchType: 'bill', confidence: 'High' });
            }
        });
    }
    
    return results.sort((a,b) => (a.confidence === 'High' ? -1 : 1));
  }, [transactionToReconcile, incomeLedger, expenseLedger, invoices, payableBills]);

  const handleMatch = async (match: any) => {
    if (!transactionToReconcile || !user || !selectedAccount) return;

    try {
        if (match.matchType === 'ledger') {
            await reconcileLedgerEntry(match.id, 'incomeCategory' in match ? 'income' : 'expense', transactionToReconcile.id);
        } else if (match.matchType === 'invoice') {
            await reconcileInvoicePayment(user.uid, match.id, Math.abs(transactionToReconcile.amount), transactionToReconcile.date, transactionToReconcile.id, selectedAccount.name);
        } else if (match.matchType === 'bill') {
            await reconcileBillPayment(user.uid, match.id, transactionToReconcile.date, transactionToReconcile.id, selectedAccount.name);
        }

        setBankTransactions(prev => prev.map(tx => tx.id === transactionToReconcile.id ? { ...tx, status: 'reconciled' } : tx));
        setTransactionToReconcile(null);
        toast({ title: 'Matched & Reconciled', description: 'The audit trail has been established.' });
        loadData();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Reconciliation Failed', description: error.message });
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
        if (!user || !selectedAccount) return;
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
            paymentMethod: 'Bank Transfer',
            isReconciled: true,
            bankReferenceId: transactionToReconcile?.id
        };

        try {
            if (newTransactionType === 'income') {
                const newEntryData: Omit<IncomeTransaction, 'id'> = { ...baseData, incomeCategory: categoryNumber!, depositedTo: selectedAccount.name, userId: user.uid };
                await addIncomeTransaction(newEntryData);
            } else {
                const newEntryData: Omit<ExpenseTransaction, 'id'> = { ...baseData, category: categoryNumber!, paidFrom: selectedAccount.name, userId: user.uid };
                await addExpenseTransaction(newEntryData);
            }
            handleNewEntryCreated();
            toast({ title: "Transaction Created & Reconciled" });
            loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        }
    };
  
    const handleCreateCompany = async (companyName: string) => {
        if (!user || !companyName.trim()) return;
        try {
            const newCompany = await addCompany({ name: companyName.trim(), userId: user.uid });
            setCompanies(prev => [...prev, newCompany]);
            setNewTransaction(prev => ({ ...prev, company: newCompany.name }));
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
            setNewTransaction(prev => ({ ...prev, category: newCategory.categoryNumber || newCategory.id }));
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
            setNewTransaction(prev => ({ ...prev, incomeCategory: newCategory.categoryNumber || newCategory.id }));
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

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
    if (isEditing) {
        setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
    } else {
        setContacts(prev => [savedContact, ...prev]);
    }
    setNewTransaction(prev => ({ ...prev, company: savedContact.name }));
    setIsContactFormOpen(false);
  };

  const selectedAccount = mockAccounts.find(acc => acc.id === selectedAccountId);
  const transactions = bankTransactions.filter(txn => txn.accountId === selectedAccountId);

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6 text-black">
        <AccountingPageHeader pageTitle="Bank Statements" />
        <header className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-3xl font-bold font-headline text-primary">Bank Statement Reconciliation</h1>
              <Button variant="ghost" size="icon" className="mt-1" onClick={() => setIsInfoDialogOpen(true)}>
                <Info className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">How to use this page</span>
              </Button>
            </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Synchronize your bank records with the Ogeemo Spider Web to maintain a defensible audit trail.
          </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-lg border-primary/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div><CardTitle className="text-lg">Bank Accounts</CardTitle><CardDescription>Connected cloud nodes.</CardDescription></div>
                <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={handleOpenNewAccountDialog}><Plus className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setIsLinkDialogOpen(true)}><Link2 className="mr-2 h-4 w-4" /> Link Bank</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockAccounts.map(account => (
                    <div key={account.id} className={cn("w-full p-3 rounded-lg border transition-all", selectedAccountId === account.id ? "bg-primary/5 border-primary shadow-sm" : "hover:bg-muted/50 cursor-pointer border-transparent")} onClick={() => setSelectedAccountId(account.id)}>
                      <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm">{account.name}</span>
                          <Badge variant={account.type === 'Business' ? 'default' : 'secondary'} className="text-[10px] h-5 uppercase tracking-tighter">{account.type}</Badge>
                      </div>
                      <div className="flex justify-between items-end text-xs"><span className="text-muted-foreground">{account.bank} • ...{account.accountNumber.slice(-4)}</span><span className="font-mono font-bold">{formatCurrency(account.balance)}</span></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/30 border-dashed">
                <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Audit Integrity Protocol
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
                    <p>Reconciliation permanently links bank signals to your BKS General Ledger.</p>
                    <ul className="space-y-1">
                        <li className="flex gap-2"><Check className="h-3 w-3 text-primary shrink-0 mt-0.5"/> <span><strong>Matching</strong> verifies existing entries.</span></li>
                        <li className="flex gap-2"><Check className="h-3 w-3 text-primary shrink-0 mt-0.5"/> <span><strong>Creation</strong> builds new verified nodes.</span></li>
                        <li className="flex gap-2"><Check className="h-3 w-3 text-primary shrink-0 mt-0.5"/> <span>Reconciled items are <strong>locked</strong> for audit.</span></li>
                    </ul>
                </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <Card className="shadow-xl">
              <CardHeader className="border-b bg-muted/10">
                  <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Transactions: {selectedAccount?.name}</CardTitle>
                        <CardDescription>Verify bank records against your operational web.</CardDescription>
                    </div>
                    {selectedAccount?.type === 'Personal' && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Mixed Use Alert</Badge>
                    )}
                  </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/5">
                        <TableRow>
                            <TableHead className="w-32">Date</TableHead>
                            <TableHead>Bank Record Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Audit Status</TableHead>
                            <TableHead className="w-12 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map(txn => (
                        <TableRow key={txn.id} className={cn(txn.status === 'reconciled' && "opacity-60")}>
                          <TableCell className="text-xs font-medium">{txn.date}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-sm">{txn.description}</span>
                                {txn.accountId === 'acc_3' && txn.description.includes('Designer') && (
                                    <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 uppercase">
                                        <AlertTriangle className="h-3 w-3" /> Potential Business Expense
                                    </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className={cn("text-right font-mono font-bold", txn.amount > 0 ? 'text-green-600' : 'text-red-600')}>
                              {txn.amount > 0 ? '+' : ''}{formatCurrency(txn.amount)}
                          </TableCell>
                          <TableCell className="text-center">{getStatusBadge(txn.status)}</TableCell>
                          <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setTransactionToReconcile(txn)} disabled={txn.status === 'reconciled'}>
                                        <GitMerge className="mr-2 h-4 w-4 text-primary" />Reconcile Signal
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={!!transactionToReconcile} onOpenChange={() => setTransactionToReconcile(null)}>
        <DialogContent className="sm:max-w-2xl flex flex-col p-0 overflow-hidden text-black">
            <DialogHeader className="p-6 bg-primary/5 border-b shrink-0">
                <div className="flex items-center gap-2 text-primary mb-1">
                    <GitMerge className="h-6 w-6" />
                    <DialogTitle className="text-xl font-headline uppercase tracking-tight">Reconciliation Node</DialogTitle>
                </div>
                <DialogDescription>Match bank signal to Ogeemo nodes or create a new verified entry.</DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 max-h-[60vh]">
                <div className="p-6 space-y-6">
                    <Card className="bg-muted/30 border-2">
                        <CardHeader className="py-3 px-4 border-b bg-white/50">
                            <CardTitle className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                                <Landmark className="h-3 w-3" /> External Bank Signal
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 flex justify-between items-center">
                            <div className="space-y-1">
                                <p className="font-bold text-lg">{transactionToReconcile?.description}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarIcon className="h-3 w-3"/> {transactionToReconcile?.date}</p>
                            </div>
                            <p className={cn("text-2xl font-mono font-black", (transactionToReconcile?.amount || 0) < 0 ? 'text-red-600' : 'text-green-600')}>
                                {formatCurrency(transactionToReconcile?.amount || 0)}
                            </p>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" /> Internal Spider Web Suggestions
                        </h4>
                        
                        {isLoadingData ? <div className="flex justify-center p-8"><LoaderCircle className="h-8 w-8 animate-spin text-primary"/></div> : (
                            <div className="space-y-3">
                                {suggestedMatches.length > 0 ? suggestedMatches.map((match, i) => (
                                    <div key={`${match.id}-${i}`} className="flex items-center justify-between p-4 border rounded-xl hover:bg-primary/5 transition-all group cursor-pointer" onClick={() => handleMatch(match)}>
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-muted rounded-lg group-hover:bg-white transition-colors">
                                                {match.matchType === 'invoice' ? <FileDigit className="h-5 w-5 text-blue-500" /> : match.matchType === 'bill' ? <ExternalLink className="h-5 w-5 text-orange-500" /> : <PlusCircle className="h-5 w-5 text-green-500" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-sm">{match.company || match.vendor || match.companyName}</p>
                                                    <Badge variant="outline" className="text-[9px] uppercase tracking-tighter font-bold h-4 px-1">{match.matchType}</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate max-w-[300px]">{match.description || `Invoice #${match.invoiceNumber}`}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                            <div className="flex flex-col items-end">
                                                <p className="font-mono text-sm font-bold">${Math.abs(match.totalAmount || (match.originalAmount - match.amountPaid)).toFixed(2)}</p>
                                                <Badge className={cn("text-[8px] h-3 px-1 uppercase font-black", match.confidence === 'High' ? "bg-green-500" : "bg-amber-500")}>{match.confidence} Confidence</Badge>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center p-12 border-2 border-dashed rounded-2xl bg-muted/10 space-y-3">
                                        <Search className="h-10 w-10 mx-auto text-muted-foreground opacity-20" />
                                        <p className="text-sm font-medium text-muted-foreground">No automatic node matches found.</p>
                                        <p className="text-xs text-muted-foreground italic">Try creating a new ledger entry manually using the button below.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>

            <DialogFooter className="p-6 border-t bg-muted/10 shrink-0 sm:justify-between items-center gap-4">
                <Button variant="outline" className="h-12 px-6 font-bold" onClick={handleCreateNewEntry}>
                    <Plus className="mr-2 h-4 w-4" /> Create New Verified Entry
                </Button>
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => setTransactionToReconcile(null)} className="h-12 px-6 font-bold">Cancel</Button>
                </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewTransactionDialogOpen} onOpenChange={setIsNewTransactionDialogOpen}>
        <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh] p-0 text-black overflow-hidden">
          <DialogHeader className="p-6 border-b bg-primary/5">
            <DialogTitle className="text-2xl text-primary font-bold uppercase tracking-tight">Create & Verify Transaction</DialogTitle>
            <DialogDescription>Building a new node from a bank signal.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 bg-white">
            <div className="grid gap-6 py-8 px-10">
                <RadioGroup value={newTransactionType} onValueChange={(value) => setNewTransactionType(value as 'income' | 'expense')} className="grid grid-cols-2 gap-4">
                    <div><RadioGroupItem value="income" id="r-income" className="peer sr-only" /><Label htmlFor="r-income" className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-green-600 [&:has([data-state=checked])]:border-green-600 font-bold uppercase text-xs tracking-widest cursor-pointer">Income Node</Label></div>
                    <div><RadioGroupItem value="expense" id="r-expense" className="peer sr-only" /><Label htmlFor="r-expense" className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-600 [&:has([data-state=checked])]:border-red-600 font-bold uppercase text-xs tracking-widest cursor-pointer">Expense Node</Label></div>
                </RadioGroup>
                
                <div className="space-y-4 border rounded-2xl p-6 bg-muted/5">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tx-date-gl" className="text-xs uppercase font-bold text-muted-foreground">Date</Label>
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("col-span-3 h-11 justify-start text-left font-normal bg-white", !newTransaction.date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                    {newTransaction.date ? format(new Date(newTransaction.date), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <CustomCalendar mode="single" selected={newTransaction.date ? new Date(newTransaction.date) : undefined} onSelect={(date) => { if (date) setNewTransaction(p => ({ ...p, date: format(date, 'yyyy-MM-dd') })); setIsDatePickerOpen(false); }} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tx-company-gl" className="text-xs uppercase font-bold text-muted-foreground">Contact</Label>
                        <div className="col-span-3 space-y-2">
                            <div className="flex gap-2">
                                <Popover open={isCompanyPopoverOpen} onOpenChange={setIsCompanyPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="h-11 flex-1 justify-between font-normal bg-white">
                                            {newTransaction.company || "Select/Add Contact"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                            <CommandInput placeholder="Search..." value={newCompanyName} onValueChange={setNewCompanyName}/><CommandList><CommandEmpty><Button variant="ghost" className="w-full justify-start text-sm text-primary" onClick={() => handleCreateCompany(newCompanyName)}><Plus className="mr-2 h-4 w-4"/> Create "{newCompanyName}"</Button></CommandEmpty><CommandGroup>{companies?.map((c) => (<CommandItem key={c.id} value={c.name} onSelect={() => { setNewTransaction(prev => ({ ...prev, company: c.name })); setIsCompanyPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", newTransaction.company.toLowerCase() === c.name.toLowerCase() ? "opacity-100" : "opacity-0")} />{c.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
                            </div>
                        </div>
                    </div>
                    {newTransactionType === 'income' ? (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="tx-income-category-gl" className="text-xs uppercase font-bold text-muted-foreground">Tax Line</Label>
                            <div className="col-span-3">
                                <Popover open={isIncomeCategoryPopoverOpen} onOpenChange={setIsIncomeCategoryPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="h-11 w-full justify-between font-normal bg-white">{newTransaction.incomeCategory ? (incomeCategories.find(c => (c.categoryNumber || c.id) === newTransaction.incomeCategory)?.name || "Select category...") : "Select category..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search..." value={newIncomeCategoryName} onValueChange={setNewIncomeCategoryName}/><CommandList><CommandEmpty><Button variant="ghost" className="w-full justify-start text-sm text-primary" onClick={() => handleCreateIncomeCategory()}><Plus className="mr-2 h-4 w-4"/> Create "{newIncomeCategoryName}"</Button></CommandEmpty><CommandGroup>{incomeCategories.map((c) => (<CommandItem key={c.id} value={c.name} onSelect={() => { setNewTransaction(prev => ({ ...prev, incomeCategory: c.categoryNumber || c.id })); setIsIncomeCategoryPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", (newTransaction.incomeCategory === c.categoryNumber || newTransaction.incomeCategory === c.id) ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="tx-category-gl" className="text-xs uppercase font-bold text-muted-foreground">Tax Line</Label>
                            <div className="col-span-3">
                                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="h-11 w-full justify-between font-normal bg-white">{newTransaction.category ? (expenseCategories.find(c => (c.categoryNumber || c.id) === newTransaction.category)?.name || "Select category...") : "Select category..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search..." value={newExpenseCategoryName} onValueChange={setNewExpenseCategoryName}/><CommandList><CommandEmpty><Button variant="ghost" className="w-full justify-start text-sm text-primary" onClick={() => handleCreateExpenseCategory()}><Plus className="mr-2 h-4 w-4"/> Create "{newExpenseCategoryName}"</Button></CommandEmpty><CommandGroup>{expenseCategories.map((c) => (<CommandItem key={c.id} value={c.name} onSelect={() => { setNewTransaction(prev => ({ ...prev, category: c.categoryNumber || c.id })); setIsCategoryPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", (newTransaction.category === c.categoryNumber || newTransaction.category === c.id) ? "opacity-100" : "opacity-0")}/>{c.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-2 border-primary/20 rounded-2xl bg-primary/5 flex justify-between items-center">
                    <Label className="text-sm font-bold uppercase tracking-widest text-primary">Final Verified Amount</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-primary">$</span>
                        <Input value={newTransaction.totalAmount} readOnly disabled className="h-12 w-48 pl-7 text-2xl font-mono font-black text-primary border-primary/20 bg-white" />
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Administrative Context</Label>
                    <Input placeholder="Internal description..." value={newTransaction.description} onChange={(e) => setNewTransaction(prev => ({...prev, description: e.target.value}))} />
                    <Textarea placeholder="Audit Rationale: Why was this money moved?" rows={3} value={newTransaction.explanation} onChange={(e) => setNewTransaction(prev => ({...prev, explanation: e.target.value}))} />
                </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
            <Button variant="ghost" className="h-12 font-bold" onClick={() => setIsNewTransactionDialogOpen(false)}>Cancel</Button>
            <Button className="h-12 px-10 font-bold shadow-xl" onClick={handleSaveTransaction}>Build & Reconcile Node</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="sm:max-w-xl text-black">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
                <ShieldCheck className="h-6 w-6" />
                <DialogTitle className="text-2xl font-headline">Reconciliation Philosophy</DialogTitle>
            </div>
            <DialogDescription>
              Maintaining the integrity of the Ogeemo Spider Web.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6 text-sm leading-relaxed">
            <section className="space-y-2">
              <h4 className="font-bold text-foreground">The Audit Standard</h4>
              <p className="text-muted-foreground">
                In a defensible business, your bank record is the "External Signal" and your ledger is the "Internal Node." Reconciliation is the process of proving that they match.
              </p>
            </section>
            <section className="space-y-2">
              <h4 className="font-bold text-foreground text-primary uppercase text-xs">High-Fidelity One-Click Sync</h4>
              <p className="text-muted-foreground">
                If you see a bank deposit that matches an outstanding invoice, Ogeemo allows you to reconcile them instantly. This marks the invoice as paid, records the income in your BKS General Ledger, and locks the entry with a bank reference—all in one orchestration.
              </p>
            </section>
            <div className="p-4 bg-primary/5 rounded-xl border border-dashed border-primary/20 italic text-xs text-muted-foreground">
                "We don't record numbers; we record proof." - The Ogeemo Method
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsInfoDialogOpen(false)}>Return to Hub</Button>
          </DialogFooter>
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
    </>
  );
}