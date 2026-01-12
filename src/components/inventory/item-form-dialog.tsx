
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
import { getContacts, type Contact } from '@/services/contact-service';
import { LoaderCircle, Calendar as CalendarIcon, Plus, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CustomCalendar } from '../ui/custom-calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ContactSelector } from '../contacts/contact-selector';
import ContactFormDialog from '../contacts/contact-form-dialog';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/services/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { addContact } from '@/services/contact-service';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Label } from '../ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';


const itemSchema = z.object({
    name: z.string().min(1, 'Item name is required.'),
    description: z.string().optional(),
    sku: z.string().optional(),
    type: z.enum(['Product', 'Supply', 'Material']).default('Product'),
    cost: z.coerce.number().min(0, "Cost must be non-negative.").optional().nullable(),
    price: z.coerce.number().min(0, "Price must be non-negative.").optional().nullable(),
    supplierId: z.string().optional().nullable(),
    acquisitionDate: z.date().optional().nullable(),
    dispositionDate: z.date().optional().nullable(),
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
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);
  
  const [quantityAdjustment, setQuantityAdjustment] = useState<number | ''>(0);
  const [selectedExistingItem, setSelectedExistingItem] = useState<InventoryItem | null>(null);
  
  const [mode, setMode] = useState<'select' | 'add' | 'test'>('select');


  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  });

   const loadDropdownData = useCallback(async () => {
    if (!user) return;
    try {
        const [foldersData, companiesData, industriesData] = await Promise.all([
            getContactFolders(user.uid),
            getCompanies(user.uid),
            getIndustries(user.uid),
        ]);
        setContactFolders(foldersData);
        setCompanies(companiesData);
        setCustomIndustries(industriesData);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load support data for contacts.' });
    }
  }, [user, toast]);

  useEffect(() => {
    async function loadInitialData() {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const contactsData = await getContacts(user.uid);
            setSuppliers(contactsData);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load suppliers.' });
        } finally {
            setIsLoading(false);
        }
    }
    
    if(isOpen) {
        loadInitialData();
        loadDropdownData();
    }
  }, [isOpen, user, toast, loadDropdownData]);


  useEffect(() => {
    if (isOpen) {
        const item = itemToEdit || selectedExistingItem;
        if (item) {
            form.reset({
                name: item.name,
                description: item.description || '',
                sku: item.sku || '',
                type: item.type || 'Product',
                cost: item.cost ?? null,
                price: item.price ?? null,
                supplierId: item.supplierId,
                acquisitionDate: item.acquisitionDate ? new Date(item.acquisitionDate) : undefined,
                dispositionDate: item.dispositionDate ? new Date(item.dispositionDate) : undefined,
            });
            setQuantityAdjustment(0);
            setMode('select');
        } else {
            form.reset({
                name: '', description: '', sku: '',
                type: 'Product', cost: null, price: null, supplierId: null,
                acquisitionDate: new Date(), dispositionDate: undefined
            });
            setQuantityAdjustment('');
            setMode('add');
        }
    } else {
        // Reset state when dialog closes
        setSelectedExistingItem(null);
    }
  }, [isOpen, itemToEdit, selectedExistingItem, form]);
  
  const currentItemForDisplay = selectedExistingItem || itemToEdit;
  const currentStock = currentItemForDisplay?.stockQuantity || 0;
  const newTotalQuantity = currentStock + (Number(quantityAdjustment) || 0);

  async function onSubmit(values: ItemFormData) {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error' });
        return;
    }
    
    const quantityChange = Number(quantityAdjustment) || 0;
    const finalItemToProcess = mode === 'select' ? (selectedExistingItem || itemToEdit) : null;
    
    // Validate name for new items
    if (mode === 'add' && !values.name.trim()) {
        form.setError('name', { type: 'manual', message: 'Item name is required to add a new item.' });
        return;
    }

    try {
        if (finalItemToProcess) { // Updating an existing item
            await updateInventoryItem(finalItemToProcess.id, {
              ...values,
              stockQuantity: newTotalQuantity
            }, {
                type: 'Adjustment',
                notes: 'Manual adjustment via form'
            });
            toast({ title: 'Item Updated' });
        } else if (mode === 'add') { // Adding a new item
            await addInventoryItem({
              name: values.name,
              ...values,
              stockQuantity: quantityChange,
              userId: user.uid
            } as Omit<InventoryItem, 'id'>);
            toast({ title: 'Item Added' });
        }
        onSave();
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  }
  
  const handleSelectExisting = (item: InventoryItem) => {
    setSelectedExistingItem(item);
    setIsItemPopoverOpen(false);
  };
  
   const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
      setSuppliers(prev => {
          const existing = prev.find(c => c.id === savedContact.id);
          if (existing) {
              return prev.map(c => c.id === savedContact.id ? savedContact : c);
          }
          return [...prev, savedContact];
      });
      form.setValue('supplierId', savedContact.id);
      setIsContactFormOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-full max-w-none top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b text-center sm:text-center">
            <DialogTitle>{itemToEdit ? `Edit: ${itemToEdit.name}` : 'Add/Update Item Stock'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <Form {...form}>
                <form id="item-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
                  
                  {!itemToEdit && (
                    <div className="space-y-2">
                        <RadioGroup value={mode} onValueChange={(v) => {
                          setMode(v as 'select' | 'add' | 'test');
                          setSelectedExistingItem(null);
                          form.reset({
                              name: '', description: '', sku: '',
                              type: 'Product', cost: null, price: null, supplierId: null,
                              acquisitionDate: new Date(), dispositionDate: undefined
                          });
                          setQuantityAdjustment('');
                        }} className="flex gap-4">
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="select" id="mode-select" /></FormControl><Label htmlFor="mode-select">Select Existing Item</Label></FormItem>
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="add" id="mode-add" /></FormControl><Label htmlFor="mode-add">Add New Item</Label></FormItem>
                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="test" id="mode-test" /></FormControl><Label htmlFor="mode-test">Test</Label></FormItem>
                        </RadioGroup>
                    </div>
                  )}

                  {mode === 'select' && !itemToEdit && (
                     <div className="space-y-2">
                        <Label>Select Existing Item</Label>
                        <Popover open={isItemPopoverOpen} onOpenChange={setIsItemPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    <span className="truncate">{selectedExistingItem?.name || "Select an item to edit..."}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search items..." />
                                    <CommandList>
                                        <CommandEmpty>No item found.</CommandEmpty>
                                        <CommandGroup>
                                            {items.map((item) => (
                                            <CommandItem key={item.id} value={item.name} onSelect={() => handleSelectExisting(item)}>
                                                <Check className={cn("mr-2 h-4 w-4", selectedExistingItem?.id === item.id ? "opacity-100" : "opacity-0")} />
                                                {item.name}
                                            </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                  )}
                  
                  {mode === 'add' && !itemToEdit && (
                     <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><Label>New Item Name</Label><FormControl><Input {...field} placeholder="Enter name for a new item" /></FormControl><FormMessage /></FormItem> )} />
                  )}
                  
                  {mode === 'test' && (
                     <div className="p-4 border-2 border-dashed border-yellow-500 bg-yellow-50 rounded-lg text-center">
                        <p className="font-semibold">Test Mode Active</p>
                        <p className="text-sm text-muted-foreground">This is a placeholder for the "Test" functionality.</p>
                     </div>
                  )}
                  

                  <Separator />

                  <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><Label>Description</Label><FormControl><Textarea {...field} placeholder="Details about the item..." disabled={!currentItemForDisplay && mode === 'select'} /></FormControl><FormMessage /></FormItem> )} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><Label>Item Type</Label><Select onValueChange={field.onChange} value={field.value} disabled={!currentItemForDisplay && mode === 'select'}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Product">For Resale</SelectItem><SelectItem value="Supply">Internal Use</SelectItem><SelectItem value="Material">Project Material</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="sku" render={({ field }) => ( <FormItem><Label>SKU</Label><FormControl><Input {...field} disabled={!currentItemForDisplay && mode === 'select'} /></FormControl><FormMessage /></FormItem> )} />
                  </div>
                  
                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                        <Label>Opening Quantity</Label>
                        <Input value={currentStock} readOnly disabled className="bg-muted/50 font-mono text-center" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="quantity-adjustment">{currentItemForDisplay ? 'Add / Remove Quantity' : 'Initial Quantity'}</Label>
                        <Input id="quantity-adjustment" type="number" value={quantityAdjustment} onChange={e => setQuantityAdjustment(e.target.value === '' ? '' : Number(e.target.value))} className="font-mono text-center" />
                    </div>
                    <div className="space-y-2">
                        <Label>New Total Quantity</Label>
                        <Input value={newTotalQuantity} readOnly disabled className="bg-muted/50 font-mono text-center font-bold" />
                    </div>
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="acquisitionDate" render={({ field }) => (
                          <FormItem className="flex flex-col"><Label>Acquisition Date</Label>
                            <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={!currentItemForDisplay && mode === 'select'}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><CustomCalendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                            <FormMessage /></FormItem>)} />
                       <FormField control={form.control} name="dispositionDate" render={({ field }) => (
                          <FormItem className="flex flex-col"><Label>Disposition Date</Label>
                            <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={!currentItemForDisplay && mode === 'select'}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? (format(field.value, "PPP")) : (<span>Pick a date (optional)</span>)}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><CustomCalendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                            <FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="cost" render={({ field }) => ( <FormItem> <Label>Unit Cost</Label> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} disabled={!currentItemForDisplay && mode === 'select'} /></FormControl> <FormMessage /> </FormItem> )} />
                      <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <Label>Sale Price</Label> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} disabled={!currentItemForDisplay && mode === 'select'} /></FormControl> <FormMessage /> </FormItem> )} />
                  </div>
                   <FormField control={form.control} name="supplierId" render={({ field }) => ( <FormItem><Label>Supplier</Label><div className="flex gap-2"><ContactSelector contacts={suppliers} selectedContactId={field.value} onSelectContact={(id) => form.setValue('supplierId', id)} className="w-full" disabled={!currentItemForDisplay && mode === 'select'} /><Button type="button" variant="outline" onClick={() => setIsContactFormOpen(true)} disabled={!currentItemForDisplay && mode === 'select'}><Plus className="mr-2 h-4 w-4"/> New</Button></div><FormMessage /></FormItem> )} />
                </form>
              </Form>
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 border-t mt-auto">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="item-form" disabled={form.formState.isSubmitting || (mode === 'select' && !currentItemForDisplay)}>
              {form.formState.isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {itemToEdit ? 'Save Changes' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ContactFormDialog
        isOpen={isContactFormOpen}
        onOpenChange={setIsContactFormOpen}
        contactToEdit={null}
        folders={contactFolders}
        onFoldersChange={setContactFolders}
        onSave={handleContactSave}
        companies={companies}
        onCompaniesChange={setCompanies}
        customIndustries={customIndustries}
        onCustomIndustriesChange={setCustomIndustries}
      />
    </>
  );
}
