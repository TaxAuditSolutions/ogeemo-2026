'use client';

import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from "date-fns";
import type { Asset, DepreciationEntry } from "@/services/accounting-service";
import { PlusCircle, Trash2, Info, Save } from "lucide-react";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CustomCalendar } from "../ui/custom-calendar";
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

interface AssetFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (asset: Asset | Omit<Asset, "id" | "userId">) => void;
  assetToEdit: Asset | null;
}

const emptyAssetForm = {
  name: "",
  description: "",
  assetClass: "",
  purchaseDate: format(new Date(), 'yyyy-MM-dd'),
  cost: '',
  undepreciatedCapitalCost: '',
  applyHalfYearRule: true,
};

const CRA_ASSET_CLASSES = [
    { value: "1", label: "Class 1 (4%) - Buildings" },
    { value: "8", label: "Class 8 (20%) - Furniture, equipment" },
    { value: "10", label: "Class 10 (30%) - Vehicles" },
    { value: "10.1", label: "Class 10.1 (30%) - Passenger vehicles (cost limit)" },
    { value: "12", label: "Class 12 (100%) - Tools < $500, software" },
    { value: "16", label: "Class 16 (40%) - Taxis, freight trucks" },
    { value: "43", label: "Class 43 (30%) - Manufacturing machinery" },
    { value: "45", label: "Class 45 (45%) - Computer equipment" },
    { value: "50", label: "Class 50 (55%) - Computer hardware" },
    { value: "53", label: "Class 53 (50%) - Zero-emission vehicles" },
];

/**
 * Helper to format a string or number with thousands separators (commas).
 */
const formatNumberWithCommas = (value: string | number) => {
  if (value === undefined || value === null || value === "") return "";
  const sValue = String(value).replace(/,/g, "");
  const parts = sValue.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

export function AssetFormDialog({ isOpen, onOpenChange, onSave, assetToEdit }: AssetFormDialogProps) {
  const [formData, setFormData] = useState(emptyAssetForm);
  const [depreciationEntries, setDepreciationEntries] = useState<DepreciationEntry[]>([]);
  const [newDepreciation, setNewDepreciation] = useState({ date: format(new Date(), 'yyyy-MM-dd'), amount: '' });
  const [isPurchaseDatePickerOpen, setIsPurchaseDatePickerOpen] = useState(false);
  const [isDepDatePickerOpen, setIsDepDatePickerOpen] = useState(false);

  const { toast } = useToast();

  const currentDepreciatedValue = useMemo(() => {
    const openingBalance = parseFloat(formData.undepreciatedCapitalCost.replace(/,/g, '')) || 0;
    const totalDepreciation = depreciationEntries.reduce((sum, entry) => sum + entry.amount, 0);
    return openingBalance - totalDepreciation;
  }, [formData.undepreciatedCapitalCost, depreciationEntries]);


  useEffect(() => {
    if (assetToEdit && isOpen) {
      const purchaseDateSource = assetToEdit.purchaseDate;
      let dateToFormat: Date;

      if (typeof purchaseDateSource === 'string') {
        dateToFormat = parseISO(purchaseDateSource);
      } else if (purchaseDateSource instanceof Date) {
        dateToFormat = purchaseDateSource;
      } else {
        dateToFormat = new Date();
      }
      
      if (!isValid(dateToFormat)) {
        dateToFormat = new Date();
      }

      setFormData({
        name: assetToEdit.name,
        description: assetToEdit.description || "",
        assetClass: assetToEdit.assetClass || "",
        purchaseDate: format(dateToFormat, 'yyyy-MM-dd'),
        cost: String(assetToEdit.cost),
        undepreciatedCapitalCost: String(assetToEdit.undepreciatedCapitalCost),
        applyHalfYearRule: assetToEdit.applyHalfYearRule,
      });
      setDepreciationEntries(assetToEdit.depreciationEntries || []);
    } else if (!assetToEdit && isOpen) {
      const newAssetDefaults = {
        ...emptyAssetForm,
        purchaseDate: format(new Date(), 'yyyy-MM-dd'),
      };
      setFormData(newAssetDefaults);
      setDepreciationEntries([]);
    }
  }, [assetToEdit, isOpen]);

  const handleSave = () => {
    const costNum = parseFloat(formData.cost.replace(/,/g, ''));
    const uccNum = parseFloat(formData.undepreciatedCapitalCost.replace(/,/g, ''));

    if (!formData.name.trim() || !formData.purchaseDate || isNaN(uccNum) || uccNum < 0) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please fill out Asset Name, Purchase Date, and a valid Current Value.",
      });
      return;
    }

    if (isNaN(costNum) || costNum < 0) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please enter a valid Original Purchase Price.",
      });
      return;
    }
    
    if (uccNum > costNum) {
        toast({
            variant: "destructive",
            title: "Invalid Value",
            description: "Current value cannot be greater than the original purchase price.",
        });
        return;
    }

    const dataToSave = {
      name: formData.name,
      description: formData.description,
      assetClass: formData.assetClass,
      purchaseDate: formData.purchaseDate,
      cost: costNum,
      undepreciatedCapitalCost: uccNum,
      applyHalfYearRule: formData.applyHalfYearRule,
      depreciationEntries: depreciationEntries,
    };

    if (assetToEdit) {
      onSave({ ...assetToEdit, ...dataToSave } as Asset);
    } else {
      onSave(dataToSave);
    }
    onOpenChange(false);
  };

  const handleValueChange = (key: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => {
        let finalValue = value;
        
        // Strip commas for numeric fields before updating state
        if (typeof value === 'string' && (key === 'cost' || key === 'undepreciatedCapitalCost')) {
            const cleanVal = value.replace(/,/g, '');
            if (cleanVal !== '' && !/^\d*\.?\d*$/.test(cleanVal)) {
                return prev; // Ignore invalid numeric input
            }
            finalValue = cleanVal;
        }

        const newState = { ...prev, [key]: finalValue };
        
        // If creating a new asset, automatically sync cost with UCC
        if (!assetToEdit && key === 'undepreciatedCapitalCost') {
            newState.cost = String(finalValue);
        }
        return newState;
    });
  };
  
  const handleAddDepreciation = () => {
    const amountNum = parseFloat(newDepreciation.amount.replace(/,/g, ''));
    if (!newDepreciation.date || isNaN(amountNum) || amountNum <= 0) {
        toast({ variant: 'destructive', title: 'Invalid Depreciation', description: 'Please enter a valid date and a positive amount.' });
        return;
    }
    
    if (amountNum > currentDepreciatedValue) {
        toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Depreciation cannot exceed the current value of the asset.' });
        return;
    }

    const newEntry: DepreciationEntry = {
        id: `temp_${Date.now()}`,
        date: newDepreciation.date,
        amount: amountNum,
    };
    setDepreciationEntries(prev => [...prev, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setNewDepreciation({ date: format(new Date(), 'yyyy-MM-dd'), amount: '' });
  };
  
  const handleDeleteDepreciation = (entryId: string) => {
    setDepreciationEntries(prev => prev.filter(entry => entry.id !== entryId));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col h-[90vh]">
        <DialogHeader>
          <DialogTitle>{assetToEdit ? 'Edit Asset & Depreciation' : 'Add New Asset'}</DialogTitle>
          <DialogDescription>
            {assetToEdit ? 'Update details, view history, and record new depreciation.' : 'Enter the details for your new capital asset.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
            <div className="space-y-6 px-6 py-4">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="asset-name">Asset Name</Label>
                    <Input id="asset-name" value={formData.name} onChange={(e) => handleValueChange('name', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="assetClass">Asset Class # (for CRA)</Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <a href="https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/claiming-capital-cost-allowance/classes-depreciable-property.html" target="_blank" rel="noopener noreferrer" aria-label="Learn more about CRA asset classes">
                                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                        </a>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Click to open the official CRA guide on CCA classes.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Select value={formData.assetClass} onValueChange={(value) => handleValueChange('assetClass', value)}>
                            <SelectTrigger id="assetClass">
                                <SelectValue placeholder="Select a class..." />
                            </SelectTrigger>
                            <SelectContent>
                                {CRA_ASSET_CLASSES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => handleValueChange('description', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="purchaseDate">Purchase Date</Label>
                         <Popover open={isPurchaseDatePickerOpen} onOpenChange={setIsPurchaseDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.purchaseDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {formData.purchaseDate ? format(parseISO(formData.purchaseDate), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <CustomCalendar mode="single" selected={formData.purchaseDate ? parseISO(formData.purchaseDate) : undefined} onSelect={(date) => { if (date) handleValueChange('purchaseDate', format(date, 'yyyy-MM-dd')); setIsPurchaseDatePickerOpen(false); }} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="undepreciatedCapitalCost">Current Value</Label>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                            <Input 
                                id="undepreciatedCapitalCost" 
                                type="text" 
                                placeholder="0.00" 
                                value={formatNumberWithCommas(formData.undepreciatedCapitalCost)} 
                                onChange={(e) => handleValueChange('undepreciatedCapitalCost', e.target.value)} 
                                className="pl-7 font-mono font-bold" 
                            />
                        </div>
                         <p className="text-xs text-muted-foreground">For new items, this is the purchase price. For used items, enter its current depreciated value.</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cost">Original Purchase Price</Label>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                        <Input 
                            id="cost" 
                            type="text" 
                            placeholder="0.00" 
                            value={formatNumberWithCommas(formData.cost)} 
                            onChange={(e) => handleValueChange('cost', e.target.value)} 
                            className="pl-7 font-mono font-bold" 
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">For new assets, this value is the same as the Current Value. For used assets, enter the price you originally paid.</p>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                    <Checkbox 
                        id="half-year-rule" 
                        checked={formData.applyHalfYearRule}
                        onCheckedChange={(checked) => handleValueChange('applyHalfYearRule', !!checked)}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <label
                        htmlFor="half-year-rule"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                        Apply half-year rule
                        </label>
                        <p className="text-xs text-muted-foreground">
                        Claim depreciation on half the cost in the first year.
                        </p>
                    </div>
                </div>
            </div>
            
            {assetToEdit && (
                <>
                <Separator />
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Depreciation Orchestration</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Current Depreciated Value (UCC)</Label>
                            <Input value={currentDepreciatedValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} readOnly disabled className="font-mono font-bold bg-muted/50" />
                        </div>
                    </div>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="p-4">
                            <CardTitle className="text-base">Record New Depreciation</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 grid grid-cols-[1fr_1fr_auto] gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="dep-date">Date</Label>
                                <Popover open={isDepDatePickerOpen} onOpenChange={setIsDepDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !newDepreciation.date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {newDepreciation.date ? format(parseISO(newDepreciation.date), "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CustomCalendar mode="single" selected={newDepreciation.date ? parseISO(newDepreciation.date) : undefined} onSelect={(date) => { if(date) setNewDepreciation(p => ({ ...p, date: format(date, 'yyyy-MM-dd') })); setIsDepDatePickerOpen(false); }} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dep-amount">Amount ($)</Label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                    <Input 
                                        id="dep-amount" 
                                        type="text" 
                                        placeholder="0.00" 
                                        value={formatNumberWithCommas(newDepreciation.amount)} 
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/,/g, '');
                                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                setNewDepreciation(p => ({ ...p, amount: val }));
                                            }
                                        }} 
                                        className="pl-7 font-mono font-bold" 
                                    />
                                </div>
                            </div>
                            <Button onClick={handleAddDepreciation} className="h-10"><PlusCircle className="mr-2 h-4 w-4"/> Add</Button>
                        </CardContent>
                    </Card>

                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Depreciation History</Label>
                        <div className="rounded-md border bg-muted/30">
                            <div className="p-4 space-y-2">
                                {depreciationEntries.length > 0 ? (
                                    depreciationEntries.map(entry => (
                                        <div key={entry.id} className="flex justify-between items-center text-sm p-2 rounded bg-white border shadow-sm">
                                            <span className="font-medium">{format(parseISO(entry.date), 'PP')}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono font-bold text-destructive">-{entry.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDepreciation(entry.id)}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4 italic">No depreciation recorded yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                </>
            )}
            </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t px-6 shrink-0 bg-muted/5">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="font-bold shadow-lg">
            <Save className="mr-2 h-4 w-4" />
            {assetToEdit ? 'Save Changes' : 'Add Asset to Register'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
