
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
import { type ServiceItem, type TaxType, type IncomeCategory } from '@/services/accounting-service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronsUpDown, Check, Settings, Search, PlusCircle, Calculator, Percent, Save, FileSignature, Briefcase } from 'lucide-react';
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
  incomeCategories: IncomeCategory[];
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
  incomeCategories,
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
  const [searchQuery, setSearchQuery] = useState("");
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
        setSearchQuery("");
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
    if (item.taxType) setTaxType(item.taxType);
    if (item.taxRate !== undefined) setTaxRate(item.taxRate);
    setIsSearchOpen(false);
    toast({ title: "Item Loaded", description: `Populated details for "${item.description}"` });
  };

  const handleSelectCategory = (cat: IncomeCategory) => {
      setDescription(cat.name);
      setIsSearchOpen(false);
      toast({ title: "Category Selected", description: `"${cat.name}" added to description.` });
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden text-black">
        <DialogHeader className="p-6 pb-2 shrink-0 bg-muted/10 border-b">
          <div className="flex items-center gap-2 text-primary mb-1">
            <PlusCircle className="h-5 w-5" />
            <DialogTitle className="text-xl font-headline">Line Item Entry</DialogTitle>
          </div>
          <DialogDescription>
            Record a service or product for this invoice. Access your GL categories and service library.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
            <div className="py-6 space-y-6">
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="description" className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
                            Description Node
                        </Label>
                        <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-primary text-[10px] font-bold uppercase tracking-widest bg-primary/5 hover:bg-primary/10">
                                    <Search className="mr-1.5 h-3 w-3" /> Select from Library
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[450px] p-0" align="end">
                                <Command shouldFilter={false}>
                                    <CommandInput 
                                        placeholder="Search services or categories..." 
                                        value={searchQuery}
                                        onValueChange={setSearchQuery}
                                    />
                                    <CommandList>
                                        <CommandEmpty>No results matching "{searchQuery}"</CommandEmpty>
                                        <ScrollArea className="h-72">
                                            <CommandGroup heading="Saved Services & Products">
                                                {serviceItems
                                                    .filter(i => i.description.toLowerCase().includes(searchQuery.toLowerCase()))
                                                    .map(item => (
                                                    <CommandItem
                                                        key={item.id}
                                                        value={item.description}
                                                        onSelect={() => handleSelectServiceItem(item)}
                                                        className="cursor-pointer"
                                                    >
                                                        <Briefcase className="mr-2 h-4 w-4 text-primary/60" />
                                                        <div className="flex flex-col flex-1">
                                                            <span className="font-medium text-sm">{item.description}</span>
                                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">{formatCurrency(item.price)} • {item.taxType || 'No Tax'}</span>
                                                        </div>
                                                        {description === item.description && <Check className="h-4 w-4 text-primary ml-auto" />}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                            <Separator />
                                            <CommandGroup heading="Income Categories (GL Library)">
                                                {incomeCategories
                                                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                                    .map(cat => (
                                                    <CommandItem
                                                        key={cat.id}
                                                        value={cat.name}
                                                        onSelect={() => handleSelectCategory(cat)}
                                                        className="cursor-pointer"
                                                    >
                                                        <FileSignature className="mr-2 h-4 w-4 text-muted-foreground" />
                                                        <div className="flex flex-col flex-1">
                                                            <span className="font-medium text-sm">{cat.name}</span>
                                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Line {cat.categoryNumber}</span>
                                                        </div>
                                                        {description === cat.name && <Check className="h-4 w-4 text-primary ml-auto" />}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </ScrollArea>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Textarea
                        id="description"
                        placeholder="Define the work performed or product provided..."
                        className="min-h-[100px] text-base leading-relaxed font-semibold focus-visible:ring-primary"
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
                            className="h-11 font-mono font-bold text-lg"
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
                                className="pl-7 h-11 font-mono font-bold text-lg"
                                value={price}
                                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                <Card className="bg-primary/5 border-primary/20 shadow-inner">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-primary/10">
                        <CardTitle className="text-[10px] uppercase font-bold text-primary tracking-[0.2em] flex items-center gap-2">
                            <Calculator className="h-3.5 w-3.5" /> Operational Vitals
                        </CardTitle>
                        <Badge variant="outline" className="bg-white/50 font-mono text-[10px]">{quantity} x ${Number(price).toFixed(2)}</Badge>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Pre-Tax Subtotal</span>
                            <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                                Tax Portion <span className="text-[10px] font-bold">({taxRate}%)</span>
                            </span>
                            <span className="font-mono font-semibold">+{formatCurrency(taxAmount)}</span>
                        </div>
                        <Separator className="bg-primary/10" />
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-primary uppercase text-xs tracking-[0.1em]">Final Line Total</span>
                            <span className="font-mono font-bold text-2xl text-primary">{formatCurrency(lineTotal)}</span>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em] border-b pb-1">Tax Orchestration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="taxType" className="text-xs font-semibold">Configuration</Label>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsManageTaxDialogOpen(true)}>
                                    <Settings className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
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
                                <SelectTrigger className="h-10 text-sm">
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
                                <Label htmlFor="taxRate" className="text-xs font-semibold">Manual Over-ride (%)</Label>
                                <Button 
                                    variant="link" 
                                    className="h-auto p-0 text-[10px] font-bold text-primary hover:underline"
                                    onClick={handleSetDefaultTaxRate}
                                >
                                    Save as default
                                </Button>
                            </div>
                            <div className="relative">
                                <Input
                                    id="taxRate"
                                    type="number"
                                    className="pr-8 h-10 font-mono text-base"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs"><Percent className="h-3 w-3" /></span>
                            </div>
                        </div>
                    </div>
                </div>

                {!itemToEdit && (
                    <div className="flex items-center space-x-3 p-4 rounded-xl border border-dashed hover:border-primary/50 transition-all cursor-pointer group bg-muted/5">
                        <Checkbox 
                            id="save-repeatable" 
                            checked={saveAsRepeatable} 
                            onCheckedChange={(checked) => setSaveAsRepeatable(!!checked)} 
                        />
                        <div className="grid gap-0.5 leading-none">
                            <Label htmlFor="save-repeatable" className="text-sm font-semibold group-hover:text-primary transition-colors cursor-pointer">
                                Add to Professional Library
                            </Label>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Save this as a reusable template item.</p>
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="h-11 px-10 font-bold shadow-xl">
            <Save className="mr-2 h-4 w-4" />
            {itemToEdit ? 'Save Changes' : 'Add to Invoice'}
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
