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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoaderCircle, MoreVertical, Eye, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '../ui/button';
import { EditableSkuCell } from './EditableSkuCell';
import { type Item as InventoryItem } from '@/services/inventory-service';


interface InventoryListProps {
    items: InventoryItem[];
    isLoading: boolean;
    onItemDelete: (itemId: string) => void;
    onEditItem: (item: InventoryItem) => void; 
}

export function InventoryList({ items, isLoading, onItemDelete, onEditItem }: InventoryListProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]); // Simplified for this view

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
                                  <EditableSkuCell item={item} onEdit={() => onEditItem(item)} />
                              </TableCell>
                              <TableCell className="text-right font-mono py-2">{item.stockQuantity}</TableCell>
                              <TableCell className="text-right font-mono py-2">{formatCurrency(item.cost)}</TableCell>
                              <TableCell className="text-right font-mono font-semibold py-2">{formatCurrency(item.stockQuantity * (item.cost || 0))}</TableCell>
                              <TableCell className="text-right py-2">
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8">
                                              <MoreVertical className="h-4 w-4" />
                                              <span className="sr-only">Open menu</span>
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuItem onSelect={() => onEditItem(item)}>
                                              <Eye className="mr-2 h-4 w-4" /> Open / View
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onSelect={() => onEditItem(item)}>
                                              <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem 
                                              onSelect={() => onItemDelete(item.id)}
                                              className="text-destructive focus:text-destructive"
                                          >
                                              <Trash2 className="mr-2 h-4 w-4" /> Delete Item
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
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
    </>
  );
}
