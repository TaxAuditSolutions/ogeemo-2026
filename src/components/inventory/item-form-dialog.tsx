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
import { LoaderCircle, Plus, ChevronsUpDown, Check, Save } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Label } from '../ui/label';

const itemSchema = z.object({
    name: z.string().min(1, 'Item name is required.'),
    description: z.string().optional(),
    sku: z.string().optional(),
    type: z.enum(['Product for Sale', 'Internal Supply', 'Raw Material']).default('Product for Sale'),
    cost: z.coerce.number().min(0, "Cost must be non-negative.").optional().nullable(),
    price: z.coerce.number().min(0, "Price must be non-negative.").optional().nullable(),
    supplierId: z.string().optional().nullable(),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ItemFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  itemToEdit: InventoryItem | null;
  onSave: () => void;
  items: InventoryItem[];
  suppliers: Supplier[];
}

export function ItemFormDialog({ isOpen, onOpenChange, itemToEdit, onSave, items, suppliers }: ItemFormDialogProps) {
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
            });
        } else {
            form.reset({
                name: '', description: '', sku: '', type: 'Product for Sale', cost: null, price: null, supplierId: null
            });
      }
    }
  }, [isOpen, itemToEdit, form]);

  const handleSave = async (values: ItemFormData) => {
    if (!user) return;
    
    try {
      if (itemToEdit) {
        // This is a simplified update. A more robust solution would separate stock updates.
        await updateInventoryItem(itemToEdit.id, values, { reason: 'Adjustment', notes: 'Item details updated.' });
        toast({ title: 'Item Updated', description: `"${values.name}" has been updated.` });
      } else {
        await addInventoryItem({
            ...values,
            stockQuantity: 0, // New items start with 0 quantity from this form
            userId: user.uid,
        });
        toast({ title: 'Item Added', description: `"${values.name}" has been added to your inventory.` });
      }
      onSave(); // Refresh the parent list
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{itemToEdit ? 'Edit Item' : 'Add New Item'}</DialogTitle>
           <DialogDescription>
            {itemToEdit ? `Update the details for "${itemToEdit.name}".` : "Create a new item to track in your inventory."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form id="item-form" onSubmit={form.handleSubmit(handleSave)} className="py-4 space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input placeholder="Enter item name..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="sku" render={({ field }) => ( <FormItem><FormLabel>SKU</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><Label>Description</Label><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><Label>Item Type</Label><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Product for Sale">For Resale</SelectItem><SelectItem value="Internal Supply">Internal Use</SelectItem><SelectItem value="Raw Material">Project Material</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
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
