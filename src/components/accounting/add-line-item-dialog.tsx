'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { type ServiceItem, type TaxType } from '@/services/accounting-service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronsUpDown, Check, Settings, PlusCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ManageTaxTypesDialog } from './manage-tax-types-dialog';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { Separator } from '../ui/separator';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  taxType?: string;
  taxRate?: number;
  totalAmount?: number;
  preTaxAmount?: number;
  taxAmount?: number;
}

interface AddLineItemDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  itemToEdit: LineItem | null;
  onSave: (newItem: LineItem) => void;
  serviceItems: ServiceItem[];
  onSaveRepeatable: (item: Omit<ServiceItem, 'id' | 'userId'>) => void;
  taxTypes: TaxType[];
  onTaxTypesChange: (taxTypes: TaxType[]) => void;
}

export function AddLineItemDialog({
  isOpen,
  onOpenChange,
  itemToEdit,
  onSave,
  serviceItems,
  onSaveRepeatable,
  taxTypes,
  onTaxTypesChange,
}: AddLineItemDialogProps) {
  const [description, setDescription] = useState('');
  const [customItemDescription, setCustomItemDescription] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [price, setPrice] = useState<number | ''>('');
  const [taxType, setTaxType] = useState('');
  const [taxRate, setTaxRate] = useState<number | ''>('');
  const [saveAsRepeatable, setSaveAsRepeatable] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTaxTypePopoverOpen, setIsTaxTypePopoverOpen] = useState(false);
  const [isManageTaxDialogOpen, setIsManageTaxDialogOpen] = useState(false);

  const { toast } = useToast();
  const { updatePreferences } = useUserPreferences();
  
  const { totalAmount, preTaxAmount, taxAmount } = useMemo(() => {
    const qty = Number(quantity) || 0;
    const unitPrice = Number(price) || 0;
    const rate = Number(taxRate) || 0;
    
    const total = qty * unitPrice;
    const preTax = total / (1 + rate / 100);
    const tax = total - preTax;
    
    return {
        totalAmount: total,
        preTaxAmount: preTax,
        taxAmount: tax
    };
  }, [quantity, price, taxRate]);

  useEffect(() => {
    if (isOpen) {
        if (itemToEdit) {
            setDescription(itemToEdit.description);
            setCustomItemDescription(itemToEdit.description);
            setQuantity(itemToEdit.quantity);
            setPrice(itemToEdit.price);
            setTaxType(itemToEdit.taxType || '');
            setTaxRate(itemToEdit.taxRate || '');
        } else {
            setDescription('');
            setCustomItemDescription('');
            setQuantity(1);
            setPrice('');
            setTaxType('');
            setTaxRate('');
        }
        setSaveAsRepeatable(false);
    }
  }, [isOpen, itemToEdit]);

  const handleSave = () => {
    const numQuantity = Number(quantity);
    const numPrice = Number(price);
    
    if (!description.trim() || isNaN(numQuantity) || numQuantity <= 0 || isNaN(numPrice) || numPrice < 0) {
        toast({
            variant: 'destructive',
            title: 'Invalid Input',
            description: 'Please ensure description, quantity, and price are valid.'
        });
        return;
    }
    
    const newItem: LineItem = {
        id: itemToEdit?.id || `item_${Date.now()}`,
        description: description.trim(),
        quantity: numQuantity,
        price: numPrice,
        taxType: taxType.trim(),
        taxRate: Number(taxRate) || 0,
        totalAmount,
        preTaxAmount,
        taxAmount,
    };
    
    onSave(newItem);

    if (saveAsRepeatable) {
        onSaveRepeatable({
            description: newItem.description,
            price: newItem.price,
            taxType: newItem.taxType,
            taxRate: newItem.taxRate,
        });
    }

    onOpenChange(false);
  };

  const handleSelectServiceItem = (item: ServiceItem) => {
    setDescription(item.description);
    setPrice(item.price);
    setTaxType(item.taxType || '');
    setTaxRate(item.taxRate || '');
    setCustomItemDescription('');
    setIsSearchOpen(false);
  };
  
  const handleCustomItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setCustomItemDescription(value);
      setDescription(value);
  };

  const handleSelectTaxType = (id: string) => {
    const type = taxTypes.find(t => t.id === id);
    if (type) {
        setTaxType(type.name);
        setTaxRate(type.rate);
    } else {
        setTaxType('None');
        setTaxRate(0);
    }
    setIsTaxTypePopoverOpen(false);
  };

  const handleSetDefaultTaxRate = () => {
      const rate = parseFloat(String(taxRate));
      if (!isNaN(rate)) {
          updatePreferences({ defaultTaxRate: rate });
          toast({
              title: "Default Rate Saved",
              description: `${rate}% is now your default tax rate.`
          });
      } else {
          toast({
              variant: 'destructive',
              title: "Invalid Rate",
              description: "Please enter a valid tax rate before setting it as the default."
          });
      }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{itemToEdit ? 'Edit Invoice Item' : 'Add Invoice Item'}</DialogTitle>
          <DialogDescription>
            {itemToEdit ? 'Update the details for this line item.' : 'Search for a repeatable item or enter a new custom item below.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label>1. Search Repeatable Items (Optional)</Label>
                <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                            Search for an item to pre-fill the form...
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search items..." />
                            <CommandList>
                                <CommandEmpty>No item found.</CommandEmpty>
                                <CommandGroup>
                                    {serviceItems.map(item => (
                                        <CommandItem
                                            key={item.id}
                                            value={item.description}
                                            onSelect={() => handleSelectServiceItem(item)}
                                        >
                                            {item.description}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="custom-description">2. Or, Add Custom Line Item</Label>
                <div className="flex items-center gap-2">
                    <PlusCircle className="h-5 w-5 text-muted-foreground" />
                    <Input
                        id="custom-description"
                        placeholder="Type new item description here..."
                        value={customItemDescription}
                        onChange={handleCustomItemChange}
                    />
                </div>
            </div>

            <div className="space-y-2 pt-4">
                <Label htmlFor="description">Description Preview</Label>
                <Textarea
                    id="description"
                    readOnly
                    disabled
                    className="bg-muted/50"
                    placeholder="Populated from search or custom input..."
                    value={description}
                />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                        id="quantity"
                        type="number"
                        placeholder="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="price">Unit Price</Label>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                        <Input
                            id="price"
                            type="number"
                            placeholder="0.00"
                            className="pl-7"
                            value={price}
                            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="totalAmount">Total Amount</Label>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                        <Input id="totalAmount" readOnly disabled className="pl-7 bg-muted/50 font-bold" value={totalAmount.toFixed(2)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="taxRate">Tax Rate (%)</Label>
                        <Button 
                            variant="link" 
                            className="h-auto p-0 text-xs font-bold text-primary hover:underline transition-all"
                            onClick={handleSetDefaultTaxRate}
                        >
                            Set as default
                        </Button>
                    </div>
                    <div className="relative">
                        <Input
                            id="taxRate"
                            type="number"
                            placeholder="e.g., 15"
                            className="pr-8"
                            value={taxRate}
                            onChange={(e) => setTaxRate(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Pre-Tax Amount</Label>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                        <Input readOnly disabled className="pl-7 bg-muted/50" value={preTaxAmount.toFixed(2)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Tax Amount</Label>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                        <Input readOnly disabled className="pl-7 bg-muted/50" value={taxAmount.toFixed(2)} />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="taxType">Tax Type Label</Label>
                <div className="flex gap-2">
                    <Select value={taxTypes.find(t => t.name === taxType)?.id || "None"} onValueChange={handleSelectTaxType}>
                        <SelectTrigger id="taxType">
                            <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="None">None</SelectItem>
                            {taxTypes.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name} ({t.rate}%)</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setIsManageTaxDialogOpen(true)} title="Manage Tax Types">
                        <Settings className="h-4 w-4"/>
                    </Button>
                </div>
            </div>

            {!itemToEdit && (
                <div className="flex items-center space-x-2 pt-2 border-t mt-4">
                    <Checkbox id="save-repeatable" checked={saveAsRepeatable} onCheckedChange={(checked) => setSaveAsRepeatable(!!checked)} />
                    <Label htmlFor="save-repeatable" className="cursor-pointer">Save as a repeatable item for future use</Label>
                </div>
            )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{itemToEdit ? 'Save Changes' : 'Save Item'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <ManageTaxTypesDialog
        isOpen={isManageTaxDialogOpen}
        onOpenChange={setIsManageTaxDialogOpen}
        taxTypes={taxTypes}
        onTaxTypesChange={onTaxTypesChange}
    />
    </>
  );
}
