
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
import { type Item as InventoryItem } from '@/services/inventory-service';

interface AddInventoryItemCardProps {
  onItemAdded: () => void;
  inventoryItems: InventoryItem[];
  onItemSelected: (item: InventoryItem | null) => void;
}

export function AddInventoryItemCard({ onItemAdded, inventoryItems, onItemSelected }: AddInventoryItemCardProps) {

  const handleAddNew = () => {
    onItemSelected(null);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add to Inventory</CardTitle>
        <CardDescription>Create a new product, supply, or material to track.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* The content area can be used for instructions or can be removed if not needed. */}
        <p className="text-sm text-muted-foreground">Click the button below to add a new item to your inventory list.</p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleAddNew} className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Item
        </Button>
      </CardFooter>
    </Card>
  );
}
