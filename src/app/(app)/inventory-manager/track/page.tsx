
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, ArrowLeft, PlusCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getInventoryItems, type Item } from '@/services/inventory-service';
import { getSuppliers, type Supplier } from '@/services/supplier-service';
import { ItemFormDialog } from '@/components/inventory/item-form-dialog';

export default function TrackInventoryPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<Item | null>(null);

    const { user } = useAuth();
    const { toast } = useToast();
    
    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedItems, fetchedSuppliers] = await Promise.all([
                getInventoryItems(user.uid),
                getSuppliers(user.uid),
            ]);
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
    
    const handleOpenForm = (item: Item | null = null) => {
      setItemToEdit(item);
      setIsFormOpen(true);
    };
    
    const handleItemSave = () => {
        loadData();
        setIsFormOpen(false);
    };

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

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
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Manage Inventory</CardTitle>
                          <CardDescription>
                            Add new items or update stock for existing items.
                          </CardDescription>
                        </div>
                        <Button onClick={() => handleOpenForm()}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add/Update Item Stock
                        </Button>
                    </CardHeader>
                </Card>
            </div>
            
            <ItemFormDialog 
                isOpen={isFormOpen} 
                onOpenChange={setIsFormOpen} 
                itemToEdit={itemToEdit} 
                onSave={handleItemSave}
                items={items}
                suppliers={suppliers}
            />
        </>
    );
}

