
'use client';

import { useEffect } from 'react';
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
import { LoaderCircle } from 'lucide-react';

const itemSchema = z.object({
    name: z.string().min(2, { message: "Item name is required." }),
    description: z.string().optional(),
    sku: z.string().optional(),
    type: z.enum(['Product', 'Supply', 'Material']).default('Product'),
    stockQuantity: z.coerce.number().int().default(0),
    cost: z.coerce.number().min(0, "Cost must be non-negative.").optional(),
    price: z.coerce.number().min(0, "Price must be non-negative.").optional(),
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

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
        name: '',
        description: '',
        sku: '',
        type: 'Product',
        stockQuantity: 0,
        cost: '' as any, // Initialize as empty string to prevent uncontrolled -> controlled error
        price: '' as any,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (itemToEdit) {
        form.reset({
          name: itemToEdit.name,
          description: itemToEdit.description || '',
          sku: itemToEdit.sku || '',
          type: itemToEdit.type || 'Product',
          stockQuantity: itemToEdit.stockQuantity,
          cost: itemToEdit.cost ?? '' as any,
          price: itemToEdit.price ?? '' as any,
        });
      } else {
        form.reset({
            name: '',
            description: '',
            sku: '',
            type: 'Product',
            stockQuantity: 0,
            cost: '' as any,
            price: '' as any,
        });
      }
    }
  }, [isOpen, itemToEdit, form]);

  async function onSubmit(values: ItemFormData) {
    if (!user) {
        toast({ variant: 'destructive', title: 'You must be logged in.' });
        return;
    }
    try {
        const dataToSave = { ...values, userId: user.uid };
        if (itemToEdit) {
            await updateInventoryItem(itemToEdit.id, dataToSave);
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
          <DialogTitle>{itemToEdit ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          <DialogDescription>
            {itemToEdit ? 'Update the details for this inventory item.' : 'Add a new product, supply, or material to your inventory.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Item Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl><Textarea {...field} rows={3}/></FormControl> <FormMessage /> </FormItem> )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="sku" render={({ field }) => ( <FormItem> <FormLabel>SKU (Optional)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Product">Product (for sale)</SelectItem><SelectItem value="Supply">Supply (internal use)</SelectItem><SelectItem value="Material">Material (for projects)</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="stockQuantity" render={({ field }) => ( <FormItem> <FormLabel>Quantity</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="cost" render={({ field }) => ( <FormItem> <FormLabel>Cost (per unit)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Price (per unit)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
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
