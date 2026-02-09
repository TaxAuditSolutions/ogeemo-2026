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
import { type Worker } from '@/services/payroll-service';
import { cn } from '@/lib/utils';

interface MergeWorkerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sourceWorker: Worker | null;
  allWorkers: Worker[];
  onMergeConfirm: (sourceWorkerId: string, masterWorkerId: string) => void;
}

export default function MergeWorkerDialog({ isOpen, onOpenChange, sourceWorker, allWorkers, onMergeConfirm }: MergeWorkerDialogProps) {
  const [masterWorkerId, setMasterWorkerId] = useState<string | null>(null);
  const [isConfirmAlertOpen, setIsConfirmAlertOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Guard against null source worker to prevent "reading name of null" errors
  if (!sourceWorker) return null;

  const masterWorker = allWorkers.find(c => c.id === masterWorkerId);

  const handleMergeClick = () => {
    if (masterWorkerId) {
      setIsConfirmAlertOpen(true);
    }
  };
  
  const handleConfirmAction = () => {
    if (masterWorkerId) {
        onMergeConfirm(sourceWorker.id, masterWorkerId);
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
                        Merge Worker Record
                    </DialogTitle>
                    <DialogDescription>
                        Merge the duplicate worker into a master worker record.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="space-y-2">
                        <Label>Worker to be Merged & Deleted:</Label>
                        <div className="p-3 border rounded-md bg-muted">
                            <p className="font-semibold">{sourceWorker.name}</p>
                            <p className="text-sm text-muted-foreground">{sourceWorker.email}</p>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Merge into Master Worker Record:</Label>
                         <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    <span className="truncate">{masterWorker ? masterWorker.name : "Select a master worker..."}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search workers..." />
                                    <CommandList>
                                        <CommandEmpty>No worker found.</CommandEmpty>
                                        <CommandGroup>
                                            {allWorkers.filter(c => c.id !== sourceWorker.id).map((c) => (
                                                <CommandItem key={c.id} value={c.name} onSelect={() => { setMasterWorkerId(c.id); setIsPopoverOpen(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", masterWorkerId === c.id ? "opacity-100" : "opacity-0")} />
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
                                This action will reassign all time logs and leave requests from "{sourceWorker.name}" to "{masterWorker?.name || 'the master worker'}" and then permanently delete the duplicate record for "{sourceWorker.name}".
                            </p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleMergeClick} disabled={!masterWorkerId}>Merge Worker</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={isConfirmAlertOpen} onOpenChange={setIsConfirmAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to merge and permanently delete <strong className="font-bold">{sourceWorker.name}</strong> into <strong className="font-bold">{masterWorker?.name}</strong>. This action cannot be undone.
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
