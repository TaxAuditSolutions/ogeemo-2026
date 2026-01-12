
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addInventoryItem } from '@/services/inventory-service';
import { LoaderCircle, PlusCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface AddInventoryItemCardProps {
  onItemAdded: () => void;
}

export function AddInventoryItemCard({ onItemAdded }: AddInventoryItemCardProps) {
  const [itemName, setItemName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAddItem = async () => {
    if (!itemName.trim() || !user) {
      toast({
        variant: 'destructive',
        title: 'Item name is required.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await addInventoryItem({
        name: itemName.trim(),
        type: 'Product', // Default type
        stockQuantity: 0, // Default initial quantity
        userId: user.uid,
        // Other fields can be edited later
      });
      toast({
        title: 'Item Added',
        description: `"${itemName.trim()}" has been added to your inventory.`,
      });
      setItemName('');
      onItemAdded(); // Callback to refresh the parent component's list
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Add Item',
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add Inventory Item</CardTitle>
        <CardDescription>Quickly add a new item to your inventory list.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="item-name" className="text-sm font-medium">Item Name</label>
          <Input
            id="item-name"
            placeholder="Enter new item name..."
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddItem();
            }}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleAddItem} disabled={!itemName.trim() || isSaving} className="w-full">
          {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
          Add Item
        </Button>
      </CardFooter>
    </Card>
  );
}
