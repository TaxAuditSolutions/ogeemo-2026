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
import { ChevronsUpDown, Check, Settings, Search, PlusCircle, Calculator, Percent, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ManageTaxTypesDialog } from './manage-tax-types-dialog';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

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
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [price, setPrice] = useState<number | ''>('');
  const [taxType, setTaxType] = useState('None');
  const [taxRate, setTaxRate] = useState<number | ''>('');
  const [saveAsRepeatable, setSaveAsRepeatable] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isManageTaxDialogOpen, setIsManageTaxDialogOpen] = useState(false);

  const { toast } = useToast();
  const { preferences, updatePreferences } = useUserPreferences();
  
  const { subtotal, taxAmount, lineTotal } = useMemo(() => {
    const qty = Number(quantity) || 0;
    const unitPrice = Number(price) || 0;
    const rate = Number(taxRate) || 0;
    
    const sub = qty * unitPrice;
    const tax = sub * (rate / 100);
    const total = sub + tax;
    
    return {
        subtotal: sub,
        taxAmount: tax,
        lineTotal: total
    };
  }, [quantity, price, taxRate]);

  useEffect(() => {
    if (isOpen) {
        if (itemToEdit) {
            setDescription(itemToEdit.description);
            setQuantity(itemToEdit.quantity);
            setPrice(itemToEdit.price);
            setTaxType(itemToEdit.taxType || 'None');
            setTaxRate(itemToEdit.taxRate || 0);
        } else {
            setDescription('');
            setQuantity(1);
            setPrice('');
            setTaxType('None');
            setTaxRate(preferences?.defaultTaxRate ?? 0);
        }
        setSaveAsRepeatable(false);
    }
  }, [isOpen, itemToEdit, preferences]);

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
        taxType: taxType === 'None' ? '' : taxType,
        taxRate: Number(taxRate) || 0,
        totalAmount: lineTotal,
        preTaxAmount: subtotal,
        taxAmount: taxAmount,
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
    setTaxType(item.taxType || 'None');
    setTaxRate(item.taxRate || 0);
    setIsSearchOpen(false);
    toast({ title: "Item Loaded", description: `Populated details for "${item.description}"` });
  };

  const handleSetDefaultTaxRate = () => {
      const rate = parseFloat(String(taxRate));
      if (!isNaN(rate)) {
          updatePreferences({ defaultTaxRate: rate });
          toast({
              title: "Default Rate Saved",
              description: `${rate}% is now your default tax rate.`
          });
      }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0 bg-muted/10 border-b">
          <div className="flex items-center gap-2 text-primary mb-1">
            <PlusCircle className="h-5 w-5" />
            <DialogTitle className="text-xl font-headline">{itemToEdit ? 'Edit Line Item' : 'Add Line Item'}</DialogTitle>
          </div>
          <DialogDescription>
            Record a service or product for this invoice.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
            <div className="py-6 space-y-6">
                {/* 1. Description Section */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="description" className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
                            Item Description
                        </Label>
                        <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 text-primary text-[10px] font-bold uppercase tracking-widest">
                                    <Search className="mr-1.5 h-3 w-3" /> Select From Library
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="end">
                                <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                    <CommandInput placeholder="Search your repeatable items..." />
                                    <CommandList>
                                        <CommandEmpty>No saved items found.</CommandEmpty>
                                        <CommandGroup heading="Saved Items">
                                            {serviceItems.map(item => (
                                                <CommandItem
                                                    key={item.id}
                                                    value={item.description}
                                                    onSelect={() => handleSelectServiceItem(item)}
                                                    className="cursor-pointer"
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", description === item.description ? "opacity-100" : "opacity-0")} />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{item.description}</span>
                                                        <span className="text-xs text-muted-foreground">{formatCurrency(item.price)}</span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Textarea
                        id="description"
                        placeholder="What are you billing for?"
                        className="min-h-[100px] text-base leading-relaxed"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Quantity</Label>
                        <Input
                            id="quantity"
                            type="number"
                            step="0.01"
                            className="h-11 font-mono font-bold"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="price" className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Unit Price ($)</Label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                className="pl-7 h-11 font-mono font-bold"
                                value={price}
                                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Calculation Vital Card */}
                <Card className="bg-primary/5 border-primary/20 shadow-inner">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-primary/10">
                        <CardTitle className="text-xs uppercase font-bold text-primary tracking-widest flex items-center gap-2">
                            <Calculator className="h-3.5 w-3.5" /> Line Vitals
                        </CardTitle>
                        <Badge variant="outline" className="bg-white/50 font-mono text-[10px]">{quantity} x ${Number(price).toFixed(2)}</Badge>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                                Tax <span className="text-[10px] font-bold">({taxRate}%)</span>
                            </span>
                            <span className="font-mono font-semibold">+{formatCurrency(taxAmount)}</span>
                        </div>
                        <Separator className="bg-primary/10" />
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-primary uppercase text-xs tracking-wider">Line Total</span>
                            <span className="font-mono font-bold text-xl text-primary">{formatCurrency(lineTotal)}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Tax & Compliance Section */}
                <div className="space-y-4">
                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em] border-b pb-1">Compliance Node</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="taxType" className="text-xs font-semibold">Tax Configuration</Label>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsManageTaxDialogOpen(true)}>
                                    <Settings className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <Select 
                                value={taxTypes.find(t => t.name === taxType)?.id || "None"} 
                                onValueChange={(id) => {
                                    const type = taxTypes.find(t => t.id === id);
                                    if (type) {
                                        setTaxType(type.name);
                                        setTaxRate(type.rate);
                                    } else {
                                        setTaxType('None');
                                        setTaxRate(0);
                                    }
                                }}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="None">No Tax Applied</SelectItem>
                                    {taxTypes.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.rate}%)</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="taxRate" className="text-xs font-semibold">Manual Tax Rate (%)</Label>
                                <Button 
                                    variant="link" 
                                    className="h-auto p-0 text-[10px] font-bold text-primary hover:underline"
                                    onClick={handleSetDefaultTaxRate}
                                >
                                    Set as default
                                </Button>
                            </div>
                            <div className="relative">
                                <Input
                                    id="taxRate"
                                    type="number"
                                    className="pr-8 h-10 font-mono"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs"><Percent className="h-3 w-3" /></span>
                            </div>
                        </div>
                    </div>
                </div>

                {!itemToEdit && (
                    <div className="flex items-center space-x-3 p-4 rounded-xl border border-dashed hover:border-primary/50 transition-colors cursor-pointer group">
                        <Checkbox 
                            id="save-repeatable" 
                            checked={saveAsRepeatable} 
                            onCheckedChange={(checked) => setSaveAsRepeatable(!!checked)} 
                        />
                        <div className="grid gap-0.5 leading-none">
                            <Label htmlFor="save-repeatable" className="text-sm font-semibold group-hover:text-primary transition-colors cursor-pointer">
                                Add to Item Library
                            </Label>
                            <p className="text-[10px] text-muted-foreground">This item will be saved for quick selection in future invoices.</p>
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="h-11 px-8 font-bold shadow-lg">
            <Save className="mr-2 h-4 w-4" />
            {itemToEdit ? 'Update Line Item' : 'Add to Invoice'}
          </Button>
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
