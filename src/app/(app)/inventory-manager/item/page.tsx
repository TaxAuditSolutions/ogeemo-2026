
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { addInventoryItem, updateInventoryItem, getInventoryItemById, type Item as InventoryItem } from '@/services/inventory-service';
import { getSuppliers, type Supplier } from '@/services/supplier-service';
import { unitOfMeasure } from '@/data/unit-of-measure';
import { LoaderCircle, ArrowLeft, Save, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const itemFormSchema = z.object({
  name: z.string().min(1, 'Item Name is required.'),
  sku: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['Product for Sale', 'Internal Supply', 'Raw Material']).default('Product for Sale'),
  supplierId: z.string().optional().nullable(),
  cost: z.coerce.number().min(0, 'Unit Cost must be a positive number.').optional().nullable(),
  price: z.coerce.number().min(0, 'Unit Price must be a positive number.').optional().nullable(),
  initialQuantity: z.coerce.number().min(0, 'Quantity must be a positive number.').optional(),
  unitOfMeasure: z.string().optional(),
  acquisitionDate: z.date().optional(),
});

type ItemFormData = z.infer<typeof itemFormSchema>;

export default function ItemFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get('id');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      type: 'Product for Sale',
      initialQuantity: 0,
    },
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setIsLoading(true);
      try {
        const [supplierData, itemData] = await Promise.all([
          getSuppliers(user.uid),
          itemId ? getInventoryItemById(itemId) : Promise.resolve(null),
        ]);
        setSuppliers(supplierData);
        if (itemData) {
          form.reset({
            name: itemData.name,
            sku: itemData.sku || '',
            description: itemData.description || '',
            type: itemData.type as any, // Cast because the type in DB might not match exactly
            supplierId: itemData.supplierId || null,
            cost: itemData.cost || 0,
            price: itemData.price || 0,
            initialQuantity: itemData.stockQuantity,
            unitOfMeasure: (itemData as any).unitOfMeasure || '',
            acquisitionDate: itemData.acquisitionDate ? new Date(itemData.acquisitionDate) : undefined,
          });
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load necessary data.' });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user, itemId, form, toast]);

  async function onSubmit(data: ItemFormData) {
    if (!user) return;
    setIsSaving(true);
    try {
      if (itemId) {
        // Editing existing item
        await updateInventoryItem(itemId, {
          name: data.name,
          sku: data.sku,
          description: data.description,
          type: data.type,
          supplierId: data.supplierId === 'none' ? null : data.supplierId,
          cost: data.cost,
          price: data.price,
          stockQuantity: data.initialQuantity, // Assuming this form edits the stock too
          acquisitionDate: data.acquisitionDate,
        }, { reason: 'Adjustment', notes: 'Item details updated.' });
        toast({ title: 'Item Updated', description: `"${data.name}" has been saved.` });
      } else {
        // Creating new item
        await addInventoryItem({
          name: data.name,
          sku: data.sku,
          description: data.description,
          type: data.type,
          supplierId: data.supplierId === 'none' ? null : data.supplierId,
          cost: data.cost,
          price: data.price,
          stockQuantity: data.initialQuantity || 0,
          unitOfMeasure: data.unitOfMeasure,
          acquisitionDate: data.acquisitionDate,
          userId: user.uid,
        });
        toast({ title: 'Item Created', description: `"${data.name}" has been added to inventory.` });
      }
      router.push('/inventory-manager/track');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center h-full">
      <header className="w-full max-w-2xl text-center relative mb-6">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button asChild variant="outline">
                <Link href="/inventory-manager/track">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Inventory
                </Link>
            </Button>
        </div>
        <h1 className="text-3xl font-bold font-headline text-primary">
          {itemId ? 'Edit Item Details' : 'Add New Inventory Item'}
        </h1>
      </header>

      <Card className="w-full max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Item Information</CardTitle>
              <CardDescription>Enter all the relevant details for this inventory item.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Item Name</FormLabel><FormControl><Input placeholder="e.g., Heavy Duty Screwdriver" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="sku" render={({ field }) => ( <FormItem><FormLabel>SKU / Item ID</FormLabel><FormControl><Input placeholder="e.g., HD-SCR-001" {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Detailed description of the item..." {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an item type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Product for Sale">Product for Sale</SelectItem>
                        <SelectItem value="Internal Supply">Internal Supply</SelectItem>
                        <SelectItem value="Raw Material">Raw Material</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === 'none' ? null : value)} value={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a supplier..." />
                        </SelectTrigger>
                      </FormControl>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="cost" render={({ field }) => ( <FormItem><FormLabel>Unit Cost</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="price" render={({ field }) => ( <FormItem><FormLabel>Unit Price (for sale)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="initialQuantity" render={({ field }) => ( <FormItem><FormLabel>{itemId ? 'Quantity on Hand' : 'Initial Quantity'}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="unitOfMeasure" render={({ field }) => ( <FormItem><FormLabel>Unit of Measure</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="e.g., each, box, kg..." /></SelectTrigger></FormControl><SelectContent>{unitOfMeasure.map(u => (<SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
              </div>
              <FormField control={form.control} name="acquisitionDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Acquisition Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )} />
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                {itemId ? 'Save Changes' : 'Create Item'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
