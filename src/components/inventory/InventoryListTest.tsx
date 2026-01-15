
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
import { LoaderCircle, Edit } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getInventoryItems, type Item as InventoryItem } from '@/services/inventory-service';
import { getSuppliers, type Supplier } from '@/services/supplier-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { formatCurrency } from '@/lib/utils';
import { ItemFormDialog } from './item-form-dialog';
import { Button } from '../ui/button';


export function InventoryListTest() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedItems, fetchedSuppliers, fetchedContacts] = await Promise.all([
          getInventoryItems(user.uid),
          getSuppliers(user.uid),
          getContacts(user.uid),
      ]);
      setItems(fetchedItems);
      setSuppliers(fetchedSuppliers);
      setContacts(fetchedContacts);
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
    loadData();
  }, [loadData]);
  
  const handleEditClick = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsFormOpen(true);
  };
  
  const handleSave = () => {
    setIsFormOpen(false);
    setItemToEdit(null);
    loadData();
  };

  const supplierMap = useMemo(() => {
    return new Map(suppliers.map(s => [s.id, s.name]));
  }, [suppliers]);

  const totalInventoryValue = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.stockQuantity * (item.cost || 0)), 0);
  }, [items]);

  return (
    <>
      <div className="border rounded-md">
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="w-12 text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {isLoading ? (
                      <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">
                              <LoaderCircle className="mx-auto h-6 w-6 animate-spin" />
                          </TableCell>
                      </TableRow>
                  ) : items.length === 0 ? (
                      <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">
                              No items in inventory.
                          </TableCell>
                      </TableRow>
                  ) : (
                      items.map(item => (
                          <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell>{item.type}</TableCell>
                              <TableCell>{supplierMap.get(item.supplierId || '') || 'N/A'}</TableCell>
                              <TableCell>{item.sku || 'N/A'}</TableCell>
                              <TableCell className="text-right font-mono">{item.stockQuantity}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(item.cost)}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.stockQuantity * (item.cost || 0))}</TableCell>
                              <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                                      <Edit className="h-4 w-4"/>
                                  </Button>
                              </TableCell>
                          </TableRow>
                      ))
                  )}
              </TableBody>
               <TableFooter>
                  <TableRow>
                      <TableCell colSpan={6} className="text-right font-bold text-lg">Total Inventory Value</TableCell>
                      <TableCell className="text-right font-bold font-mono text-lg">{formatCurrency(totalInventoryValue)}</TableCell>
                      <TableCell />
                  </TableRow>
              </TableFooter>
          </Table>
      </div>
       <ItemFormDialog 
            isOpen={isFormOpen} 
            onOpenChange={setIsFormOpen} 
            itemToEdit={itemToEdit} 
            onSave={handleSave}
            contacts={contacts}
        />
    </>
  );
}
