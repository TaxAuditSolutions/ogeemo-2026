'use client';

import React, { useState, useMemo } from 'react';
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
import { getSuppliers, type Supplier } from '@/services/supplier-service';
import { formatCurrency } from '@/lib/utils';
import { ItemFormDialog } from './item-form-dialog';
import { Button } from '../ui/button';
import { EditableSkuCell } from './EditableSkuCell';
import { type Item as InventoryItem } from '@/services/inventory-service';


interface InventoryListTestProps {
    items: InventoryItem[];
    isLoading: boolean;
    onItemDelete: (itemId: string) => void;
    // Add onSave to refresh data after edit
    onItemSave: () => void; 
}

export function InventoryListTest({ items, isLoading, onItemDelete, onItemSave }: InventoryListTestProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { user } = useAuth();

  const handleEditClick = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsFormOpen(true);
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
                              <TableCell className="font-medium py-2">{item.name}</TableCell>
                              <TableCell className="py-2">{item.type}</TableCell>
                              <TableCell className="py-2">{supplierMap.get(item.supplierId || '') || 'N/A'}</TableCell>
                              <TableCell className="py-2">
                                  <EditableSkuCell item={item} onEdit={() => handleEditClick(item)} />
                              </TableCell>
                              <TableCell className="text-right font-mono py-2">{item.stockQuantity}</TableCell>
                              <TableCell className="text-right font-mono py-2">{formatCurrency(item.cost)}</TableCell>
                              <TableCell className="text-right font-mono font-semibold py-2">{formatCurrency(item.stockQuantity * (item.cost || 0))}</TableCell>
                              <TableCell className="text-right py-2">
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
                      <TableCell colSpan={7} className="text-right font-bold text-lg">Total Inventory Value</TableCell>
                      <TableCell className="text-right font-bold font-mono text-lg">{formatCurrency(totalInventoryValue)}</TableCell>
                  </TableRow>
              </TableFooter>
          </Table>
      </div>
       <ItemFormDialog 
            isOpen={isFormOpen} 
            onOpenChange={setIsFormOpen} 
            itemToEdit={itemToEdit} 
            onSave={onItemSave}
            onDelete={onItemDelete}
            contacts={[]} // contacts are now managed by the parent
        />
    </>
  );
}
