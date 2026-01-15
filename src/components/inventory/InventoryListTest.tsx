
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getInventoryItems, type Item as InventoryItem } from '@/services/inventory-service';
import { formatCurrency } from '@/lib/utils';

export function InventoryListTest() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadItems = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedItems = await getInventoryItems(user.uid);
      setItems(fetchedItems);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load inventory',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const totalInventoryValue = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.stockQuantity * (item.cost || 0)), 0);
  }, [items]);

  return (
    <div className="border rounded-md">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            <LoaderCircle className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                    </TableRow>
                ) : items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No items in inventory.
                        </TableCell>
                    </TableRow>
                ) : (
                    items.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.sku || 'N/A'}</TableCell>
                            <TableCell className="text-right font-mono">{item.stockQuantity}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(item.cost)}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.stockQuantity * (item.cost || 0))}</TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
             <TableFooter>
                <TableRow>
                    <TableCell colSpan={4} className="text-right font-bold text-lg">Total Inventory Value</TableCell>
                    <TableCell className="text-right font-bold font-mono text-lg">{formatCurrency(totalInventoryValue)}</TableCell>
                </TableRow>
            </TableFooter>
        </Table>
    </div>
  );
}
