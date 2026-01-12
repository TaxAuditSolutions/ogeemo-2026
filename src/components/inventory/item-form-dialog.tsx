
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
import { LoaderCircle, ChevronsUpDown, Check, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { CustomCalendar } from '../ui/custom-calendar';
import { Label } from '@/components/ui/label';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/services/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { addCompany } from '@/services/accounting-service';
import { addIndustry, updateIndustry, deleteIndustry } from '@/services/industry-service';


const itemSchema = z.object({
    name: z.string().min(2, { message: "Item name is required." }),
    description: z.string().optional(),
    sku: z.string().optional(),
    type: z.enum(['Product', 'Supply', 'Material']).default('Product'),
    cost: z.coerce.number().min(0, "Cost must be non-negative.").optional().nullable(),
    price: z.coerce.number().min(0, "Price must be non-negative.").optional().nullable(),
    supplierId: z.string().optional().nullable(),
    acquisitionDate: z.date().optional().nullable(),
    dispositionDate: z.date().optional().nullable(),
    // stockQuantity is now managed separately
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
  const [isSupplierPopoverOpen, setIsSupplierPopoverOpen] = useState(false);
  const [isAcquisitionDateOpen, setIsAcquisitionDateOpen] = useState(false);
  const [isDispositionDateOpen, setIsDispositionDateOpen] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  
  const [quantityAdjustment, setQuantityAdjustment] = useState<number | ''>('');
  const [openingQuantity, setOpeningQuantity] = useState(0);

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
            cost: initialItem?.cost ?? undefined,
            price: initialItem?.price ?? undefined,
            supplierId: initialItem?.supplierId,
            acquisitionDate: initialItem?.acquisitionDate ? new Date(initialItem.acquisitionDate) : undefined,
            dispositionDate: initialItem?.dispositionDate ? new Date(initialItem.dispositionDate) : undefined,
        });
        setOpeningQuantity(initialItem?.stockQuantity || 0);
        setQuantityAdjustment('');
    }
  }, [isOpen, itemToEdit, form]);

  const newTotalQuantity = useMemo(() => {
    const adjustment = Number(quantityAdjustment);
    return openingQuantity + (isNaN(adjustment) ? 0 : adjustment);
  }, [openingQuantity, quantityAdjustment]);


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
        cost: item.cost ?? undefined,
        price: item.price ?? undefined,
        supplierId: item.supplierId,
        acquisitionDate: item.acquisitionDate ? new Date(item.acquisitionDate) : undefined,
        dispositionDate: item.dispositionDate ? new Date(item.dispositionDate) : undefined,
    });
    setOpeningQuantity(item.stockQuantity);
    setQuantityAdjustment('');
  };
  
  const handleSetNewItemName = (newItemName: string) => {
    if (!newItemName.trim()) return;
    
    const existingItem = items.find(item => item.name.toLowerCase() === newItemName.trim().toLowerCase());
    if (existingItem) {
      handleSelectItem(existingItem);
    } else {
      form.reset({
        ...form.getValues(),
        name: newItemName.trim(),
      });
      setOpeningQuantity(0);
      setQuantityAdjustment('');
    }
  };

  async function onSubmit(values: ItemFormData) {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
        return;
    }

    const dataToSave: Partial<Item> = {
        ...values,
        cost: values.cost ?? null,
        price: values.price ?? null,
    };
    
    try {
        if (itemToEdit) {
            await updateInventoryItem(itemToEdit.id, {
              ...dataToSave,
              stockQuantity: newTotalQuantity
            }, {
                type: 'Adjustment',
                notes: 'Item details updated via form'
            });
            toast({ title: 'Item Updated' });
        } else {
            await addInventoryItem({
              ...dataToSave,
              stockQuantity: newTotalQuantity,
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
                <form id="item-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-6 py-4">
                   <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <Label>1. Select an Item</Label>
                        <div className="flex items-center gap-2">
                           <Popover onOpenChange={(open) => { if (!open) handleSetNewItemName(field.value); }}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between" onClick={(e) => e.preventDefault()}>
                                      <span className="truncate">{field.value ? field.value : 'Select Existing or Type New...'}</span>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search items..." onValueChange={field.onChange} value={field.value} />
                                        <CommandList>
                                            <CommandEmpty>No item found. Type a name and press Enter to add a new one.</CommandEmpty>
                                            <CommandGroup>
                                                {items.map(item => (
                                                    <CommandItem key={item.id} value={item.name} onSelect={() => handleSelectItem(item)}>
                                                        <Check className={cn("mr-2 h-4 w-4", field.value === item.name ? 'opacity-100' : 'opacity-0')}/>
                                                        {item.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} placeholder="Details about the item..." /></FormControl> <FormMessage /> </FormItem> )} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => ( <FormItem><FormLabel>Item Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Product">For Resale</SelectItem><SelectItem value="Supply">Internal Use</SelectItem><SelectItem value="Material">Project Material</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="sku" render={({ field }) => ( <FormItem> <FormLabel>SKU</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  </div>
                  
                  <Separator className="my-6" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Opening Quantity</Label>
                        <Input value={openingQuantity} readOnly disabled className="bg-muted/50 font-mono text-center" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="quantity-adjustment">Add / Remove Quantity</Label>
                        <Input id="quantity-adjustment" type="number" value={quantityAdjustment} onChange={e => setQuantityAdjustment(e.target.value === '' ? '' : Number(e.target.value))} className="font-mono text-center" />
                    </div>
                    <div className="space-y-2">
                        <Label>New Total Quantity</Label>
                        <Input value={newTotalQuantity} readOnly disabled className="bg-muted/50 font-mono text-center font-bold" />
                    </div>
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
                                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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
                                <CustomCalendar mode="single" selected={field.value || undefined} onSelect={(date) => { field.onChange(date); setIsAcquisitionDateOpen(false); }} initialFocus />
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
                                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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
                                <CustomCalendar mode="single" selected={field.value || undefined} onSelect={(date) => { field.onChange(date); setIsDispositionDateOpen(false); }} initialFocus />
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
