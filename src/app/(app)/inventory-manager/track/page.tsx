
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoaderCircle, ArrowLeft, FilterX, ChevronsUpDown, Check, Calendar as CalendarIcon, Package, PlusCircle, MoreVertical, Pencil, Trash2, History } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getInventoryItems, getInventoryLogs, type InventoryLog, type Item, deleteInventoryItem } from '@/services/inventory-service';
import { getSuppliers, type Supplier } from '@/services/supplier-service';
import { ItemFormDialog } from '@/components/inventory/item-form-dialog';
import { ItemHistoryDialog } from '@/components/inventory/item-history-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';

const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return '$0.00';
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export default function TrackInventoryPage() {
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
    const [itemToViewHistory, setItemToViewHistory] = useState<Item | null>(null);
    const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

    const { user } = useAuth();
    const { toast } = useToast();
    
    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedLogs, fetchedItems, fetchedSuppliers] = await Promise.all([
                getInventoryLogs(user.uid),
                getInventoryItems(user.uid),
                getSuppliers(user.uid),
            ]);
            setLogs(fetchedLogs);
            setItems(fetchedItems);
            setSuppliers(fetchedSuppliers);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const filteredLogs = useMemo(() => {
        if (!selectedItemId) return [];
        return logs.filter(log => log.itemId === selectedItemId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [logs, selectedItemId]);
    
    const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);
    
    const totalInventoryValue = useMemo(() => items.reduce((acc, item) => acc + (item.stockQuantity * (item.cost || 0)), 0), [items]);

    const handleOpenForm = (item: Item | null = null) => {
      setItemToEdit(item);
      setIsFormOpen(true);
    };
    
    const handleItemSave = () => {
        loadData();
        setIsFormOpen(false);
    };
    
    const handleOpenHistory = (item: Item) => {
        setItemToViewHistory(item);
        setSelectedItemId(item.id);
        setIsHistoryOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteInventoryItem(itemToDelete.id);
            toast({ title: 'Item Deleted' });
            loadData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setItemToDelete(null);
        }
    };

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6">
                <header className="relative text-center">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2">
                        <Button asChild variant="outline">
                            <Link href="/inventory-manager">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Inventory Hub
                            </Link>
                        </Button>
                    </div>
                    <h1 className="text-3xl font-bold font-headline text-primary">Inventory Central</h1>
                    <p className="text-muted-foreground">Manage your items and view their complete transaction history.</p>
                </header>

                <div className="grid grid-cols-1 gap-6">
                    <div className="col-span-1">
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                              <CardTitle>Inventory Items</CardTitle>
                              <CardDescription>
                                A list of all products, supplies, and materials your business uses.
                              </CardDescription>
                            </div>
                            <Button onClick={() => handleOpenForm()}>
                              <PlusCircle className="mr-2 h-4 w-4" /> Add/Update Item Stock
                            </Button>
                          </CardHeader>
                          <CardContent>
                            {isLoading ? (
                              <div className="flex justify-center items-center h-48"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Unit Cost</TableHead>
                                    <TableHead className="text-right">Total Value</TableHead>
                                    <TableHead className="w-20"><span className="sr-only">Actions</span></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.map(item => (
                                    <TableRow key={item.id}>
                                      <TableCell className="font-medium">{item.name}</TableCell>
                                      <TableCell>{supplierMap.get(item.supplierId || '') || 'N/A'}</TableCell>
                                      <TableCell className="text-right font-mono">{item.stockQuantity}</TableCell>
                                      <TableCell className="text-right font-mono">{formatCurrency(item.cost)}</TableCell>
                                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.stockQuantity * (item.cost || 0))}</TableCell>
                                      <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => handleOpenHistory(item)}><History className="mr-2 h-4 w-4" /> View History</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleOpenForm(item)}><Pencil className="mr-2 h-4 w-4" /> Edit Item</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => setItemToDelete(item)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                                <TableFooter>
                                  <TableRow><TableCell colSpan={4} className="text-right font-bold text-lg">Total Inventory Value</TableCell><TableCell className="text-right font-bold font-mono text-lg">{formatCurrency(totalInventoryValue)}</TableCell><TableCell /></TableRow>
                                </TableFooter>
                              </Table>
                            )}
                          </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            
            <ItemFormDialog 
                isOpen={isFormOpen} 
                onOpenChange={setIsFormOpen} 
                itemToEdit={itemToEdit} 
                onSave={handleItemSave}
                items={items}
                suppliers={suppliers}
            />
            <ItemHistoryDialog isOpen={isHistoryOpen} onOpenChange={setIsHistoryOpen} item={itemToViewHistory} logs={filteredLogs} />
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{itemToDelete?.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
