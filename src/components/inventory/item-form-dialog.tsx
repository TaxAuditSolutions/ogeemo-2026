
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { getContacts, type Contact } from '@/services/contact-service';
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
    type: z.enum(['Product', 'Supply', 'Material']).default('Product'),
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
}

export function ItemFormDialog({ isOpen, onOpenChange, itemToEdit, onSave, items }: ItemFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [dialogMode, setDialogMode] = useState<'updateStock' | 'newItem'>('updateStock');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);
  
  const [quantityAdjustment, setQuantityAdjustment] = useState<number | ''>('');
  const [reason, setReason] = useState<InventoryLogReason>('Adjustment');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

  useEffect(() => {
    async function loadSuppliers() {
        if (!user || !isOpen) return;
        setIsLoading(true);
        try {
            const contactsData = await getContacts(user.uid);
            setSuppliers(contactsData.filter(c => c.folderId === 'suppliers' || c.businessName)); 
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load suppliers.' });
        } finally {
            setIsLoading(false);
        }
    }
    loadSuppliers();
  }, [isOpen, user, toast]);

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        setDialogMode('updateStock');
        setSelectedItem(itemToEdit);
        form.reset();
      } else {
        setDialogMode('updateStock');
        setSelectedItem(null);
        form.reset();
      }
      setQuantityAdjustment('');
      setAdjustmentNotes('');
      setReason('Adjustment');
    }
  }, [isOpen, itemToEdit, form]);

  const currentStock = selectedItem?.stockQuantity || 0;
  const newTotalQuantity = currentStock + (Number(quantityAdjustment) || 0);

  const handleUpdateStock = async () => {
    if (!user || !selectedItem) {
        toast({ variant: 'destructive', title: 'Error', description: 'No item selected for update.' });
        return;
    }
    const quantityChange = Number(quantityAdjustment);
    if (isNaN(quantityChange) || quantityChange === 0) {
        toast({ variant: 'destructive', title: 'Invalid Quantity', description: 'Please enter a non-zero quantity to add or remove.' });
        return;
    }
    
    try {
        await updateInventoryItem(selectedItem.id, {
            stockQuantity: newTotalQuantity
        }, {
            reason: reason,
            notes: adjustmentNotes
        });
        toast({ title: 'Stock Updated', description: `Stock for "${selectedItem.name}" is now ${newTotalQuantity}.` });
        onSave();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    }
  };
  
  const handleAddNewItem = async (values: ItemFormData) => {
    if (!user) return;
     const quantityChange = Number(quantityAdjustment) || 0;
    
    try {
      await addInventoryItem({
        ...values,
        stockQuantity: quantityChange,
        userId: user.uid
      } as Omit<InventoryItem, 'id'>);
      toast({ title: 'Item Added', description: `"${values.name}" created with an initial stock of ${quantityChange}.` });
      onSave();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogMode === 'newItem' ? 'Create New Item' : 'Add/Update Item Stock'}</DialogTitle>
        </DialogHeader>

        {dialogMode === 'updateStock' ? (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label>Select Item</Label>
                 <Popover open={isItemPopoverOpen} onOpenChange={setIsItemPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between border-black">
                            <span className="truncate">{selectedItem?.name || "Add or Select an item"}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Enter New item name and save" />
                            <CommandList>
                                <CommandEmpty>
                                    <Button variant="ghost" className="w-full" onClick={() => { setDialogMode('newItem'); setIsItemPopoverOpen(false); }}>
                                        <Plus className="mr-2 h-4 w-4"/> Create New Item
                                    </Button>
                                </CommandEmpty>
                                <CommandGroup>
                                    {items.map((item) => (
                                    <CommandItem key={item.id} value={item.name} onSelect={() => { setSelectedItem(item); setIsItemPopoverOpen(false); }}>
                                        <Check className={cn("mr-2 h-4 w-4", selectedItem?.id === item.id ? "opacity-100" : "opacity-0")} />
                                        {item.name}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {selectedItem && (
                <div className="space-y-4 pt-4 border-t animate-in fade-in-50">
                    <div className="grid grid-cols-3 gap-4 items-end">
                      <div className="space-y-2"> <Label>Current Quantity</Label> <Input value={currentStock} readOnly disabled className="bg-muted/50 font-mono text-center border-black" /></div>
                      <div className="space-y-2"> <Label htmlFor="quantity-adjustment">Add / Remove</Label> <Input id="quantity-adjustment" type="number" value={quantityAdjustment} onChange={e => setQuantityAdjustment(e.target.value === '' ? '' : Number(e.target.value))} className="font-mono text-center border-black" /></div>
                      <div className="space-y-2"> <Label>New Total</Label> <Input value={newTotalQuantity} readOnly disabled className="bg-muted/50 font-mono text-center font-bold border-black" /></div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Change</Label>
                        <Select value={reason} onValueChange={(v) => setReason(v as InventoryLogReason)}>
                            <SelectTrigger id="reason" className="border-black"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Purchase">Purchase</SelectItem>
                                <SelectItem value="Sale">Sale</SelectItem>
                                <SelectItem value="Adjustment">Adjustment</SelectItem>
                                <SelectItem value="Shrinkage">Shrinkage</SelectItem>
                                <SelectItem value="Consumed">Consumed</SelectItem>
                                <SelectItem value="Destroyed">Destroyed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="adjustment-notes">Notes (Optional)</Label>
                        <Textarea id="adjustment-notes" value={adjustmentNotes} onChange={e => setAdjustmentNotes(e.target.value)} placeholder="e.g., Invoice #123, cycle count adjustment, etc." className="border-black" rows={4} />
                    </div>
                </div>
            )}
          </div>
        ) : (
          <Form {...form}>
            <form id="new-item-form" onSubmit={form.handleSubmit(handleAddNewItem)} className="py-4 space-y-4">
                 <Button variant="link" onClick={() => setDialogMode('updateStock')} className="p-0 h-auto">{'<'} Back to update existing item</Button>
                  <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><Label>Item Name</Label><FormControl><Input placeholder="Enter item name here" {...field} className="border-black" /></FormControl><FormMessage /></FormItem> )} />
                  <div className="space-y-2">
                    <Label htmlFor="initial-stock">Initial Stock Quantity</Label>
                    <Input id="initial-stock" type="number" value={quantityAdjustment} onChange={e => setQuantityAdjustment(e.target.value === '' ? '' : Number(e.target.value))} className="border-black" />
                  </div>
                  <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><Label>Description</Label><FormControl><Textarea {...field} className="border-black" /></FormControl><FormMessage /></FormItem> )} />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><Label>Item Type</Label><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="border-black"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Product">For Resale</SelectItem><SelectItem value="Supply">Internal Use</SelectItem><SelectItem value="Material">Project Material</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                     <FormField control={form.control} name="sku" render={({ field }) => ( <FormItem><Label>SKU</Label><FormControl><Input {...field} className="border-black" /></FormControl><FormMessage /></FormItem> )} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="cost" render={({ field }) => ( <FormItem> <Label>Unit Cost</Label> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="border-black" /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <Label>Sale Price</Label> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} className="border-black" /></FormControl> <FormMessage /> </FormItem> )} />
                 </div>
            </form>
          </Form>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          {dialogMode === 'updateStock' ? (
              <Button onClick={handleUpdateStock} disabled={!selectedItem || quantityAdjustment === ''}>Save Stock Change</Button>
          ) : (
              <Button type="submit" form="new-item-form">Create New Item</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
