
'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { InventoryListTest } from '@/components/inventory/InventoryListTest';
import { UpdateStockCard } from '@/components/inventory/update-stock-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Info, ShoppingCart, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { addInventoryItem, type Item as InventoryItem, deleteInventoryItem } from '@/services/inventory-service';
import { ItemFormDialog } from '@/components/inventory/item-form-dialog';
import { getContacts, type Contact } from '@/services/contact-service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function InventoryTrackPage() {
    const [newItemName, setNewItemName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isInfoOpen, setIsInfoOpen] = useState(false);

    const [listVersion, setListVersion] = useState(0);
    const refreshList = () => setListVersion(v => v + 1);

    const handleAddNewItem = async () => {
        if (!newItemName.trim() || !user) {
            toast({ variant: 'destructive', title: 'Item name is required.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await addInventoryItem({
                name: newItemName,
                type: 'Product for Sale',
                stockQuantity: 0,
                userId: user.uid,
            });
            toast({ title: 'Item Added', description: `"${newItemName}" added with 0 stock.` });
            setNewItemName('');
            refreshList();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to add item', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleOpenForm = (item: InventoryItem | null = null) => {
        setItemToEdit(item);
        setIsFormOpen(true);
    };

    const handleItemSave = () => {
        setIsFormOpen(false);
        setItemToEdit(null);
        refreshList();
    };

    const handleDeleteItem = async (itemId: string) => {
        try {
            await deleteInventoryItem(itemId);
            toast({ title: 'Item Deleted', variant: 'destructive' });
            refreshList();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
        }
    };

  return (
    <>
      <div className="p-4 sm:p-6 h-full flex flex-col items-center">
        <header className="w-full text-center mb-6 relative">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold font-headline text-primary">
              Inventory Central
            </h1>
            <Button variant="ghost" size="icon" onClick={() => setIsInfoOpen(true)}>
                <Info className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">About Inventory Central</span>
            </Button>
          </div>
          <p className="text-muted-foreground">
            Manage your items and view their complete transaction history.
          </p>
          <div className="absolute top-0 right-0 flex items-center gap-2">
            <Button asChild>
                <Link href="/inventory-manager/pos">
                    <ShoppingCart className="mr-2 h-4 w-4" /> Point of Sale
                </Link>
            </Button>
             <Button asChild variant="ghost" size="icon">
                <Link href="/action-manager" aria-label="Close">
                    <X className="h-5 w-5" />
                </Link>
            </Button>
          </div>
        </header>
        <div className="w-full max-w-6xl space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <UpdateStockCard
                    key={listVersion} // Force re-render when list changes
                    onItemSelected={(item) => handleOpenForm(item)}
                />
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Item</CardTitle>
                        <CardDescription>Quickly add a new item name to your inventory list.</CardDescription>
                    </CardHeader>
                        <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="new-item-name">New Item Name</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="new-item-name"
                                    placeholder="Enter item name..."
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddNewItem(); }}
                                    disabled={isSubmitting}
                                />
                                <Button onClick={handleAddNewItem} disabled={isSubmitting}>
                                    {isSubmitting ? 'Adding...' : 'Add'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <InventoryListTest key={listVersion} />
            </div>
        </div>
      </div>
      <ItemFormDialog 
          isOpen={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          itemToEdit={itemToEdit} 
          onSave={handleItemSave}
          onDelete={handleDeleteItem}
          contacts={contacts}
      />
       <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>About Inventory Central</DialogTitle>
            </DialogHeader>
            <div className="py-4 max-h-[60vh] overflow-y-auto pr-2">
                <Accordion type="single" collapsible defaultValue="item-1">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>Adding & Updating Items</AccordionTrigger>
                        <AccordionContent>
                           <ul className="list-disc space-y-2 pl-5">
                             <li>Use the "Add New Item" card for a quick entry with just a name.</li>
                             <li>Use the "Update Existing Item Stock" card to search for an item and open the full edit form.</li>
                             <li>From the edit form, you can change all details including SKU, quantity, supplier, cost, and price.</li>
                           </ul>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger>Logging Transactions</AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc space-y-2 pl-5">
                            <li>Every change to an item's quantity is automatically logged as a transaction.</li>
                            <li>When updating stock from the form, it creates an "Adjustment" log entry.</li>
                            <li>Using the Point of Sale creates a "Sale" log entry and decrements stock.</li>
                          </ul>
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-3">
                        <AccordionTrigger>Point of Sale (POS)</AccordionTrigger>
                        <AccordionContent>
                          <p>The Point of Sale screen allows you to quickly process a sale of multiple items, automatically updating your inventory levels and creating a "Sale" transaction log for each item sold.</p>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
            <DialogFooter>
                <Button onClick={() => setIsInfoOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
