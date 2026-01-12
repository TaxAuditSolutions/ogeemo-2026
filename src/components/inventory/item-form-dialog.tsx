

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
import { CustomCalendar } from '../ui/custom-calendar';
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
    acquisitionDate: z.date().optional().nullable(),
    dispositionDate: z.date().optional().nullable(),
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
  const [isDispositionDateOpen, setIsDispositionDateOpen] = useState(false);
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
            cost: initialItem?.cost ?? undefined,
            price: initialItem?.price ?? undefined,
            supplierId: initialItem?.supplierId,
            acquisitionDate: initialItem?.acquisitionDate ? new Date(initialItem.acquisitionDate) : new Date(),
            dispositionDate: initialItem?.dispositionDate ? new Date(initialItem.dispositionDate) : undefined,
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
        cost: item.cost ?? undefined,
        price: item.price ?? undefined,
        supplierId: item.supplierId,
        acquisitionDate: item.acquisitionDate ? new Date(item.acquisitionDate) : undefined,
        dispositionDate: item.dispositionDate ? new Date(item.dispositionDate) : undefined,
    });
    setNewItemName('');
    setIsItemPopoverOpen(false);
  };
  
  const handleSetNewItemName = () => {
    if (!newItemName.trim()) return;
    form.reset({
        ...form.getValues(),
        name: newItemName.trim(),
    });
    setNewItemName('');
  };

  async function onSubmit(values: ItemFormData) {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
        return;
    }

    const dataToSave = {
        ...values,
        cost: values.cost ?? null,
        price: values.price ?? null,
    };
    
    const existingItem = items.find(item => item.name.toLowerCase() === values.name.toLowerCase());
    
    try {
        if (itemToEdit) {
            await updateInventoryItem(itemToEdit.id, dataToSave, {
                type: 'Adjustment',
                notes: 'Item details updated via form'
            });
            toast({ title: 'Item Updated' });
        } else if (existingItem) {
             toast({ variant: 'destructive', title: 'Item Exists', description: `An item named "${values.name}" already exists. Please edit the existing item or choose a different name.`});
             return;
        } else { // This is a new item creation
            await addInventoryItem({ ...dataToSave, userId: user.uid });
            toast({ title: 'Item Added' });
        }
        onSave();
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
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
                      <div className="space-y-2">
                          <Label htmlFor="new-item-name">2. Or, Add New Item Name</Label>
                          <div className="flex items-center gap-2">
                               <Input
                                  id="new-item-name"
                                  placeholder="Type new item name..."
                                  value={newItemName}
                                  onChange={(e) => setNewItemName(e.target.value)}
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSetNewItemName();
                                      }
                                  }}
                              />
                          </div>
                      </div>
                  </div>
                  <Separator className="my-6" />
                  <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Item Name</FormLabel> <FormControl><Input placeholder="Enter item name..." {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} placeholder="Details about the item..." /></FormControl> <FormMessage /> </FormItem> )} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Item Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Product">For Resale</SelectItem><SelectItem value="Supply">Internal Use</SelectItem><SelectItem value="Material">Project Material</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="stockQuantity" render={({ field }) => ( <FormItem> <FormLabel>Initial Quantity</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="sku" render={({ field }) => ( <FormItem> <FormLabel>SKU</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
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
                                <CustomCalendar
                                  mode="single"
                                  selected={field.value || undefined}
                                  onSelect={(date) => { field.onChange(date); setIsAcquisitionDateOpen(false); }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="dispositionDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Disposition Date</FormLabel>
                            <Popover open={isDispositionDateOpen} onOpenChange={setIsDispositionDateOpen}>
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
                                      <span>Pick a date (optional)</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CustomCalendar
                                  mode="single"
                                  selected={field.value || undefined}
                                  onSelect={(date) => { field.onChange(date); setIsDispositionDateOpen(false); }}
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
                      <FormField control={form.control} name="cost" render={({ field }) => ( <FormItem> <FormLabel>Unit Cost</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
                      <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Sale Price</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )} />
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
                </form>
              </Form>
            </ScrollArea>
          </div>
            <DialogFooter className="p-6 border-t mt-auto">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" form="item-form" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Save Item Details
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
