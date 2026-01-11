
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
import { LoaderCircle, ChevronsUpDown, Check, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Label } from '@/components/ui/label';

const itemSchema = z.object({
    name: z.string().min(2, { message: "Item name is required." }),
    description: z.string().optional(),
    sku: z.string().optional(),
    type: z.enum(['Product', 'Supply', 'Material']).default('Product'),
    stockQuantity: z.coerce.number().int().default(0),
    cost: z.coerce.number().min(0, "Cost must be non-negative.").optional(),
    price: z.coerce.number().min(0, "Price must be non-negative.").optional(),
    supplierId: z.string().optional().nullable(),
    acquisitionDate: z.date().optional(),
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]); // Will be populated in a later step
  const [isSupplierPopoverOpen, setIsSupplierPopoverOpen] = useState(false);
  const [isAcquisitionDateOpen, setIsAcquisitionDateOpen] = useState(false);

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      type: 'Product',
      stockQuantity: 0,
      cost: undefined,
      price: undefined,
      supplierId: null,
      acquisitionDate: new Date(),
    },
  });

  useEffect(() => {
    // Logic to fetch suppliers and set form data will be added in a future step.
    // For now, this just resets the form when the dialog opens.
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  async function onSubmit(values: ItemFormData) {
    // The save logic will be implemented in a future step.
    toast({ title: "Save action is not yet implemented."});
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add & Edit Item</DialogTitle>
          <DialogDescription>
            This form will serve as the source of truth for your inventory items.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Supplier</FormLabel>
                      <Popover open={isSupplierPopoverOpen} onOpenChange={setIsSupplierPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                              {field.value ? suppliers.find(s => s.id === field.value)?.name : "Select supplier"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          {/* Supplier Command list will be populated later */}
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Item Name</FormLabel> <FormControl><Input {...field} placeholder="e.g., Heavy Duty Screwdriver" /></FormControl> <FormMessage /> </FormItem> )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} placeholder="Details about the item..." /></FormControl> <FormMessage /> </FormItem> )} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="sku" render={({ field }) => ( <FormItem> <FormLabel>SKU</FormLabel> <FormControl><Input {...field} placeholder="SKU-12345" /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Item Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Product">For Resale</SelectItem><SelectItem value="Supply">Internal Use</SelectItem><SelectItem value="Material">Project Material</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="stockQuantity" render={({ field }) => ( <FormItem> <FormLabel>Initial Quantity</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="cost" render={({ field }) => ( <FormItem> <FormLabel>Unit Cost</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Sale Price</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="acquisitionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Acquisition Date</FormLabel>
                      <Popover open={isAcquisitionDateOpen} onOpenChange={setIsAcquisitionDateOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => { field.onChange(date); setIsAcquisitionDateOpen(false); }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="space-y-2">
                    <Label>Disposition</Label>
                    <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted h-10 flex items-center">
                        Handled via the Inventory Log.
                    </p>
                 </div>
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
