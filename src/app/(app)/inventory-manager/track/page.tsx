'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, LoaderCircle, MoreVertical, Pencil, Trash2, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getInventoryItems, deleteInventoryItem, type Item as InventoryItem, getInventoryLogs, type InventoryLog } from '@/services/inventory-service';
import { getSuppliers, type Supplier } from '@/services/supplier-service';
import { formatCurrency } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ItemFormDialog } from '@/components/inventory/item-form-dialog';
import { ItemHistoryDialog } from '@/components/inventory/item-history-dialog';
import { format } from 'date-fns';
import { UpdateStockCard } from '@/components/inventory/update-stock-card';


export default function TrackInventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
    const [itemToViewHistory, setItemToViewHistory] = useState<InventoryItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedItems, fetchedSuppliers, fetchedLogs] = await Promise.all([
                getInventoryItems(user.uid),
                getSuppliers(user.uid),
                getInventoryLogs(user.uid),
            ]);
            setItems(fetchedItems);
            setSuppliers(fetchedSuppliers);
            setLogs(fetchedLogs);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);
    
    const totalInventoryValue = useMemo(() => {
        return items.reduce((acc, item) => acc + (item.stockQuantity * (item.cost || 0)), 0);
    }, [items]);

    const handleOpenForm = (item: InventoryItem | null = null) => {
        setItemToEdit(item);
        setIsFormOpen(true);
    };

    const handleItemSave = () => {
        loadData();
        setIsFormOpen(false);
    };
    
    const handleOpenHistory = (item: InventoryItem) => {
        setItemToViewHistory(item);
        setIsHistoryOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await deleteInventoryItem(itemToDelete.id);
            toast({ title: 'Item Deleted' });
            loadData(); // Refresh the list
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
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                              <CardTitle>Inventory List</CardTitle>
                              <CardDescription>
                                A list of all products, supplies, and materials your business uses.
                              </CardDescription>
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
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Action Date</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Unit Cost</TableHead>
                                        <TableHead className="text-right">Total Cost</TableHead>
                                        <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.length > 0 ? items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>{item.sku || 'N/A'}</TableCell>
                                            <TableCell>{item.type}</TableCell>
                                            <TableCell>{supplierMap.get(item.supplierId || '') || 'N/A'}</TableCell>
                                            <TableCell>{item.acquisitionDate ? format(new Date(item.acquisitionDate), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                            <TableCell className="text-right font-mono">{item.stockQuantity}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(item.cost)}</TableCell>
                                            <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.stockQuantity * (item.cost || 0))}</TableCell>
                                            <TableCell>
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => handleOpenHistory(item)}><History className="mr-2 h-4 w-4" /> View History</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleOpenForm(item)}><Pencil className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => setItemToDelete(item)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Item</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-24 text-center">No items in inventory. Add one to get started.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                 <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-right font-bold text-lg">Total Inventory Value</TableCell>
                                        <TableCell className="text-right font-bold font-mono text-lg">{formatCurrency(totalInventoryValue)}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableFooter>
                              </Table>
                            )}
                          </CardContent>
                        </Card>
                    </div>
                     <div className="lg:col-span-1 space-y-4">
                        <UpdateStockCard
                          items={items}
                          onItemSelected={(item) => handleOpenForm(item)}
                        />
                        <Card>
                            <CardHeader>
                                <CardTitle>Add New Item</CardTitle>
                                <CardDescription>Create a new product, supply, or material to track.</CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button onClick={() => handleOpenForm(null)} className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add New Item
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
            
            <ItemFormDialog 
                isOpen={isFormOpen} 
                onOpenChange={setIsFormOpen} 
                itemToEdit={itemToEdit} 
                onSave={handleItemSave}
                suppliers={suppliers}
            />
            <ItemHistoryDialog 
                isOpen={isHistoryOpen} 
                onOpenChange={setIsHistoryOpen} 
                item={itemToViewHistory} 
                logs={logs.filter(l => l.itemId === itemToViewHistory?.id)}
            />
            <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{itemToDelete?.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
