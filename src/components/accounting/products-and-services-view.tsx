
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreVertical, Pencil, Trash2, LoaderCircle, Settings, Check } from "lucide-react";
import { AccountingPageHeader } from "@/components/accounting/page-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import {
    getServiceItems, addServiceItem, updateServiceItem, deleteServiceItem, type ServiceItem, getTaxTypes, type TaxType,
} from "@/services/accounting-service";
import { ManageTaxTypesDialog } from './manage-tax-types-dialog';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';


const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const emptyItemForm = { description: '', price: '', taxType: '', taxRate: '' };

export function ProductsAndServicesView() {
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { user } = useAuth();
  const { preferences, updatePreferences } = useUserPreferences();
  
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isManageTaxDialogOpen, setIsManageTaxDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ServiceItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ServiceItem | null>(null);
  const [newItem, setNewItem] = useState(emptyItemForm);

  const { toast } = useToast();
  
  const loadData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const [fetchedItems, fetchedTaxes] = await Promise.all([
            getServiceItems(user.uid),
            getTaxTypes(user.uid),
        ]);
        setServiceItems(fetchedItems);
        setTaxTypes(fetchedTaxes);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to load data", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleOpenItemDialog = (item?: ServiceItem) => {
      if (item) {
          setItemToEdit(item);
          setNewItem({ 
              description: item.description, 
              price: String(item.price),
              taxType: item.taxType || '',
              taxRate: String(item.taxRate || ''),
            });
      } else {
          setItemToEdit(null);
          setNewItem({
              ...emptyItemForm,
              taxRate: String(preferences?.defaultTaxRate ?? ''),
          });
      }
      setIsItemDialogOpen(true);
  };
  
  const handleSaveItem = async () => {
    if (!user) return;
      const priceNum = parseFloat(newItem.price);
      if (!newItem.description.trim() || isNaN(priceNum) || priceNum < 0) {
          toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill out the description and a valid price.' });
          return;
      }
      
      const itemData = {
          description: newItem.description,
          price: priceNum,
          taxType: newItem.taxType,
          taxRate: parseFloat(newItem.taxRate) || 0,
      };

      try {
        if (itemToEdit) {
            await updateServiceItem(itemToEdit.id, itemData);
            setServiceItems(serviceItems.map(item => item.id === itemToEdit.id ? { ...item, ...itemData, id: itemToEdit.id, userId: user.uid } : item));
            toast({ title: "Item Updated" });
        } else {
            const newEntry = await addServiceItem({ ...itemData, userId: user.uid });
            setServiceItems([newEntry, ...serviceItems]);
            toast({ title: "Item Added" });
        }
        setIsItemDialogOpen(false);
      } catch (error: any) {
         toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
      }
  };
  
  const handleConfirmDelete = async () => {
      if (!itemToDelete) return;
      try {
        await deleteServiceItem(itemToDelete.id);
        setServiceItems(serviceItems.filter(b => b.id !== itemToDelete.id));
        toast({ title: 'Item Deleted', variant: 'destructive' });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
      } finally {
        setItemToDelete(null);
      }
  };

  const handleSetDefaultTaxRate = () => {
      const rate = parseFloat(newItem.taxRate);
      if (!isNaN(rate)) {
          updatePreferences({ defaultTaxRate: rate });
          toast({
              title: "Default Rate Saved",
              description: `${rate}% is now your default tax rate.`
          });
      }
  };

  const handleSelectTaxType = (typeName: string) => {
      const type = taxTypes.find(t => t.name === typeName);
      if (type) {
          setNewItem(prev => ({ ...prev, taxType: type.name, taxRate: String(type.rate) }));
      } else {
          setNewItem(prev => ({ ...prev, taxType: '', taxRate: String(preferences?.defaultTaxRate ?? '') }));
      }
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="Products & Services" />
        <header className="text-center">
            <h1 className="text-3xl font-bold font-headline text-primary">Products & Services</h1>
            <p className="text-muted-foreground">Create and manage reusable line items for your invoices.</p>
        </header>

        <Card className="max-w-4xl mx-auto">
          <CardHeader className="flex flex-row justify-between items-start">
            <div>
              <CardTitle>Reusable Service & Product List</CardTitle>
              <CardDescription>These items will be available to quickly add to any invoice.</CardDescription>
            </div>
            <Button variant="outline" onClick={() => handleOpenItemDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                    <LoaderCircle className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Tax Type</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {serviceItems.map(item => (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>{item.taxType || 'N/A'} ({item.taxRate || 0}%)</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleOpenItemDialog(item)}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onSelect={() => setItemToDelete(item)}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{itemToEdit ? 'Edit Item' : 'Add New Item'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                    <Input id="price" type="number" placeholder="0.00" value={newItem.price} onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))} className="pl-7" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="taxType">Tax Type</Label>
                    <div className="flex gap-2">
                        <Select value={newItem.taxType} onValueChange={handleSelectTaxType}>
                            <SelectTrigger id="taxType">
                                <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="None">None</SelectItem>
                                {taxTypes.map(t => (
                                    <SelectItem key={t.id} value={t.name}>{t.name} ({t.rate}%)</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => setIsManageTaxDialogOpen(true)} title="Manage Tax Types">
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="taxRate">Tax Rate (%)</Label>
                        <Button 
                            type="button" 
                            variant="link" 
                            className="h-auto p-0 text-[10px] text-muted-foreground hover:text-primary"
                            onClick={handleSetDefaultTaxRate}
                        >
                            Set as default
                        </Button>
                    </div>
                    <div className="relative">
                        <Input id="taxRate" type="number" placeholder="e.g., 15" value={newItem.taxRate} onChange={e => setNewItem(p => ({ ...p, taxRate: e.target.value }))} className="pr-8" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                </div>
              </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsItemDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveItem}>{itemToEdit ? 'Save Changes' : 'Add Item'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManageTaxTypesDialog
        isOpen={isManageTaxDialogOpen}
        onOpenChange={setIsManageTaxDialogOpen}
        taxTypes={taxTypes}
        onTaxTypesChange={setTaxTypes}
      />

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the item "{itemToDelete?.description}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
