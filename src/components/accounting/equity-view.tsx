
"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreVertical, Pencil, Trash2, LoaderCircle, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { AccountingPageHeader } from "@/components/accounting/page-header";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { getEquityTransactions, addEquityTransaction, updateEquityTransaction, deleteEquityTransaction, type EquityTransaction } from "@/services/accounting-service";
import { format } from "date-fns";

const emptyTransactionForm = { date: '', description: '', amount: '' };

export function EquityView() {
  const [transactions, setTransactions] = useState<EquityTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<EquityTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<EquityTransaction | null>(null);
  const [dialogType, setDialogType] = useState<'contribution' | 'draw'>('contribution');
  const [formData, setFormData] = useState(emptyTransactionForm);

  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    const loadData = async () => {
        setIsLoading(true);
        try {
            const fetchedTransactions = await getEquityTransactions(user.uid);
            setTransactions(fetchedTransactions);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Failed to load equity data", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, [user, toast]);

  const { contributions, draws, totalContributions, totalDraws, netEquity } = useMemo(() => {
    const contributions = transactions.filter(t => t.type === 'contribution').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const draws = transactions.filter(t => t.type === 'draw').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalContributions = contributions.reduce((sum, t) => sum + t.amount, 0);
    const totalDraws = draws.reduce((sum, t) => sum + t.amount, 0);
    const netEquity = totalContributions - totalDraws;
    return { contributions, draws, totalContributions, totalDraws, netEquity };
  }, [transactions]);
  
  const handleOpenDialog = (type: 'contribution' | 'draw', transaction?: EquityTransaction) => {
    setDialogType(type);
    if (transaction) {
        setTransactionToEdit(transaction);
        setFormData({ date: transaction.date, description: transaction.description, amount: String(transaction.amount) });
    } else {
        setTransactionToEdit(null);
        setFormData(emptyTransactionForm);
    }
    setIsDialogOpen(true);
  };
  
  const handleSave = async () => {
    if (!user) return;
    const amountNum = parseFloat(formData.amount);
    if (!formData.date || isNaN(amountNum) || amountNum <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please provide a valid date and a positive amount.' });
        return;
    }
    
    const dataToSave = {
        date: formData.date,
        description: formData.description,
        amount: amountNum,
        type: dialogType,
    };
    
    try {
        if (transactionToEdit) {
            await updateEquityTransaction(transactionToEdit.id, dataToSave);
            setTransactions(prev => prev.map(t => t.id === transactionToEdit.id ? { ...t, ...dataToSave } : t));
            toast({ title: 'Transaction Updated' });
        } else {
            const newTransaction = await addEquityTransaction({ ...dataToSave, userId: user.uid });
            setTransactions(prev => [...prev, newTransaction]);
            toast({ title: 'Transaction Added' });
        }
        setIsDialogOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
        await deleteEquityTransaction(transactionToDelete.id);
        setTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
        toast({ title: 'Transaction Deleted', variant: 'destructive' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
        setTransactionToDelete(null);
    }
  };

  const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const renderTable = (data: EquityTransaction[], type: 'contribution' | 'draw') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length > 0 ? data.map(tx => (
          <TableRow key={tx.id}>
            <TableCell>{tx.date}</TableCell>
            <TableCell>{tx.description}</TableCell>
            <TableCell className="text-right font-mono">{formatCurrency(tx.amount)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handleOpenDialog(type, tx)}><Pencil className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onSelect={() => setTransactionToDelete(tx)}><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No {type === 'contribution' ? 'contributions' : 'draws'} recorded yet.</TableCell></TableRow>}
      </TableBody>
      <TableFooter>
        <TableRow>
            <TableCell colSpan={2} className="font-bold">Total</TableCell>
            <TableCell className="text-right font-bold font-mono">{formatCurrency(type === 'contribution' ? totalContributions : totalDraws)}</TableCell>
            <TableCell/>
        </TableRow>
      </TableFooter>
    </Table>
  );

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="Equity Account" />
        <header className="text-center">
            <h1 className="text-3xl font-bold font-headline text-primary">Equity Account</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">Manage owner's contributions, draws, and retained earnings.</p>
        </header>

        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Equity Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <Card className="p-4">
                    <CardTitle className="text-lg flex items-center justify-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" /> Total Contributions</CardTitle>
                    <p className="text-2xl font-bold text-green-500 mt-2">{formatCurrency(totalContributions)}</p>
                </Card>
                <Card className="p-4">
                    <CardTitle className="text-lg flex items-center justify-center gap-2"><TrendingDown className="h-5 w-5 text-red-500" /> Total Draws</CardTitle>
                    <p className="text-2xl font-bold text-red-500 mt-2">{formatCurrency(totalDraws)}</p>
                </Card>
                 <Card className="p-4 bg-primary/10">
                    <CardTitle className="text-lg flex items-center justify-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Net Owner's Equity</CardTitle>
                    <p className="text-2xl font-bold text-primary mt-2">{formatCurrency(netEquity)}</p>
                </Card>
            </CardContent>
        </Card>

        {isLoading ? <div className="flex h-48 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin"/></div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Owner Contributions</CardTitle>
                        <CardDescription>Money you've put into the business.</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => handleOpenDialog('contribution')}><PlusCircle className="mr-2 h-4 w-4"/> Add Contribution</Button>
                </CardHeader>
                <CardContent>{renderTable(contributions, 'contribution')}</CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Owner Draws</CardTitle>
                        <CardDescription>Money you've taken out for personal use.</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => handleOpenDialog('draw')}><PlusCircle className="mr-2 h-4 w-4"/> Add Draw</Button>
                </CardHeader>
                <CardContent>{renderTable(draws, 'draw')}</CardContent>
            </Card>
        </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{transactionToEdit ? 'Edit' : 'Add'} {dialogType === 'contribution' ? 'Contribution' : 'Draw'}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={formData.date} onChange={e => setFormData(p => ({...p, date: e.target.value}))}/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))}/>
            </div>
            <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                    <Input id="amount" type="number" placeholder="0.00" value={formData.amount} onChange={e => setFormData(p => ({...p, amount: e.target.value}))} className="pl-7"/>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this transaction.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
