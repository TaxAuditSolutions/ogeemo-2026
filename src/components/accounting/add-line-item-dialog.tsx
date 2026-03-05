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
import { type ServiceItem, type TaxType, type ExpenseCategory } from '@/services/accounting-service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  PlusCircle, 
  Check, 
  Settings, 
  Search, 
  Calculator, 
  Percent, 
  Save, 
  FileSignature, 
  Briefcase, 
  X, 
  Info,
  Plus,
  MessageSquare
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ManageTaxTypesDialog } from './manage-tax-types-dialog';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LineItem {
  id: string;
  description: string;
  internalNotes?: string;
  categoryNumber?: string;
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
  expenseCategories: ExpenseCategory[];
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
  expenseCategories,
  onSaveRepeatable,
  taxTypes,
  onTaxTypesChange,
}: AddLineItemDialogProps) {
  const [description, setDescription] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [categoryNumber, setCategoryNumber] = useState('');
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
  
  const uniqueServiceItems = useMemo(() => {
    const seen = new Set<string>();
    return serviceItems.filter(item => {
        const desc = item.description.toLowerCase().trim();
        if (seen.has(desc)) return false;
        seen.add(desc);
        return true;
    });
  }, [serviceItems]);

  const uniqueExpenseCategories = useMemo(() => {
    const seen = new Set<string>();
    return expenseCategories.filter(cat => {
        const key = cat.categoryNumber || cat.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
  }, [expenseCategories]);

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
            setInternalNotes(itemToEdit.internalNotes || '');
            setCategoryNumber(itemToEdit.categoryNumber || '');
            setQuantity(itemToEdit.quantity);
            setPrice(itemToEdit.price);
            setTaxType(itemToEdit.taxType || 'None');
            setTaxRate(itemToEdit.taxRate || 0);
        } else {
            setDescription('');
            setInternalNotes('');
            setCategoryNumber('');
            setQuantity(1);
            setPrice('');
            setTaxType('None');
            setTaxRate(preferences?.defaultTaxRate ?? 0);
        }
        setSaveAsRepeatable(false);
        setSearchQuery("");
    }
  }, [isOpen, itemToEdit, preferences]);

  const handleSelectTaxType = (id: string) => {
    const type = taxTypes.find((t) => t.id === id);
    if (type) {
      setTaxType(type.name);
      setTaxRate(type.rate);
    } else {
      setTaxType('None');
      setTaxRate(0);
    }
  };

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
        internalNotes: internalNotes.trim(),
        categoryNumber: categoryNumber,
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
    if (!description) setDescription(item.description);
    setPrice(item.price);
    if (item.taxType) setTaxType(item.taxType);
    if (item.taxRate !== undefined) setTaxRate(item.taxRate);
    setIsSearchOpen(false);
    toast({ title: "Item Loaded", description: `Populated details for "${item.description}"` });
  };

  const handleSelectCategory = (cat: ExpenseCategory) => {
      setCategoryNumber(cat.categoryNumber || cat.id);
      if (!description) setDescription(cat.name);
      setIsSearchOpen(false);
      toast({ title: "Category Selected", description: `"${cat.name}" set as accounting line.` });
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

  const filteredServiceItems = uniqueServiceItems.filter(i => i.description.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredCategories = uniqueExpenseCategories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen flex flex-col p-0 rounded-none overflow-hidden text-black bg-background">
        <DialogHeader className="p-6 shrink-0 border-b bg-muted/10 relative">
          <div className="flex flex-col items-center gap-2 text-primary">
            <PlusCircle className="h-10 w-10" />
            <div className="text-center">
                <DialogTitle className="text-3xl font-headline uppercase tracking-tight">Line Item Orchestration</DialogTitle>
                <DialogDescription className="text-base">
                    Define operational and accounting nodes for this invoice.
                </DialogDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-6 top-6 h-10 w-10 rounded-full hover:bg-primary/10" 
            onClick={() => onOpenChange(false)}
          >
            <X className="h-6 w-6" />
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-white">
            <div className="max-w-4xl mx-auto w-full py-12 px-6 space-y-10">
                
                {/* 1. Category Line Item */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <Label className="text-sm uppercase font-bold text-primary tracking-widest flex items-center gap-2">
                            <FileSignature className="h-4 w-4" /> 1. Category Line Item (BKS Audit)
                        </Label>
                        <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-10 text-primary text-xs font-bold uppercase tracking-widest bg-primary/5 hover:bg-primary/10 border-primary/20">
                                    <Search className="mr-2 h-4 w-4" /> Select or create category
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[500px] p-0 shadow-2xl" align="end">
                                <Command shouldFilter={false}>
                                    <CommandInput 
                                        placeholder="Search unique items or categories..." 
                                        value={searchQuery}
                                        onValueChange={setSearchQuery}
                                        className="h-12"
                                    />
                                    <CommandList className="max-h-[500px]">
                                        <CommandEmpty>No results matching "{searchQuery}"</CommandEmpty>
                                        
                                        {filteredServiceItems.length > 0 && (
                                            <CommandGroup heading="Professional Services Library">
                                                {filteredServiceItems.map(item => (
                                                    <CommandItem
                                                        key={item.id}
                                                        value={item.description}
                                                        onSelect={() => handleSelectServiceItem(item)}
                                                        className="cursor-pointer py-3"
                                                    >
                                                        <Briefcase className="mr-3 h-5 w-5 text-primary/60" />
                                                        <div className="flex flex-col flex-1">
                                                            <span className="font-bold text-sm">{item.description}</span>
                                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                                Rate: {formatCurrency(item.price)} • Tax: {item.taxType || 'No Tax'}
                                                            </span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        )}

                                        {filteredCategories.length > 0 && (
                                            <>
                                                <Separator />
                                                <CommandGroup heading="Expense Categories (BKS Audit Lines)">
                                                    {filteredCategories.map(cat => (
                                                        <CommandItem
                                                            key={cat.id}
                                                            value={cat.name}
                                                            onSelect={() => handleSelectCategory(cat)}
                                                            className="cursor-pointer py-3"
                                                        >
                                                            <FileSignature className="mr-3 h-5 w-5 text-muted-foreground" />
                                                            <div className="flex flex-col flex-1">
                                                                <span className="font-bold text-sm">{cat.name}</span>
                                                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">CRA Line {cat.categoryNumber}</span>
                                                            </div>
                                                            {categoryNumber === (cat.categoryNumber || cat.id) && <Check className="h-5 w-5 text-primary ml-auto" />}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </>
                                        )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="p-4 border-2 rounded-xl bg-muted/30 flex items-center justify-between">
                        <span className="text-lg font-semibold">
                            {categoryNumber ? (uniqueExpenseCategories.find(c => (c.categoryNumber || c.id) === categoryNumber)?.name || categoryNumber) : 'No category selected'}
                        </span>
                        {categoryNumber && (
                            <Badge variant="outline" className="font-mono text-primary border-primary/20">
                                Line {categoryNumber}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* 2. Subject Description (Public) */}
                <div className="space-y-4">
                    <Label htmlFor="description" className="text-sm uppercase font-bold text-primary tracking-widest flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" /> 2. Subject Description (Visible on Invoice)
                    </Label>
                    <Textarea
                        id="description"
                        placeholder="Clearly define the work performed or product provided for the client..."
                        className="min-h-[120px] text-xl leading-relaxed font-semibold focus-visible:ring-primary border-2"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {/* 3. Internal Notes (Private) */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="internalNotes" className="text-sm uppercase font-bold text-primary tracking-widest flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" /> 3. Internal Operational Notes
                        </Label>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 uppercase text-[10px] tracking-widest">
                            Internal Only - Hidden from Invoice
                        </Badge>
                    </div>
                    <Textarea
                        id="internalNotes"
                        placeholder="Add administrative context, private rationale, or detailed logs for your records..."
                        className="min-h-[100px] text-base leading-relaxed bg-muted/10 border-dashed"
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                    />
                </div>

                {/* 4. Quantities & Vitals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <Label className="text-sm uppercase font-bold text-primary tracking-widest flex items-center gap-2">
                            <Calculator className="h-4 w-4" /> 4. Quantity & Rate
                        </Label>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="quantity" className="text-xs font-semibold text-muted-foreground">Quantity</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    step="0.01"
                                    className="h-14 font-mono font-bold text-2xl text-center"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price" className="text-xs font-semibold text-muted-foreground">Unit Price ($)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-2xl">$</span>
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        className="pl-10 h-14 font-mono font-bold text-2xl text-center"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Card className="bg-primary/5 border-2 border-primary/20 shadow-xl overflow-hidden self-end">
                        <CardHeader className="py-3 px-6 flex flex-row items-center justify-between border-b border-primary/10 bg-white/50">
                            <CardTitle className="text-[10px] uppercase font-bold text-primary tracking-[0.25em] flex items-center gap-2">
                                <Calculator className="h-4 w-4" /> Line Vitals
                            </CardTitle>
                            <Badge variant="secondary" className="font-mono text-xs font-bold px-3">
                                {quantity || 0} units @ ${Number(price || 0).toFixed(2)}
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-6 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">Subtotal</span>
                                <span className="font-mono font-bold">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium flex items-center gap-1">
                                    Tax <span className="text-[10px] font-bold text-primary">({taxRate}%)</span>
                                </span>
                                <span className="font-mono font-bold">+{formatCurrency(taxAmount)}</span>
                            </div>
                            <Separator className="bg-primary/20 h-0.5" />
                            <div className="flex justify-between items-center pt-1">
                                <span className="font-black text-primary uppercase text-sm tracking-widest">Total Credit</span>
                                <span className="font-mono font-black text-3xl text-primary">{formatCurrency(lineTotal)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Label className="text-sm uppercase font-bold text-primary tracking-widest flex items-center gap-2">
                        <Percent className="h-4 w-4" /> 5. Tax Orchestration
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-8 border rounded-3xl bg-muted/10">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="taxType" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tax Strategy</Label>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setIsManageTaxDialogOpen(true)}>
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </div>
                            <Select 
                                value={taxTypes.find(t => t.name === taxType)?.id || "None"} 
                                onValueChange={handleSelectTaxType}
                            >
                                <SelectTrigger className="h-12 text-lg font-medium bg-white">
                                    <SelectValue placeholder="Select type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="None">Exempt / No Tax</SelectItem>
                                    {taxTypes.map(t => (
                                        <SelectItem key={t.id} value={t.id} className="py-3">
                                            <span className="font-bold">{t.name}</span>
                                            <span className="ml-2 text-muted-foreground font-normal">({t.rate}%)</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="taxRate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Custom Over-ride (%)</Label>
                                <Button 
                                    variant="link" 
                                    className="h-auto p-0 text-[10px] font-black text-primary hover:underline uppercase tracking-tighter"
                                    onClick={handleSetDefaultTaxRate}
                                >
                                    Set as default
                                </Button>
                            </div>
                            <div className="relative">
                                <Input
                                    id="taxRate"
                                    type="number"
                                    className="pr-12 h-12 font-mono text-xl bg-white"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg font-bold">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {!itemToEdit && (
                    <div className="flex items-center space-x-4 p-8 rounded-3xl border-2 border-dashed border-primary/30 hover:border-primary/60 transition-all cursor-pointer group bg-primary/5">
                        <Checkbox 
                            id="save-repeatable" 
                            checked={saveAsRepeatable} 
                            onCheckedChange={(checked) => setSaveAsRepeatable(!!checked)} 
                            className="h-6 w-6 border-2"
                        />
                        <div className="grid gap-1 leading-none">
                            <Label htmlFor="save-repeatable" className="text-xl font-bold group-hover:text-primary transition-colors cursor-pointer">
                                Commit to Professional Library
                            </Label>
                            <p className="text-sm text-muted-foreground">Save this configuration as a reusable service node for future invoices.</p>
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>

        <DialogFooter className="p-8 border-t bg-muted/10 shrink-0 flex flex-col sm:flex-row sm:justify-between items-center gap-6">
          <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground italic font-medium max-w-2xl">
            <div className="p-2 bg-primary/10 rounded-full">
                <Info className="h-5 w-5 text-primary" />
            </div>
            <span>This entry will be synchronized with the master invoice and your BKS receivables ledger upon saving.</span>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)} className="h-14 px-10 text-lg">Cancel</Button>
            <Button onClick={handleSave} className="h-14 px-16 font-bold shadow-2xl text-xl">
                <Save className="mr-2 h-6 w-6" />
                {itemToEdit ? 'Save Changes' : 'Append to Invoice'}
            </Button>
          </div>
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
