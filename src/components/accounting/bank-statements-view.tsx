'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Plus, 
    Link2, 
    ShieldCheck, 
    LoaderCircle, 
    ChevronsUpDown, 
    Check, 
    MoreVertical, 
    Pencil, 
    Trash2, 
    Info,
    ArrowRight,
    Landmark,
    Calendar as CalendarIcon,
    X,
    Zap,
    Upload,
    Layers,
    Scale,
    ChevronLeft,
    FileSpreadsheet,
    Bot,
    Search,
    TrendingUp,
    TrendingDown,
    Activity,
    ArrowUpDown,
    ArrowUpZA,
    ArrowDownAZ
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/auth-context';
import { 
    getCompanies, 
    getExpenseCategories, 
    getIncomeCategories, 
    type Company, 
    type ExpenseCategory, 
    type IncomeCategory,
    type TaxType,
    getTaxTypes,
    getInternalAccounts,
    addInternalAccount,
    updateInternalAccount,
    deleteInternalAccount,
    type InternalAccount
} from '@/services/accounting-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, ensureSystemFolders, type FolderData } from '@/services/contact-folder-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { format, parseISO, isValid } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CustomCalendar } from '../ui/custom-calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ContactFormDialog = dynamic(() => import('@/components/contacts/contact-form-dialog'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><LoaderCircle className="h-10 w-10 animate-spin text-white" /></div>,
});

type BankTransaction = {
  id: string;
  accountId: string;
  date: string;
  transactionType: string;
  name: string;
  memo: string;
  amount: number;
};

const initialBankTransactions: BankTransaction[] = [
  { id: 'txn_b_1', accountId: 'acc_1', date: '2024-07-25', transactionType: 'ACH', name: 'Client Alpha', memo: 'Invoice #1001 payment', amount: 5000 },
  { id: 'txn_b_2', accountId: 'acc_1', date: '2024-07-25', transactionType: 'DEBIT', name: 'Cloud Hosting Inc.', memo: 'Monthly server fee', amount: -150 },
  { id: 'txn_b_3', accountId: 'acc_1', date: '2024-07-24', transactionType: 'TRANSFER', name: 'Stripe Payout', memo: 'Merchant settle', amount: 850.75 },
  { id: 'txn_b_4', accountId: 'acc_1', date: '2024-07-23', transactionType: 'DEBIT', name: 'SaaS Tools Co.', memo: 'Subscription', amount: -75.99 },
  { id: 'txn_b_5', accountId: 'acc_1', date: '2024-07-22', transactionType: 'XFER', name: 'Self Transfer', memo: 'To savings', amount: -10000 },
  { id: 'txn_b_6', accountId: 'acc_1', date: '2024-07-21', transactionType: 'DEBIT', name: 'Shell Oil', memo: 'Fuel', amount: -55.45 },
];

const emptyAccountForm = {
    name: '',
    bankName: '',
    businessType: 'Business' as "Business" | "Personal",
    institutionNumber: '',
    transitNumber: '',
    accountNumber: '',
};

export function BankStatementsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountIdParam = searchParams.get('accountId');

  const [accounts, setAccounts] = React.useState<InternalAccount[]>([]);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [accountForm, setAccountForm] = React.useState(emptyAccountForm);
  const [editingAccount, setEditingAccount] = React.useState<InternalAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = React.useState<InternalAccount | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [expenseCategories, setExpenseCategories] = React.useState<ExpenseCategory[]>([]);
  const [incomeCategories, setIncomeCategories] = React.useState<IncomeCategory[]>([]);
  const [bankTransactions, setBankTransactions] = React.useState<BankTransaction[]>(initialBankTransactions);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const [isContactFormOpen, setIsContactFormOpen] = React.useState(false);
  const [contactFolders, setContactFolders] = React.useState<FolderData[]>([]);
  const [customIndustries, setCustomIndustries] = React.useState<Industry[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [taxTypes, setTaxTypes] = React.useState<TaxType[]>([]);

  const [sortConfig, setSortConfig] = React.useState<{ key: keyof BankTransaction; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
  const [searchQuery, setSearchQuery] = React.useState("");

  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadData = React.useCallback(async () => {
    if (!user) {
        setIsLoadingData(false);
        return;
    }
    setIsLoadingData(true);
    try {
        const [fetchedAccounts, fetchedCompanies, fetchedExpenseCategories, fetchedIncomeCategories, fetchedFolders, fetchedIndustries, fetchedContacts, fetchedTaxTypes] = await Promise.all([
            getInternalAccounts(user.uid),
            getCompanies(user.uid),
            getExpenseCategories(user.uid),
            getIncomeCategories(user.uid),
            getContactFolders(user.uid),
            getIndustries(user.uid),
            getContacts(),
            getTaxTypes(user.uid)
        ]);
        setAccounts(fetchedAccounts);
        setCompanies(fetchedCompanies);
        setExpenseCategories(fetchedExpenseCategories);
        setIncomeCategories(fetchedIncomeCategories);
        setContactFolders(fetchedFolders);
        setCustomIndustries(fetchedIndustries);
        setContacts(fetchedContacts);
        setTaxTypes(fetchedTaxTypes);
    } catch (error: any) {
        console.error("Bank Hub Load Error:", error);
    } finally {
        setIsLoadingData(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const requestSort = (key: keyof BankTransaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const { selectedAccount, transactions, totalDebits, totalCredits, netDifference } = React.useMemo(() => {
    const acc = accounts.find(a => a.id === accountIdParam);
    let txs = bankTransactions.filter(txn => txn.accountId === accountIdParam);
    
    if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        txs = txs.filter(t => 
            t.name.toLowerCase().includes(term) || 
            t.memo.toLowerCase().includes(term) || 
            t.transactionType.toLowerCase().includes(term) ||
            t.amount.toFixed(2).includes(term) ||
            Math.abs(t.amount).toFixed(2).includes(term)
        );
    }

    const debits = txs.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
    const credits = txs.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const diff = credits + debits;

    if (sortConfig) {
        txs = [...txs].sort((a, b) => {
            let aValue: any = a[sortConfig.key];
            let bValue: any = b[sortConfig.key];

            if (sortConfig.key === 'date') {
                aValue = new Date(a.date).getTime();
                bValue = new Date(b.date).getTime();
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    return { 
        selectedAccount: acc,
        transactions: txs, 
        totalDebits: Math.abs(debits),
        totalCredits: credits,
        netDifference: diff
    };
  }, [bankTransactions, accountIdParam, accounts, sortConfig, searchQuery]);

  const handlePlaidContinue = () => {
    setIsLinkDialogOpen(false);
    toast({
        title: "Connecting to Plaid...",
        description: "In a real application, the secure Plaid Link flow would start now."
    });
  };

  const handleOpenAccountDialog = (account?: InternalAccount) => {
      if (account) {
          setEditingAccount(account);
          setAccountForm({
              name: account.name,
              bankName: account.bankName || '',
              businessType: account.businessType || 'Business',
              institutionNumber: account.institutionNumber || '',
              transitNumber: account.transitNumber || '',
              accountNumber: account.accountNumber || '',
          });
      } else {
          setEditingAccount(null);
          setAccountForm(emptyAccountForm);
      }
      setIsAccountDialogOpen(true);
  };

  const handleSaveAccount = async () => {
      if (!user) return;
      if (!accountForm.name || !accountForm.bankName || !accountForm.institutionNumber || !accountForm.transitNumber || !accountForm.accountNumber) {
          toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill out all identification fields.' });
          return;
      }
      
      try {
          const accountData: Partial<InternalAccount> = {
              name: accountForm.name,
              bankName: accountForm.bankName,
              businessType: accountForm.businessType,
              institutionNumber: accountForm.institutionNumber,
              transitNumber: accountForm.transitNumber,
              accountNumber: accountForm.accountNumber,
              type: 'Bank',
              userId: user.uid,
          };

          if (editingAccount) {
              await updateInternalAccount(editingAccount.id, accountData);
              setAccounts(prev => prev.map(a => a.id === editingAccount.id ? { ...a, ...accountData } : a));
              toast({ title: 'Account Updated', description: 'Account details have been saved.' });
          } else {
              const savedAccount = await addInternalAccount(accountData as Omit<InternalAccount, 'id'>);
              setAccounts(prev => [...prev, savedAccount]);
              toast({ title: 'Account Added', description: 'New account is ready for use.' });
          }
          setIsAccountDialogOpen(false);
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
      }
  };

  const handleConfirmDeleteAccount = async () => {
      if (!accountToDelete) return;
      try {
          await deleteInternalAccount(accountToDelete.id);
          setAccounts(prev => prev.filter(a => a.id !== accountToDelete.id));
          toast({ title: 'Account Deleted', description: 'Financial node removed from registry.' });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
      } finally {
          setAccountToDelete(null);
          setIsDeleteAlertOpen(false);
      }
  };

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
    setContacts(prev => isEditing ? prev.map(c => c.id === savedContact.id ? savedContact : c) : [savedContact, ...prev]);
    setIsContactFormOpen(false);
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !accountIdParam) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const newTxns: BankTransaction[] = lines.slice(1).filter(line => line.trim()).map((line, index) => {
            const parts = line.split(',');
            const dateStr = parts[0]?.trim().replace(/^"|"$/g, '') || format(new Date(), 'yyyy-MM-dd');
            const typeStr = parts[1]?.trim().replace(/^"|"$/g, '') || 'N/A';
            const nameStr = parts[2]?.trim().replace(/^"|"$/g, '') || 'Unknown';
            const memoStr = parts[3]?.trim().replace(/^"|"$/g, '') || '';
            const amountStr = parts[4]?.trim().replace(/^"|"$/g, '') || '0';
            
            return {
                id: `up_${Date.now()}_${index}`,
                accountId: accountIdParam,
                date: dateStr,
                transactionType: typeStr,
                name: nameStr,
                memo: memoStr,
                amount: parseFloat(amountStr),
            };
        });
        
        setBankTransactions(prev => [...newTxns, ...prev]);
        toast({ title: 'Statement Ingested', description: `Detected ${newTxns.length} new signals in the CSV.` });
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  const handleSelectAccount = (id: string) => {
      router.push(`/accounting/bank-statements?accountId=${id}`);
  };

  const handleBackToAccounts = () => {
      router.push(`/accounting/bank-statements`);
  };

  const commonDialogs = (
    <React.Fragment>
        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Link2 className="h-6 w-6" />
                        <DialogTitle>Connect Financial Institution</DialogTitle>
                    </div>
                    <DialogDescription>Securely synchronize bank signals using Plaid.</DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <div className="flex items-start gap-4 p-4 border rounded-xl bg-primary/5">
                        <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Ogeemo never sees or stores your credentials. Connections are encrypted end-to-end via Plaid's secure portal.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handlePlaidContinue} className="w-full h-12 text-lg font-bold">Continue to Plaid</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
            <DialogContent className="sm:max-w-lg overflow-hidden flex flex-col p-0 text-black">
                <DialogHeader className="p-6 bg-primary/5 border-b shrink-0">
                    <DialogTitle>{editingAccount ? 'Edit Account Details' : 'Add New Account'}</DialogTitle>
                    <DialogDescription>
                        {editingAccount ? 'Update identification for this financial node.' : 'Add a new financial account to your workspace.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Account Nickname</Label><Input value={accountForm.name} onChange={e => setAccountForm(p => ({...p, name: e.target.value}))} placeholder="e.g., Primary Chequing" /></div>
                        <div className="space-y-2"><Label>Bank Name</Label><Input value={accountForm.bankName} onChange={e => setAccountForm(p => ({...p, bankName: e.target.value}))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Categorization</Label>
                            <Select value={accountForm.businessType} onValueChange={(v: any) => setAccountForm(p => ({...p, businessType: v}))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Business">Business Operations</SelectItem>
                                    <SelectItem value="Personal">Personal Identity</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Inst. #</Label><Input value={accountForm.institutionNumber} onChange={e => setAccountForm(p => ({...p, institutionNumber: e.target.value}))} /></div>
                        <div className="space-y-2"><Label>Transit #</Label><Input value={accountForm.transitNumber} onChange={e => setAccountForm(p => ({...p, transitNumber: e.target.value}))} /></div>
                        <div className="space-y-2"><Label>Account #</Label><Input value={accountForm.accountNumber} onChange={e => setAccountForm(p => ({...p, accountNumber: e.target.value}))} /></div>
                    </div>
                </div>
                <DialogFooter className="p-6 border-t bg-muted/10">
                    <Button variant="ghost" onClick={() => setIsAccountDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveAccount}>{editingAccount ? 'Save Changes' : 'Add Account'}</Button>
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

        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the account <strong className="font-bold">"{accountToDelete?.name}"</strong> from your registry. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDeleteAccount} className="bg-destructive hover:bg-destructive/90">Delete Account</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </React.Fragment>
  );

  if (!accountIdParam) {
      return (
        <div className="p-4 sm:p-6 space-y-6 text-black min-h-full bg-muted/5">
            <AccountingPageHeader pageTitle="Bank Accounts" />
            <header className="text-center">
                <div className="flex items-center justify-center gap-2">
                    <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Bank Accounts</h1>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
                    Select a bank account to download and review a statement
                </p>
            </header>

            <div className="max-w-4xl mx-auto space-y-6">
                <Card className="shadow-lg border-primary/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Connected Accounts</CardTitle>
                            <CardDescription>Review external transactions before matching them in the General Ledger.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => handleOpenAccountDialog()}>
                                <Plus className="mr-2 h-4 w-4" /> Add An Account
                            </Button>
                            <Button onClick={() => setIsLinkDialogOpen(true)}>
                                <Link2 className="mr-2 h-4 w-4" /> Secure Bank Link
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {accounts.map(account => (
                            <Card 
                                key={account.id} 
                                className="group border-muted hover:border-primary hover:shadow-md transition-all relative overflow-hidden"
                            >
                                <CardContent className="p-6 flex justify-between items-center cursor-pointer" onClick={() => handleSelectAccount(account.id)}>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Landmark className="h-5 w-5 text-primary" />
                                            <h3 className="font-bold text-lg">{account.name}</h3>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{account.bankName} • Ending in: {account.accountNumber?.slice(-4)}</p>
                                        <Badge variant={account.businessType === 'Business' ? 'default' : 'secondary'} className="text-[10px] uppercase">{account.businessType || 'N/A'}</Badge>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[10px] uppercase font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 justify-end">
                                            Review Activity <ArrowRight className="h-3 w-3" />
                                        </p>
                                    </div>
                                </CardContent>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => handleOpenAccountDialog(account)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={() => { setAccountToDelete(account); setIsDeleteAlertOpen(true); }} className="text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </Card>
                        ))}
                        {accounts.length === 0 && !isLoadingData && (
                            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl opacity-40">
                                <Landmark className="h-12 w-12 mx-auto mb-2" />
                                <p className="font-bold">No accounts registered.</p>
                                <p className="text-xs">Click "Add An Account" to establish your first connection.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-primary/5 border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Zap className="h-4 w-4" /> High-Fidelity Mirror
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Review external bank signals directly in Ogeemo. These records provide the physical world proof for your audit trail.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" /> GL-First Workflow
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Use this hub for information only. The act of reconciliation occurs in the General Ledger to ensure professional node parity.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Bot className="h-4 w-4" /> Data Triage
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Ingest CSV statements or link via Plaid to build your Black Box of Evidence without redundant manual entry.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {commonDialogs}
        </div>
      );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 text-black bg-background min-h-screen">
        <AccountingPageHeader pageTitle="Bank Statement" />
        
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={handleBackToAccounts} className="h-10">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="text-left">
                    <h1 className="text-3xl font-bold font-headline text-primary leading-none uppercase tracking-tight">Bank Statement</h1>
                    <p className="text-muted-foreground text-sm font-medium mt-1">
                        {selectedAccount?.name} • {selectedAccount?.bankName} • Ending in: {selectedAccount?.accountNumber?.slice(-4)}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-10 font-bold border-primary text-primary hover:bg-primary/5">
                    <Upload className="mr-2 h-4 w-4" /> Upload CSV Statement
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleCsvUpload} />
                <Button asChild variant="ghost" size="icon" className="h-10 w-10">
                    <Link href="/action-manager"><X className="h-5 w-5" /></Link>
                </Button>
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1 space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest ml-1">Discovery Terminal</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search names, memos, or amount..." 
                        className="h-11 pl-10 bg-white border-black/20 focus-visible:ring-primary shadow-sm"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                            onClick={() => setSearchQuery('')}
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    )}
                </div>
            </div>
            <div className="md:col-span-3 grid grid-cols-3 gap-3">
                <Card className="bg-red-50/50 border-red-100 shadow-sm py-2 px-4 border-2">
                    <p className="text-[9px] uppercase font-bold text-red-600 tracking-[0.2em] mb-0.5 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Total Debits
                    </p>
                    <p className="font-mono font-bold text-red-600 text-lg">({formatCurrency(totalDebits)})</p>
                </Card>
                <Card className="bg-green-50/50 border-green-100 shadow-sm py-2 px-4 border-2">
                    <p className="text-[9px] uppercase font-bold text-green-600 tracking-[0.2em] mb-0.5 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Total Credits
                    </p>
                    <p className="font-mono font-bold text-green-600 text-lg">{formatCurrency(totalCredits)}</p>
                </Card>
                <Card className="bg-primary/5 border-primary/10 shadow-sm py-2 px-4 border-2">
                    <p className="text-[9px] uppercase font-bold text-primary tracking-[0.2em] mb-0.5 flex items-center gap-1">
                        <Activity className="h-3 w-3" /> Net Activity
                    </p>
                    <p className={cn("font-mono font-bold text-lg", netDifference >= 0 ? "text-primary" : "text-destructive")}>
                        {netDifference >= 0 ? '+' : ''}{formatCurrency(netDifference)}
                    </p>
                </Card>
            </div>
        </div>

        <Card className="shadow-2xl overflow-hidden border-black">
            <CardHeader className="bg-muted/10 border-b py-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    External Transaction Mirror (Information Only)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/5">
                        <TableRow className="hover:bg-transparent border-b-black">
                            <TableHead className="p-0 w-32">
                                <Button variant="ghost" onClick={() => requestSort('date')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                    Date {sortConfig?.key === 'date' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                </Button>
                            </TableHead>
                            <TableHead className="p-0 w-32">
                                <Button variant="ghost" onClick={() => requestSort('transactionType')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                    Type {sortConfig?.key === 'transactionType' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                </Button>
                            </TableHead>
                            <TableHead className="p-0">
                                <Button variant="ghost" onClick={() => requestSort('name')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                    Counterparty {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                </Button>
                            </TableHead>
                            <TableHead className="p-0">
                                <Button variant="ghost" onClick={() => requestSort('memo')} className="h-full w-full justify-start px-4 font-bold hover:bg-muted/50 rounded-none">
                                    Memo / Details {sortConfig?.key === 'memo' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                </Button>
                            </TableHead>
                            <TableHead className="p-0 text-right w-40">
                                <Button variant="ghost" onClick={() => requestSort('amount')} className="h-full w-full justify-end px-4 font-bold hover:bg-muted/50 rounded-none pr-8">
                                    Amount {sortConfig?.key === 'amount' ? (sortConfig.direction === 'asc' ? <ArrowUpZA className="ml-2 h-4 w-4" /> : <ArrowDownAZ className="ml-2 h-4 w-4" />) : <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />}
                                </Button>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map(txn => (
                        <TableRow key={txn.id} className="border-b-black/10 group">
                          <TableCell className="text-xs font-bold font-mono pl-4">{txn.date}</TableCell>
                          <TableCell className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">{txn.transactionType}</TableCell>
                          <TableCell className="font-bold text-sm">{txn.name}</TableCell>
                          <TableCell className="text-xs italic text-muted-foreground truncate max-w-xs">{txn.memo}</TableCell>
                          <TableCell className={cn("text-right font-mono font-black text-lg pr-8", txn.amount > 0 ? 'text-green-600' : 'text-red-600')}>
                              {txn.amount > 0 ? '+' : ''}{formatCurrency(txn.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {transactions.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={5} className="h-64 text-center">
                                  <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                                      <Search className="h-12 w-12" />
                                      <div className="space-y-1">
                                          <p className="font-bold">{searchQuery ? 'No matching records found.' : 'No signals ingested.'}</p>
                                          <p className="text-xs">{searchQuery ? 'Try a different search term or amount.' : 'Upload a CSV statement to begin reviewing activity.'}</p>
                                      </div>
                                  </div>
                              </TableCell>
                          </TableRow>
                      )}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t py-3 justify-center">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.3em]">Operational Node: {selectedAccount?.id} • Evidence Mirror</p>
            </CardFooter>
        </Card>
        {commonDialogs}
    </div>
  );
}
