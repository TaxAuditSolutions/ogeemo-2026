'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LoaderCircle,
  Plus,
  Trash2,
  Edit,
  Info,
  GitMerge,
  FileSignature,
  ShieldAlert,
  Archive,
  Undo,
  PlusCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  X,
} from 'lucide-react';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import {
  getIncomeCategories, addIncomeCategory, updateIncomeCategory, deleteIncomeCategory, deleteIncomeCategories,
  getExpenseCategories, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, deleteExpenseCategories,
  archiveIncomeCategory, restoreIncomeCategory,
  archiveExpenseCategory, restoreExpenseCategory,
  mergeCategories,
  type IncomeCategory,
  type ExpenseCategory,
} from '@/core/accounting-service';
import { t2125ExpenseCategories, t2125IncomeCategories } from '@/data/standard-expense-categories';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { CategoryTable } from './category-table';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import Link from 'next/link';

type Category = IncomeCategory | ExpenseCategory;
type CategoryType = 'income' | 'expense';

const standardIncomeLines = new Set(t2125IncomeCategories.map(c => c.line));
const standardExpenseLines = new Set(t2125ExpenseCategories.map(c => c.line));

export function TaxCategoriesView() {
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedIncomeIds, setSelectedIncomeIds] = useState<string[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archivedIncome, setArchivedIncome] = useState<IncomeCategory[]>([]);
  const [archivedExpenses, setArchivedExpenses] = useState<ExpenseCategory[]>([]);

  const [dialogState, setDialogState] = useState<{
      isOpen: boolean;
      type: CategoryType | null;
      mode: 'add' | 'edit';
      category: Category | null;
  }>({ isOpen: false, type: null, mode: 'add', category: null });
  const [categoryName, setCategoryName] = useState('');
  const [categoryNumber, setCategoryNumber] = useState('');

  const [categoryToDelete, setCategoryToDelete] = useState<{ category: Category; type: CategoryType } | null>(null);
  const [bulkDeleteType, setBulkDeleteType] = useState<CategoryType | null>(null);
  
  const [infoDialogState, setInfoDialogState] = useState<{ isOpen: boolean; category: Category | null }>({ isOpen: false, category: null });
  const [explanation, setExplanation] = useState('');

  const [mergeDialogState, setMergeDialogState] = useState<{ isOpen: boolean; category: Category | null, type: CategoryType | null }>({ isOpen: false, category: null, type: null });
  const [mergeTarget, setMergeTarget] = useState('');
  
  const [categoryToArchive, setCategoryToArchive] = useState<{ category: Category; type: CategoryType } | null>(null);
  

  const loadData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const [inc, exp] = await Promise.all([
            getIncomeCategories(user.uid),
            getExpenseCategories(user.uid),
        ]);
        setIncomeCategories(inc.filter(c => !c.isArchived));
        setArchivedIncome(inc.filter(c => c.isArchived));
        setExpenseCategories(exp.filter(c => !c.isArchived));
        setArchivedExpenses(exp.filter(c => c.isArchived));
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to load categories', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const openDialog = (type: CategoryType, mode: 'add' | 'edit', category: Category | null = null) => {
    setDialogState({ isOpen: true, type, mode, category });
    setCategoryName(mode === 'edit' && category ? category.name : '');
    setCategoryNumber(mode === 'edit' && category ? category.categoryNumber || '' : '');
  };
  
  const handleSave = async () => {
    if (!user || !dialogState.type || !categoryName.trim()) {
        toast({ variant: 'destructive', title: 'Category name is required.' });
        return;
    }

    try {
        if (dialogState.mode === 'add') {
            if (dialogState.type === 'income') {
                const newCat = await addIncomeCategory({ name: categoryName.trim(), userId: user.uid, categoryNumber: categoryNumber.trim() });
                setIncomeCategories(prev => [...prev, newCat].sort((a,b) => a.name.localeCompare(b.name)));
            } else {
                const newCat = await addExpenseCategory({ name: categoryName.trim(), userId: user.uid, categoryNumber: categoryNumber.trim() });
                setExpenseCategories(prev => [...prev, newCat].sort((a,b) => a.name.localeCompare(b.name)));
            }
            toast({ title: 'Category Added' });
        } else if (dialogState.category) { // Edit mode
            if (dialogState.type === 'income') {
                await updateIncomeCategory(dialogState.category.id, { name: categoryName.trim(), categoryNumber: categoryNumber.trim() });
                setIncomeCategories(prev => prev.map(c => c.id === dialogState.category!.id ? {...c, name: categoryName.trim(), categoryNumber: categoryNumber.trim() } : c));
            } else {
                await updateExpenseCategory(dialogState.category.id, { name: categoryName.trim(), categoryNumber: categoryNumber.trim() });
                setExpenseCategories(prev => prev.map(c => c.id === dialogState.category!.id ? {...c, name: categoryName.trim(), categoryNumber: categoryNumber.trim() } : c));
            }
            toast({ title: 'Category Updated' });
        }
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Save failed', description: error.message });
    } finally {
        setDialogState({ isOpen: false, type: null, mode: 'add', category: null });
    }
  };

  const handleDelete = (category: Category, type: CategoryType) => {
    if (category.categoryNumber && !String(category.categoryNumber).startsWith('C-')) {
        toast({ variant: 'destructive', title: 'Cannot Delete', description: 'Standard CRA categories cannot be deleted, only archived.' });
        return;
    }
    setCategoryToDelete({ category, type });
  };
  
  const handleConfirmDelete = async () => {
      if (!categoryToDelete) return;
      try {
          if (categoryToDelete.type === 'income') {
              await deleteIncomeCategory(categoryToDelete.category.id);
              setIncomeCategories(prev => prev.filter(c => c.id !== categoryToDelete.category.id));
          } else {
              await deleteExpenseCategory(categoryToDelete.category.id);
              setExpenseCategories(prev => prev.filter(c => c.id !== categoryToDelete.category.id));
          }
          toast({ title: 'Category Deleted' });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
      } finally {
          setCategoryToDelete(null);
      }
  };
  
  const handleConfirmBulkDelete = async () => {
    if (!bulkDeleteType) return;
    try {
        if (bulkDeleteType === 'income') {
            await deleteIncomeCategories(selectedIncomeIds);
            setIncomeCategories(prev => prev.filter(c => !selectedIncomeIds.includes(c.id)));
            toast({ title: 'Income Categories Deleted' });
            setSelectedIncomeIds([]);
        } else {
            await deleteExpenseCategories(selectedExpenseIds);
            setExpenseCategories(prev => prev.filter(c => !selectedExpenseIds.includes(c.id)));
            toast({ title: 'Expense Categories Deleted' });
            setSelectedExpenseIds([]);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Bulk delete failed', description: error.message });
    } finally {
        setBulkDeleteType(null);
    }
  };

  const handleConfirmArchive = async () => {
    if (!categoryToArchive || !user) return;
    try {
      if (categoryToArchive.type === 'income') {
        await archiveIncomeCategory(user.uid, categoryToArchive.category.id);
      } else {
        await archiveExpenseCategory(user.uid, categoryToArchive.category.id);
      }
      toast({ title: 'Category Archived', description: 'Transactions have been moved to "Other".' });
      await loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Archive failed', description: error.message });
    } finally {
      setCategoryToArchive(null);
    }
  };

  const handleRestore = async (category: Category, type: CategoryType) => {
    try {
      if (type === 'income') {
        await restoreIncomeCategory(category.id);
      } else {
        await restoreExpenseCategory(category.id);
      }
      toast({ title: 'Category Restored' });
      await loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Restore failed', description: error.message });
    }
  };

  const handleViewInfo = (category: Category) => {
    setInfoDialogState({ isOpen: true, category });
    
    const isStandardIncome = t2125IncomeCategories.find(c => c.description === category.name);
    const isStandardExpense = t2125ExpenseCategories.find(c => c.description === category.name);
    
    if (isStandardIncome) {
        setExplanation(isStandardIncome.explanation);
    } else if (isStandardExpense) {
        setExplanation(isStandardExpense.explanation);
    } else {
        setExplanation((category as any).explanation || `This is a custom category. Add your explanation here to ensure consistent transaction logging.`);
    }
  };

  const handleSaveExplanation = () => {
    if (!infoDialogState.category) return;
    toast({ title: "Explanation Saved (Simulated)" });
    setInfoDialogState({ isOpen: false, category: null });
  };

  const handleMerge = (category: Category, type: CategoryType) => {
    setMergeDialogState({ isOpen: true, category, type });
    setMergeTarget('');
  };

  const handleConfirmMerge = async () => {
    if (!user || !mergeDialogState.category || !mergeDialogState.type || !mergeTarget) {
      toast({ variant: 'destructive', title: 'Invalid Operation', description: 'Missing information to perform merge.' });
      return;
    }
    try {
        await mergeCategories(
            user.uid,
            mergeDialogState.category.id,
            mergeTarget,
            mergeDialogState.type
        );
        toast({ title: 'Merge Successful', description: `All transactions from "${mergeDialogState.category.name}" have been reassigned.` });
        loadData();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Merge Failed', description: error.message });
    } finally {
        setMergeDialogState({ isOpen: false, category: null, type: null });
    }
  };

  const getMergeOptions = (type: CategoryType | null) => {
    if (type === 'income') {
        return t2125IncomeCategories;
    }
    if (type === 'expense') {
        return t2125ExpenseCategories;
    }
    return [];
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="Tax Category Manager" hubPath="/accounting/tax" hubLabel="Tax Center" />
        <header className="text-center relative">
          <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Tax Category Manager</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg mt-2">
            Organize your business income and expenses. Distinguish between standard CRA lines and your unique custom nodes.
          </p>
           <div className="mt-6 flex justify-center gap-3">
                <Button variant="outline" size="lg" onClick={() => setIsArchiveDialogOpen(true)} className="h-12 px-8">
                    <Archive className="mr-2 h-5 w-5" /> Archived categories
                </Button>
                <Button size="lg" onClick={() => openDialog('expense', 'add')} className="h-12 px-8 shadow-lg text-lg">
                    <PlusCircle className="mr-2 h-5 w-5" /> New custom category
                </Button>
            </div>
            <div className="absolute top-0 right-0">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/action-manager"><X className="h-5 w-5"/></Link>
                </Button>
            </div>
        </header>

        {isLoading ? (
            <div className="flex h-64 items-center justify-center flex-col gap-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse font-bold uppercase tracking-widest text-xs">Syncing audit lines...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-none mx-auto">
                <CategoryTable 
                    title="Income Categories"
                    description="Standard and custom nodes for all revenue streams."
                    categories={incomeCategories}
                    onAdd={() => openDialog('income', 'add')}
                    onEdit={(cat) => openDialog('income', 'edit', cat)}
                    onDelete={(cat) => handleDelete(cat, 'income')}
                    onArchive={(cat) => setCategoryToArchive({ category: cat, type: 'income' })}
                    onMerge={(cat) => handleMerge(cat, 'income')}
                    onViewInfo={handleViewInfo}
                    selectedIds={selectedIncomeIds}
                    onSelectedIdsChange={setSelectedIncomeIds}
                    onBulkDelete={() => setBulkDeleteType('income')}
                    categoryType="income"
                />
                 <CategoryTable 
                    title="Expense Categories"
                    description="Nodes for managing business costs and deductions."
                    categories={expenseCategories}
                    onAdd={() => openDialog('expense', 'add')}
                    onEdit={(cat) => openDialog('expense', 'edit', cat)}
                    onDelete={(cat) => handleDelete(cat, 'expense')}
                    onArchive={(cat) => setCategoryToArchive({ category: cat, type: 'expense' })}
                    onMerge={(cat) => handleMerge(cat, 'expense')}
                    onViewInfo={handleViewInfo}
                    selectedIds={selectedExpenseIds}
                    onSelectedIdsChange={setSelectedExpenseIds}
                    onBulkDelete={() => setBulkDeleteType('expense')}
                    categoryType="expense"
                />
            </div>
        )}
      </div>

      <Dialog open={dialogState.isOpen} onOpenChange={(open) => setDialogState({ ...dialogState, isOpen: open })}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <div className="flex items-center gap-2 text-primary mb-1">
                      <FileSignature className="h-5 w-5" />
                      <DialogTitle className="text-xl font-headline">{dialogState.mode === 'add' ? 'New' : 'Edit'} {dialogState.type} Category</DialogTitle>
                  </div>
                  <DialogDescription>Create a custom node for your BKS financial orchestration.</DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="category-name" className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Category Label</Label>
                    <Input id="category-name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="h-12 text-lg font-semibold" placeholder="e.g., Digital Subscriptions" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category-number" className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Reference # (Optional)</Label>
                    <Input id="category-number" value={categoryNumber} onChange={(e) => setCategoryNumber(e.target.value)} placeholder="e.g., C-101" className="h-11 font-mono" />
                    <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-dashed border-primary/20 mt-2">
                        <Info className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-[10px] text-muted-foreground leading-tight">
                            If left blank, Ogeemo will automatically assign a unique high-fidelity reference number starting with <strong>"C-"</strong>.
                        </p>
                    </div>
                </div>
              </div>
              <DialogFooter className="bg-muted/10 -mx-6 -mb-6 p-6 rounded-b-lg gap-3">
                  <Button variant="ghost" onClick={() => setDialogState({ isOpen: false, type: null, mode: 'add', category: null })} className="h-12 px-6">Cancel</Button>
                  <Button onClick={handleSave} className="h-12 px-10 font-bold shadow-xl">
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      {dialogState.mode === 'add' ? 'Add Category' : 'Save Changes'}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the custom category "{categoryToDelete?.category.name}". Transactions already assigned to this category will remain unchanged but lose their parent link. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete Permanently</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={!!categoryToArchive} onOpenChange={() => setCategoryToArchive(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Archive Category?</AlertDialogTitle>
                <AlertDialogDescription>
                    Archiving "{categoryToArchive?.category.name}" will hide it from the primary audit list. Any transactions currently in this category will be moved to the generic "Other" category for compliance.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmArchive}>Confirm Archive</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
       </AlertDialog>

       <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 border-b bg-muted/10 shrink-0">
                <div className="flex items-center gap-2 text-primary mb-1">
                    <Archive className="h-5 w-5" />
                    <DialogTitle className="text-xl font-headline">Archived Audit Lines</DialogTitle>
                </div>
                <DialogDescription>
                    These nodes are currently hidden from your primary BKS workflow.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 px-6 overflow-hidden flex-1">
                <div className="flex flex-col min-h-0">
                    <h3 className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground mb-3 flex items-center gap-2">
                        <TrendingUp className="h-3 w-3" /> Income Streams
                    </h3>
                    <ScrollArea className="flex-1 border rounded-xl bg-slate-50/50">
                        <div className="p-2 space-y-1">
                            {archivedIncome.length > 0 ? archivedIncome.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-white border shadow-sm group">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate">{cat.name}</p>
                                        <p className="text-[10px] font-mono text-muted-foreground">REF: {cat.categoryNumber}</p>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => handleRestore(cat, 'income')} className="h-8 hover:bg-primary/10 hover:text-primary transition-colors">
                                        <Undo className="mr-2 h-3 w-3" /> Restore
                                    </Button>
                                </div>
                            )) : <p className="text-xs text-center py-12 text-muted-foreground italic">No archived income nodes.</p>}
                        </div>
                    </ScrollArea>
                </div>
                 <div className="flex flex-col min-h-0">
                    <h3 className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground mb-3 flex items-center gap-2">
                        <TrendingDown className="h-3 w-3" /> Expense Nodes
                    </h3>
                     <ScrollArea className="flex-1 border rounded-xl bg-slate-50/50">
                        <div className="p-2 space-y-1">
                            {archivedExpenses.length > 0 ? archivedExpenses.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-white border shadow-sm group">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate">{cat.name}</p>
                                        <p className="text-[10px] font-mono text-muted-foreground">REF: {cat.categoryNumber}</p>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => handleRestore(cat, 'expense')} className="h-8 hover:bg-primary/10 hover:text-primary transition-colors">
                                        <Undo className="mr-2 h-3 w-3" /> Restore
                                    </Button>
                                </div>
                            )) : <p className="text-xs text-center py-12 text-muted-foreground italic">No archived expense nodes.</p>}
                        </div>
                    </ScrollArea>
                </div>
            </div>
            <DialogFooter className="p-4 border-t shrink-0">
                <Button onClick={() => setIsArchiveDialogOpen(false)} className="w-full sm:w-auto">Close Registry</Button>
            </DialogFooter>
        </DialogContent>
       </Dialog>

      <AlertDialog open={!!bulkDeleteType} onOpenChange={() => setBulkDeleteType(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Bulk Delete Categories?</AlertDialogTitle>
                <AlertDialogDescription>
                    You are about to permanently delete {bulkDeleteType === 'income' ? selectedIncomeIds.length : selectedExpenseIds.length} custom categories. This is a radical action that cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete All Selected
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={infoDialogState.isOpen} onOpenChange={(open) => setInfoDialogState({ ...infoDialogState, isOpen: open })}>
          <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                  <div className="flex items-center gap-2 text-primary mb-1">
                      <Info className="h-5 w-5" />
                      <DialogTitle className="text-xl font-headline">{infoDialogState.category?.name}</DialogTitle>
                  </div>
                  <DialogDescription>BKS Audit Rationale & Category Explanation</DialogDescription>
              </DialogHeader>
              <div className="py-6">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest block mb-2">Internal Explanation</Label>
                  <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={8} className="text-sm leading-relaxed" placeholder="Describe the business purpose of this category..." />
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setInfoDialogState({ isOpen: false, category: null })}>Cancel</Button>
                  <Button onClick={handleSaveExplanation}>Save Rationale</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={mergeDialogState.isOpen} onOpenChange={(open) => setMergeDialogState({ ...mergeDialogState, isOpen: open })}>
        <DialogContent>
            <DialogHeader>
                <div className="flex items-center gap-2 text-primary mb-1">
                    <GitMerge className="h-5 w-5" />
                    <DialogTitle className="text-xl font-headline">Merge Operational Node</DialogTitle>
                </div>
                <DialogDescription>
                    Consolidate "{mergeDialogState.category?.name}" into a standard audit line.
                </DialogDescription>
            </DialogHeader>
             <div className="py-6 space-y-4">
                <Label htmlFor="merge-target" className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Master Target Category</Label>
                <Select value={mergeTarget} onValueChange={setMergeTarget}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Select target audit line..." /></SelectTrigger>
                    <SelectContent>
                        {getMergeOptions(mergeDialogState.type).map(cat => (
                            <SelectItem key={cat.line} value={cat.line}>({cat.line}) {cat.description}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl">
                    <p className="text-xs text-destructive font-semibold">
                        This action will reassign all historical transactions from the custom node to the master node and permanently delete the custom node.
                    </p>
                </div>
            </div>
            <DialogFooter className="bg-muted/10 -mx-6 -mb-6 p-6 rounded-b-lg">
                <Button variant="ghost" onClick={() => setMergeDialogState({ isOpen: false, category: null, type: null })} className="h-12 px-6">Cancel</Button>
                <Button onClick={handleConfirmMerge} disabled={!mergeTarget} variant="destructive" className="h-12 px-10 font-bold shadow-xl">Confirm Merge</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
