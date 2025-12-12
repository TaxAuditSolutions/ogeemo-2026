
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoaderCircle, FileDown } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getTasksForUser, type Event as TaskEvent } from '@/services/project-service';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const formatTime = (totalSeconds: number) => {
  if (!totalSeconds) return '0h 0m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

interface TimeLogImportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contactId: string;
  onSave: (selectedEntries: TaskEvent[]) => void;
}

export function TimeLogImportDialog({ isOpen, onOpenChange, contactId, onSave }: TimeLogImportDialogProps) {
  const [entries, setEntries] = useState<TaskEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function loadEntries() {
      if (user && contactId && isOpen) {
        setIsLoading(true);
        try {
          const allTasks = await getTasksForUser(user.uid);
          const relevantEntries = allTasks.filter(
            (task) =>
              task.contactId === contactId &&
              task.isBillable &&
              (task.duration || 0) > 0
          );
          setEntries(relevantEntries);
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Failed to load time entries', description: error.message });
        } finally {
          setIsLoading(false);
        }
      }
    }
    loadEntries();
  }, [user, contactId, isOpen, toast]);

  const handleToggleSelect = (id: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedEntryIds.length === entries.length) {
      setSelectedEntryIds([]);
    } else {
      setSelectedEntryIds(entries.map((e) => e.id));
    }
  };

  const handleAddSelected = () => {
    const selectedEntries = entries.filter((entry) =>
      selectedEntryIds.includes(entry.id)
    );
    if (selectedEntries.length === 0) {
      toast({ variant: 'destructive', title: 'No entries selected' });
      return;
    }
    onSave(selectedEntries);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add from Time Log</DialogTitle>
          <DialogDescription>
            Select billable time entries to add to your invoice.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-96 border rounded-md">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEntryIds.length === entries.length && entries.length > 0}
                        onCheckedChange={handleToggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length > 0 ? (
                    entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedEntryIds.includes(entry.id)}
                            onCheckedChange={() => handleToggleSelect(entry.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {entry.start ? format(new Date(entry.start), 'PPP') : 'N/A'}
                        </TableCell>
                        <TableCell>{entry.title}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatTime(entry.duration || 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No billable time entries found for this client.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddSelected}>
            <FileDown className="mr-2 h-4 w-4" />
            Add Selected ({selectedEntryIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
