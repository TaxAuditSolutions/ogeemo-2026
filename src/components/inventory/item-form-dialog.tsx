
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { addInventoryItem, updateInventoryItem, type Item as InventoryItem, type InventoryLogReason } from '@/services/inventory-service';
import { type Supplier } from '@/services/supplier-service';
import { LoaderCircle } from 'lucide-react';
import { Label } from '../ui/label';

const itemSchema = z.object({
    name: z.string().min(1, 'Item name is required.'),
    description: z.string().optional(),
    sku: z.string().optional(),
    type: z.enum(['Product for Sale', 'Internal Supply', 'Raw Material']).default('Product for Sale'),
    cost: z.coerce.number().min(0, "Cost must be non-negative.").optional().nullable(),
    price: z.coerce.number().min(0, "Price must be non-negative.").optional().nullable(),
    supplierId: z.string().optional().nullable(),
    stockQuantity: z.coerce.number().min(0, "Stock must be non-negative."),
    notes: z.string().optional(),
    reason: z.string().min(1, "Reason is required for stock updates."),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ItemFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  itemToEdit: InventoryItem | null;
  onSave: () => void;
  suppliers: Supplier[];
}

export function ItemFormDialog({ isOpen, onOpenChange, itemToEdit, onSave, suppliers }: ItemFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

  useEffect(() => {
    if (isOpen) {
        if (itemToEdit) {
            form.reset({
                name: itemToEdit.name,
                description: itemToEdit.description || '',
                sku: itemToEdit.sku || '',
                type: itemToEdit.type,
                cost: itemToEdit.cost,
                price: itemToEdit.price,
                supplierId: itemToEdit.supplierId,
                stockQuantity: itemToEdit.stockQuantity,
                notes: '',
                reason: 'Adjustment',
            });
        } else {
            form.reset({
                name: '', description: '', sku: '', type: 'Product for Sale', cost: null, price: null, supplierId: null, stockQuantity: 0, notes: '', reason: 'Initial Stock'
            });
      }
    }
  }, [isOpen, itemToEdit, form]);
  
  const currentStock = itemToEdit?.stockQuantity ?? 0;

  const handleSave = async (values: ItemFormData) => {
    if (!user) return;
    
    try {
      if (itemToEdit) {
        const dataToUpdate: Partial<Omit<Item, 'id' | 'userId'>> = {
            ...values,
            cost: values.cost ?? undefined,
            price: values.price ?? undefined,
            supplierId: values.supplierId ?? undefined,
        };
        await updateInventoryItem(itemToEdit.id, dataToUpdate, { reason: values.reason as InventoryLogReason, notes: values.notes });
        toast({ title: 'Item Updated', description: `"${values.name}" has been updated.` });
      } else {
        await addInventoryItem({
            ...values,
            userId: user.uid,
        });
        toast({ title: 'Item Added', description: `"${values.name}" has been added to your inventory.` });
      }
      onSave();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{itemToEdit ? 'Edit Item / Update Stock' : 'Add New Item'}</DialogTitle>
           <DialogDescription>
            {itemToEdit ? `Update details for "${itemToEdit.name}". Stock changes will be logged.` : "Create a new item to track in your inventory."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form id="item-form" onSubmit={form.handleSubmit(handleSave)} className="py-4 space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input placeholder="Enter item name..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="sku" render={({ field }) => ( <FormItem><FormLabel>SKU</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><Label>Description</Label><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><Label>Item Type</Label><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Product for Sale">Product for Sale</SelectItem><SelectItem value="Internal Supply">Internal Supply</SelectItem><SelectItem value="Raw Material">Raw Material</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                    <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Supplier</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a supplier..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">No Supplier</SelectItem>
                                        {suppliers.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="cost" render={({ field }) => ( <FormItem> <FormLabel>Unit Cost</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Sale Price</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                     <FormField control={form.control} name="stockQuantity" render={({ field }) => ( <FormItem> <FormLabel>New Stock Quantity</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                     <p className="text-sm text-muted-foreground">Current on-hand: {currentStock}</p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="reason" render={({ field }) => ( <FormItem> <FormLabel>Reason for Change</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Initial Stock">Initial Stock</SelectItem><SelectItem value="Purchase">Purchase</SelectItem><SelectItem value="Sale">Sale</SelectItem><SelectItem value="Adjustment">Adjustment</SelectItem><SelectItem value="Shrinkage">Shrinkage</SelectItem><SelectItem value="Consumed">Consumed</SelectItem><SelectItem value="Destroyed">Destroyed</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Notes</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                 </div>
            </form>
          </Form>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="item-form">{itemToEdit ? 'Save Changes' : 'Create Item'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
