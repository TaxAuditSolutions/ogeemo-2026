
'use client';

import React, { useState } from 'react';
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GitMerge, ChevronsUpDown, Check, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { type Contact } from '@/data/contacts';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

interface MergeContactsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sourceContact: Contact;
  allContacts: Contact[];
  onMergeConfirm: (sourceContactId: string, masterContactId: string) => void;
}

export default function MergeContactsDialog({ isOpen, onOpenChange, sourceContact, allContacts, onMergeConfirm }: MergeContactsDialogProps) {
  const [masterContactId, setMasterContactId] = useState<string | null>(null);
  const [isConfirmAlertOpen, setIsConfirmAlertOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const masterContact = allContacts.find(c => c.id === masterContactId);

  const handleMergeClick = () => {
    if (masterContactId) {
      setIsConfirmAlertOpen(true);
    }
  };
  
  const handleConfirmAction = () => {
    if (masterContactId) {
        onMergeConfirm(sourceContact.id, masterContactId);
    }
    setIsConfirmAlertOpen(false);
    onOpenChange(false);
  };

  return (
    <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitMerge className="h-5 w-5"/>
                        Merge Contact
                    </DialogTitle>
                    <DialogDescription>
                        Merge the duplicate contact into a master contact record.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="space-y-2">
                        <Label>Contact to be Merged & Deleted:</Label>
                        <div className="p-3 border rounded-md bg-muted">
                            <p className="font-semibold">{sourceContact.name}</p>
                            <p className="text-sm text-muted-foreground">{sourceContact.email}</p>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Merge into Master Contact:</Label>
                         <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    <span className="truncate">{masterContact ? masterContact.name : "Select a master contact..."}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search contacts..." />
                                    <CommandList>
                                        <CommandEmpty>No contact found.</CommandEmpty>
                                        <CommandGroup>
                                            {allContacts.filter(c => c.id !== sourceContact.id).map((c) => (
                                                <CommandItem key={c.id} value={c.name} onSelect={() => { setMasterContactId(c.id); setIsPopoverOpen(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", masterContactId === c.id ? "opacity-100" : "opacity-0")} />
                                                    {c.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex items-start gap-3 p-3 border border-destructive/50 bg-destructive/10 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
                        <div>
                            <h4 className="font-semibold text-destructive">Important Warning</h4>
                            <p className="text-xs text-destructive/90">
                                This action will permanently delete the contact "{sourceContact.name}". In this version, only the contact details will be merged. Any associated items like tasks, projects, or invoices will <strong className="font-bold">NOT</strong> be automatically reassigned.
                            </p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleMergeClick} disabled={!masterContactId}>Merge Contact</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={isConfirmAlertOpen} onOpenChange={setIsConfirmAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to merge and permanently delete <strong className="font-bold">{sourceContact.name}</strong> into <strong className="font-bold">{masterContact?.name}</strong>. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmAction} className="bg-destructive hover:bg-destructive/90">Yes, Merge and Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
