
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
} from '@/components/ui/dialog';
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
import { addInventoryItem, updateInventoryItem, type Item as InventoryItem } from '@/services/inventory-service';
import { getSuppliers, type Supplier } from '@/services/supplier-service';
import { LoaderCircle, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';

const itemSchema = z.object({
    name: z.string().min(2, { message: "Item name is required." }),
    description: z.string().optional(),
    sku: z.string().optional(),
    type: z.enum(['Product', 'Supply', 'Material']).default('Product'),
    stockQuantity: z.coerce.number().int().default(0),
    cost: z.coerce.number().min(0, "Cost must be non-negative.").optional(),
    supplierId: z.string().optional().nullable(),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ItemFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  itemToEdit: InventoryItem | null;
  onSave: () => void;
}

export function ItemFormDialog({ isOpen, onOpenChange, itemToEdit, onSave }: ItemFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [isSupplierPopoverOpen, setIsSupplierPopoverOpen] = useState(false);

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
        name: '',
        description: '',
        sku: '',
        type: 'Product',
        stockQuantity: 0,
        cost: '' as any,
        supplierId: null,
    },
  });

  const loadSuppliers = useCallback(async () => {
    if (!user) return;
    setIsLoadingSuppliers(true);
    try {
        const fetchedSuppliers = await getSuppliers(user.uid);
        setSuppliers(fetchedSuppliers);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load suppliers.' });
    } finally {
        setIsLoadingSuppliers(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      if (itemToEdit) {
        form.reset({
          name: itemToEdit.name,
          description: itemToEdit.description || '',
          sku: itemToEdit.sku || '',
          type: itemToEdit.type || 'Product',
          stockQuantity: itemToEdit.stockQuantity,
          cost: itemToEdit.cost ?? '' as any,
          supplierId: itemToEdit.supplierId || null,
        });
      } else {
        form.reset({
            name: '',
            description: '',
            sku: '',
            type: 'Product',
            stockQuantity: 0,
            cost: '' as any,
            supplierId: null,
        });
      }
    }
  }, [isOpen, itemToEdit, form, loadSuppliers]);

  async function onSubmit(values: ItemFormData) {
    if (!user) {
        toast({ variant: 'destructive', title: 'You must be logged in.' });
        return;
    }
    try {
        const dataToSave = { ...values, userId: user.uid, supplierId: values.supplierId || null };
        if (itemToEdit) {
            await updateInventoryItem(itemToEdit.id, dataToSave, { type: 'Adjustment', notes: 'Manual edit' });
            toast({ title: 'Item Updated' });
        } else {
            await addInventoryItem(dataToSave);
            toast({ title: 'Item Created' });
        }
        onSave();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{itemToEdit ? 'Edit Item' : 'Add & Edit Item'}</DialogTitle>
          <DialogDescription>
            {itemToEdit ? 'Update the details for this inventory item.' : 'Add a new product, supply, or material to your inventory.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Supplier</FormLabel>
                  <Popover open={isSupplierPopoverOpen} onOpenChange={setIsSupplierPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? suppliers.find(
                                (supplier) => supplier.id === field.value
                              )?.name
                            : "Select supplier"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search suppliers..." />
                        <CommandList>
                          <CommandEmpty>No supplier found.</CommandEmpty>
                          <CommandGroup>
                            {suppliers.map((supplier) => (
                              <CommandItem
                                value={supplier.name}
                                key={supplier.id}
                                onSelect={() => {
                                  form.setValue("supplierId", supplier.id)
                                  setIsSupplierPopoverOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    supplier.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {supplier.name}
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
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Item Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl><Textarea {...field} rows={3}/></FormControl> <FormMessage /> </FormItem> )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="sku" render={({ field }) => ( <FormItem> <FormLabel>SKU (Optional)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Product">Product (for sale)</SelectItem><SelectItem value="Supply">Supply (internal use)</SelectItem><SelectItem value="Material">Material (for projects)</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="stockQuantity" render={({ field }) => ( <FormItem> <FormLabel>Quantity</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="cost" render={({ field }) => ( <FormItem> <FormLabel>Cost (per unit)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                {itemToEdit ? 'Save Changes' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
