
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getInventoryItems, getInventoryLogs, type InventoryLog, type Item, addInventoryItem, updateInventoryItem, deleteInventoryItem } from '@/services/inventory-service';
import { getSuppliers, type Supplier } from '@/services/supplier-service';
import { ItemFormDialog } from '@/components/inventory/item-form-dialog';
import { ItemHistoryDialog } from '@/components/inventory/item-history-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '../ui/input';
import { Label } from '../ui/label';


const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number') return '$0.00';
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export function TrackInventoryView() {
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
    
    const [newItemName, setNewItemName] = useState('');

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
        if (!selectedItemId) return logs;
        return logs.filter(log => log.itemId === selectedItemId);
    }, [logs, selectedItemId]);
    
    const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);
    
    const totalInventoryCost = useMemo(() => items.reduce((acc, item) => acc + (item.stockQuantity * (item.cost || 0)), 0), [items]);

    const handleOpenForm = (item: Item | null = null) => {
      setItemToEdit(item);
      setIsFormOpen(true);
    };
    
    const handleItemSave = async () => {
        await loadData();
    };
    
    const handleOpenHistory = (item: Item) => {
        setSelectedItemId(item.id);
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
    
    const handleAddNewItem = async () => {
        if (!user || !newItemName.trim()) {
            return;
        }
        try {
            await addInventoryItem({
                name: newItemName,
                description: '',
                sku: '',
                type: 'Product',
                stockQuantity: 1, // Default to 1
                userId: user.uid,
                acquisitionDate: new Date(),
            } as Omit<Item, 'id'>);
            toast({ title: "Item Added", description: `"${newItemName}" has been added to inventory.` });
            await loadData(); // Refresh data in the parent
            setNewItemName(''); // Clear the input field
        } catch (error: any) {
            toast({ variant: "destructive", title: 'Save Failed', description: error.message });
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
                    <div>
                         <Card>
                          <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                              <CardTitle>Inventory Items</CardTitle>
                              <CardDescription>
                                A list of all products, supplies, and materials your business uses.
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button>Test</Button>
                              <Button onClick={() => handleOpenForm()}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add/Update Item Stock
                              </Button>
                            </div>
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
                                    <TableHead className="text-right">Total Cost</TableHead>
                                    <TableHead className="w-20"><span className="sr-only">Actions</span></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.map(item => (
                                    <TableRow key={item.id} onClick={() => handleOpenHistory(item)} className={cn("cursor-pointer", selectedItemId === item.id && "bg-muted")}>
                                      <TableCell className="font-medium">{item.name}</TableCell>
                                      <TableCell>{supplierMap.get(item.supplierId || '') || 'N/A'}</TableCell>
                                      <TableCell className="text-right font-mono">{item.stockQuantity}</TableCell>
                                      <TableCell className="text-right font-mono">{formatCurrency(item.cost)}</TableCell>
                                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.stockQuantity * (item.cost || 0))}</TableCell>
                                      <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={(e) => {e.stopPropagation(); handleOpenForm(item);}}><Pencil className="mr-2 h-4 w-4" /> Edit Item</DropdownMenuItem>
                                                <DropdownMenuItem onSelect={(e) => {e.stopPropagation(); setItemToDelete(item);}} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                                <TableFooter>
                                  <TableRow><TableCell colSpan={4} className="text-right font-bold text-lg">Total Inventory Value</TableCell><TableCell className="text-right font-bold font-mono text-lg">{formatCurrency(totalInventoryCost)}</TableCell><TableCell /></TableRow>
                                </TableFooter>
                              </Table>
                            )}
                          </CardContent>
                        </Card>
                    </div>
                </div>


                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Transaction Log</CardTitle>
                            {selectedItemId && <Button variant="ghost" onClick={() => setSelectedItemId(null)}><FilterX className="mr-2 h-4 w-4"/>Clear Filter</Button>}
                        </div>
                        <CardDescription>
                            {selectedItemId ? `Showing history for: ${items.find(i => i.id === selectedItemId)?.name}` : 'A complete audit trail of all inventory movements. Select an item above to filter.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-96">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Change</TableHead>
                                        <TableHead className="text-right">New Qty</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.length > 0 ? filteredLogs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell>{format(new Date(log.timestamp), 'PPpp')}</TableCell>
                                            <TableCell className="font-medium">{log.itemName}</TableCell>
                                            <TableCell><Badge variant="secondary">{log.changeType}</Badge></TableCell>
                                            <TableCell className={cn("text-right font-mono", log.quantityChange >= 0 ? 'text-green-600' : 'text-red-600')}>
                                                {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{log.newQuantity}</TableCell>
                                            <TableCell>{log.notes}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">No logs found for the selected filters.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
            
            <ItemFormDialog 
                isOpen={isFormOpen} 
                onOpenChange={setIsFormOpen} 
                itemToEdit={itemToEdit} 
                onSave={handleItemSave}
                items={items}
            />
            <ItemHistoryDialog isOpen={isHistoryOpen} onOpenChange={setIsHistoryOpen} item={itemToViewHistory} />
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{itemToDelete?.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
