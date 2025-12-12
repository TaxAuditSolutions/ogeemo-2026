
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { type TaxType, addTaxType, updateTaxType, deleteTaxType } from '@/services/accounting-service';
import { useAuth } from '@/context/auth-context';
import { ScrollArea } from '../ui/scroll-area';
import { Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';


interface ManageTaxTypesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  taxTypes: TaxType[];
  onTaxTypesChange: (taxTypes: TaxType[]) => void;
}

export function ManageTaxTypesDialog({
  isOpen,
  onOpenChange,
  taxTypes,
  onTaxTypesChange,
}: ManageTaxTypesDialogProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [typeToEdit, setTypeToEdit] = useState<TaxType | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<TaxType | null>(null);
  const [name, setName] = useState('');
  const [rate, setRate] = useState<number | ''>('');
  
  const { user } = useAuth();
  const { toast } = useToast();

  const handleOpenForm = (taxType?: TaxType) => {
    if (taxType) {
      setTypeToEdit(taxType);
      setName(taxType.name);
      setRate(taxType.rate);
    } else {
      setTypeToEdit(null);
      setName('');
      setRate('');
    }
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!user || !name.trim() || rate === '') {
      toast({ variant: 'destructive', title: 'Invalid input', description: 'Please provide a name and a rate.' });
      return;
    }
    
    try {
      if (typeToEdit) {
        await updateTaxType(typeToEdit.id, { name, rate: Number(rate) });
        onTaxTypesChange(taxTypes.map(t => t.id === typeToEdit.id ? { ...t, name, rate: Number(rate) } : t));
        toast({ title: 'Tax Type Updated' });
      } else {
        const newTaxType = await addTaxType({ name, rate: Number(rate), userId: user.uid });
        onTaxTypesChange([...taxTypes, newTaxType]);
        toast({ title: 'Tax Type Added' });
      }
      setIsFormOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };
  
  const handleConfirmDelete = async () => {
      if (!typeToDelete) return;
      try {
          await deleteTaxType(typeToDelete.id);
          onTaxTypesChange(taxTypes.filter(t => t.id !== typeToDelete.id));
          toast({ title: 'Tax Type Deleted' });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
      } finally {
          setTypeToDelete(null);
      }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Tax Types</DialogTitle>
            <DialogDescription>Add, edit, or delete the tax types for your invoices.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Button onClick={() => handleOpenForm()} className="mb-4 w-full"><Plus className="mr-2 h-4 w-4"/> Add New Tax Type</Button>
            <ScrollArea className="h-64 border rounded-md">
                <div className="p-2 space-y-1">
                {taxTypes.map(type => (
                    <div key={type.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                        <div>
                            <p className="font-medium text-sm">{type.name}</p>
                            <p className="text-xs text-muted-foreground">{type.rate}%</p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleOpenForm(type)}><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setTypeToDelete(type)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
                </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Nested Dialog for Add/Edit Form */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-sm">
            <DialogHeader>
                <DialogTitle>{typeToEdit ? 'Edit Tax Type' : 'Add Tax Type'}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="tax-name">Tax Name</Label>
                    <Input id="tax-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., GST" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tax-rate">Rate (%)</Label>
                    <Input id="tax-rate" type="number" value={rate} onChange={(e) => setRate(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 5" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!typeToDelete} onOpenChange={() => setTypeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the "{typeToDelete?.name}" tax type. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
