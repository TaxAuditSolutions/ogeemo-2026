
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
import { getContacts, type Contact } from '@/services/contact-service';
import { LoaderCircle, ChevronsUpDown, Check, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Label } from '@/components/ui/label';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/services/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';


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
  items: InventoryItem[]; // Pass all items for the dropdown
}

export function ItemFormDialog({ isOpen, onOpenChange, itemToEdit, onSave, items }: ItemFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [contactFolders, setContactFolders] = useState<FolderData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSupplierPopoverOpen, setIsSupplierPopoverOpen] = useState(false);
  const [isAcquisitionDateOpen, setIsAcquisitionDateOpen] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");

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
            setSuppliers(contactsData); // We use contacts as potential suppliers
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load necessary data.' });
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
        const initialItem = itemToEdit;
        form.reset({
            name: initialItem?.name || '',
            description: initialItem?.description || '',
            sku: initialItem?.sku || '',
            type: initialItem?.type || 'Product',
            stockQuantity: initialItem?.stockQuantity || 0,
            cost: initialItem?.cost,
            price: initialItem?.price,
            supplierId: initialItem?.supplierId,
            acquisitionDate: initialItem?.acquisitionDate ? new Date(initialItem.acquisitionDate) : new Date(),
        });
        setNewItemName('');
    }
  }, [isOpen, itemToEdit, form]);

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
      setSuppliers(prev => {
          if (isEditing) {
              return prev.map(c => c.id === savedContact.id ? savedContact : c);
          }
          return [...prev, savedContact];
      });
      form.setValue('supplierId', savedContact.id);
      setIsContactFormOpen(false);
  };

  const handleSelectItem = (item: InventoryItem) => {
    form.reset({
        name: item.name || '',
        description: item.description || '',
        sku: item.sku || '',
        type: item.type || 'Product',
        stockQuantity: item.stockQuantity || 0,
        cost: item.cost,
        price: item.price,
        supplierId: item.supplierId,
        acquisitionDate: item.acquisitionDate ? new Date(item.acquisitionDate) : undefined,
    });
    setNewItemName('');
    setIsItemPopoverOpen(false);
  };
  
  const handleAddNewItem = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!newItemName.trim() || !user) return;
    
    try {
        const newInitialItem: Omit<ItemFormData, 'name'> & { name: string } = {
            name: newItemName.trim(),
            description: '',
            sku: '',
            type: 'Product',
            stockQuantity: 0,
        };
        const savedItem = await addInventoryItem({ ...newInitialItem, userId: user.uid });
        onSave(); // Refresh parent list
        toast({ title: "Item Added", description: `"${savedItem.name}" created. You can now add details.` });
        
        // Select the newly created item for editing
        form.reset({
            name: savedItem.name,
            description: savedItem.description || '',
            sku: savedItem.sku || '',
            type: savedItem.type,
            stockQuantity: savedItem.stockQuantity,
        });
        setNewItemName(''); // Clear the input field
        
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  async function onSubmit(values: ItemFormData) {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
        return;
    }
    
    // Determine if we are editing or creating.
    // Use itemToEdit prop to reliably know if we are in edit mode.
    const isEditing = !!itemToEdit;
    
    try {
        if (isEditing) {
            // Update existing item.
            await updateInventoryItem(itemToEdit.id, values, {
                type: 'Adjustment',
                notes: 'Item details updated via form'
            });
            toast({ title: 'Item Updated' });
        } else {
            // Create new item.
            await addInventoryItem({ ...values, userId: user.uid });
            toast({ title: 'Item Added' });
        }
        onSave(); // This will trigger a reload on the parent page
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-full max-w-none top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b text-center sm:text-center">
            <DialogTitle>Item Details</DialogTitle>
            <DialogDescription>
              Manage the details for your inventory items.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="space-y-4 px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>1. Select an Item</Label>
                        <Popover open={isItemPopoverOpen} onOpenChange={setIsItemPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className={cn("w-full justify-between", !form.getValues('name') && "text-muted-foreground")}>
                                    <span className="truncate">{form.getValues('name') || "Select an item to edit..."}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search items..." />
                                    <CommandList>
                                        <CommandEmpty>No item found.</CommandEmpty>
                                        <CommandGroup>
                                            {items.map(item => (<CommandItem key={item.id} value={item.name} onSelect={() => handleSelectItem(item)}><Check className={cn("mr-2 h-4 w-4", form.getValues('name') === item.name ? 'opacity-100' : 'opacity-0')}/>{item.name}</CommandItem>))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                     <form onSubmit={handleAddNewItem}>
                        <div className="space-y-2">
                            <Label htmlFor="new-item-name">2. Or, Add New Item</Label>
                            <div className="flex items-center gap-2">
                                <Plus className="h-5 w-5 text-muted-foreground" />
                                <Input
                                    id="new-item-name"
                                    placeholder="Type new item name and press Enter..."
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                />
                                <Button type="submit">
                                    <Plus className="mr-2 h-4 w-4"/>Add
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
                <Separator className="my-6" />
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Item Name</FormLabel> <FormControl><Input {...field} placeholder="Item name will appear here..." /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control} name="sku" render={({ field }) => ( <FormItem> <FormLabel>SKU / Item #</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    </div>
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} placeholder="Details about the item..." /></FormControl> <FormMessage /> </FormItem> )} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Item Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Product">For Resale</SelectItem><SelectItem value="Supply">Internal Use</SelectItem><SelectItem value="Material">Project Material</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="stockQuantity" render={({ field }) => ( <FormItem> <FormLabel>Initial Quantity</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
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
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="cost" render={({ field }) => ( <FormItem> <FormLabel>Unit Cost</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Sale Price</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField
                          control={form.control}
                          name="supplierId"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Supplier</FormLabel>
                              <div className="flex gap-2">
                                <Popover open={isSupplierPopoverOpen} onOpenChange={setIsSupplierPopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}><span className="truncate">{isLoading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : field.value ? suppliers.find(s => s.id === field.value)?.name : "Select supplier"}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Search contacts..." /><CommandList><CommandEmpty>No contact found.</CommandEmpty><CommandGroup>{suppliers.map(contact => ( <CommandItem key={contact.id} value={contact.name} onSelect={() => { form.setValue('supplierId', contact.id); setIsSupplierPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", field.value === contact.id ? "opacity-100" : "opacity-0")} /> {contact.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover>
                                <Button type="button" variant="outline" onClick={() => setIsContactFormOpen(true)}><Plus className="mr-2 h-4 w-4"/> New</Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                     <DialogFooter className="p-6 border-t mt-auto">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Save Item Details
                        </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </div>
            </ScrollArea>
          </div>
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
