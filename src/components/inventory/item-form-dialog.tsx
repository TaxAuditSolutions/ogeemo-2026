
'use client';

import { useEffect, useState } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar as CalendarIcon, ChevronsUpDown, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CustomCalendar } from '../ui/custom-calendar';
import { Label } from '../ui/label';
import { type Contact } from '@/services/contact-service';
import { type Supplier, designateContactAsSupplier } from '@/services/supplier-service';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';


const itemSchema = z.object({
    name: z.string().optional(),
    sku: z.string().optional(),
    type: z.enum(['Product for Sale', 'Internal Supply', 'Raw Material']).default('Product for Sale'),
    supplierId: z.string().optional().nullable(),
    acquisitionDate: z.date().optional().nullable(),
    stockQuantity: z.coerce.number().min(0, "Stock must be non-negative.").optional(),
    cost: z.coerce.number().min(0, "Cost must be non-negative.").optional().nullable(),
    price: z.coerce.number().min(0, "Price must be non-negative.").optional().nullable(),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ItemFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  itemToEdit: InventoryItem | null;
  onSave: () => void;
  contacts: Contact[];
}

export function ItemFormDialog({ isOpen, onOpenChange, itemToEdit, onSave, contacts }: ItemFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSupplierPopoverOpen, setIsSupplierPopoverOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
        if (itemToEdit) {
            form.reset({
                name: itemToEdit.name,
                sku: itemToEdit.sku || '',
                type: itemToEdit.type,
                supplierId: itemToEdit.supplierId,
                acquisitionDate: itemToEdit.acquisitionDate ? new Date(itemToEdit.acquisitionDate) : null,
                stockQuantity: itemToEdit.stockQuantity,
                cost: itemToEdit.cost,
                price: itemToEdit.price,
            });
        } else {
            form.reset({
                name: '', sku: '', type: 'Product for Sale', supplierId: null, acquisitionDate: new Date(), stockQuantity: 0, cost: null, price: null
            });
      }
    }
  }, [isOpen, itemToEdit, form]);
  

  const handleSave = async (values: ItemFormData) => {
    if (!user) return;
    
    let finalSupplierId = values.supplierId;
    if (values.supplierId && !values.supplierId.startsWith('sup_')) {
      try {
        const newSupplier = await designateContactAsSupplier(user.uid, values.supplierId);
        finalSupplierId = newSupplier.id;
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Supplier Error', description: `Could not designate contact as supplier: ${error.message}` });
        return;
      }
    }
    
    try {
      const dataToSave = {
        name: values.name || 'Untitled Item',
        sku: values.sku || null,
        type: values.type,
        supplierId: finalSupplierId || null,
        acquisitionDate: values.acquisitionDate || null,
        stockQuantity: Number(values.stockQuantity) || 0,
        cost: values.cost ?? null,
        price: values.price ?? null,
      };

      if (itemToEdit) {
        await updateInventoryItem(itemToEdit.id, dataToSave, { reason: 'Adjustment', notes: 'Item details updated.' });
        toast({ title: 'Item Updated', description: `"${values.name}" has been updated.` });
      } else {
        await addInventoryItem({
            ...dataToSave,
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{itemToEdit ? 'Edit Item / Update Stock' : 'Add New Item'}</DialogTitle>
           <DialogDescription>
            {itemToEdit ? `Update details for "${itemToEdit.name}". Stock changes will be logged as an adjustment.` : "Create a new item to track in your inventory."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form id="item-form" onSubmit={form.handleSubmit(handleSave)} className="py-4 space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input placeholder="Enter item name..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="sku" render={({ field }) => ( <FormItem><FormLabel>SKU</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Item Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Product for Sale">Product for Sale</SelectItem><SelectItem value="Internal Supply">Internal Supply</SelectItem><SelectItem value="Raw Material">Raw Material</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                  </div>
                   <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                           <FormItem className="flex flex-col">
                                <FormLabel>Supplier</FormLabel>
                                <Popover open={isSupplierPopoverOpen} onOpenChange={setIsSupplierPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" role="combobox" className="w-full justify-between">
                                                <span className="truncate">{field.value ? contacts.find(c => c.id === field.value)?.name : "Select a supplier..."}</span>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search contacts..." />
                                            <CommandList>
                                                <CommandEmpty>No contact found.</CommandEmpty>
                                                <CommandGroup>
                                                     <CommandItem onSelect={() => { field.onChange(null); setIsSupplierPopoverOpen(false); }}>
                                                        <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                                                        -- No Supplier --
                                                    </CommandItem>
                                                    {contacts.map((contact) => (
                                                        <CommandItem key={contact.id} value={contact.name} onSelect={() => { field.onChange(contact.id); setIsSupplierPopoverOpen(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", field.value === contact.id ? "opacity-100" : "opacity-0")} />
                                                            {contact.name} {contact.businessName ? `(${contact.businessName})` : ''}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <FormField control={form.control} name="acquisitionDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Action Date</FormLabel>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CustomCalendar
                                        mode="single"
                                        selected={field.value || undefined}
                                        onSelect={(date) => { field.onChange(date); setIsDatePickerOpen(false); }}
                                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                             <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="stockQuantity" render={({ field }) => ( <FormItem> <FormLabel>Quantity</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="cost" render={({ field }) => ( <FormItem> <FormLabel>Unit Cost</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Selling Price</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                 </div>
            </form>
          </Form>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="item-form">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
