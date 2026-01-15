
'use client';

import React, { useState, useCallback } from 'react';
import { InventoryListTest } from '@/components/inventory/InventoryListTest';
import { UpdateStockCard } from '@/components/inventory/update-stock-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { addInventoryItem, type Item as InventoryItem, deleteInventoryItem } from '@/services/inventory-service';
import { ItemFormDialog } from '@/components/inventory/item-form-dialog';
import { getContacts, type Contact } from '@/services/contact-service';

export default function InventoryTrackPage() {
    const [newItemName, setNewItemName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    
    // State for the edit dialog
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);

    // A callback to force the list to reload
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
        <header className="w-full text-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">
            Inventory Central
          </h1>
          <p className="text-muted-foreground">
            Manage your items and view their complete transaction history.
          </p>
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
    </>
  );
}
