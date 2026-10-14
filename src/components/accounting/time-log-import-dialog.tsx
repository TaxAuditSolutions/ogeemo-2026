
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoaderCircle, FileDown } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getTasksForUser, type Event as TaskEvent } from '@/services/project-service';
import { getTimeLogs, type TimeLog } from '@/services/timelog-service';
import { getInvoices, type Invoice } from '@/core/accounting-service';
import { isScheduledPlaceholder } from '@/lib/duration-source';
import {
  isEligibleForBilling,
  type InvoiceableEntry,
  type EntryRef,
  entryRefKey,
} from '@/lib/billing-eligibility';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const formatTime = (totalSeconds: number) => {
  if (!totalSeconds) return '0h 0m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

/** Normalizes a timeLogs-collection doc (manual / field-app log). */
function fromTimeLog(tl: TimeLog): InvoiceableEntry {
  return {
    id: tl.id,
    source: 'log',
    contactId: tl.contactId || null,
    title: tl.subject || 'Work Session',
    description: tl.notes || '',
    startTime: tl.startTime instanceof Date ? tl.startTime : new Date(tl.startTime),
    durationSeconds: tl.durationSeconds || 0,
    isBillable: tl.isBillable || false,
    billableRate: tl.billableRate || 0,
    scheduledOnly: false, // timeLogs are recorded work by definition
    billedInvoiceId: tl.billedInvoiceId || null,
  };
}

/** Normalizes a tasks-collection doc (Activity Manager event). */
function fromTaskEvent(t: TaskEvent): InvoiceableEntry {
  return {
    id: t.id,
    source: 'event',
    contactId: t.contactId || null,
    title: t.title,
    description: t.description || '',
    startTime: t.start ? new Date(t.start) : null,
    durationSeconds: t.duration || 0,
    isBillable: t.isBillable || false,
    billableRate: t.billableRate || 0,
    scheduledOnly: isScheduledPlaceholder(t),
    billedInvoiceId: t.billedInvoiceId || null,
  };
}

interface TimeLogImportDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contactId: string;
  /** Called with the chosen entries - both underlying collections, normalized. */
  onSave: (selectedEntries: InvoiceableEntry[]) => void;
  /** Entries to pre-check (Time Log -> Invoice handoff); only eligible ones apply. */
  preselectedEntryIds?: EntryRef[];
}

export function TimeLogImportDialog({ isOpen, onOpenChange, contactId, onSave, preselectedEntryIds }: TimeLogImportDialogProps) {
  const [entries, setEntries] = useState<InvoiceableEntry[]>([]);
  const [invoiceNumbers, setInvoiceNumbers] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  // Selection keys are `${source}:${id}` - task and timeLog ids live in
  // different collections and could theoretically collide.
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function loadEntries() {
      if (user && contactId && isOpen) {
        setIsLoading(true);
        try {
          const [allTasks, allLogs, invoices] = await Promise.all([
            getTasksForUser(user.uid),
            getTimeLogs().catch(() => [] as TimeLog[]),
            getInvoices(user.uid).catch(() => [] as Invoice[]),
          ]);
          const relevant = [
            ...allTasks.filter((t) => t.contactId === contactId).map(fromTaskEvent),
            ...allLogs.filter((l) => l.contactId === contactId).map(fromTimeLog),
          ]
            // Offer billable worked entries; already-invoiced ones stay visible
            // (disabled, labelled) so the record is recognized, not duplicated.
            .filter((e) => e.isBillable && e.durationSeconds > 0 && !!e.contactId && !e.scheduledOnly)
            .sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0));
          setEntries(relevant);
          setInvoiceNumbers(new Map(invoices.map((inv) => [inv.id, inv.invoiceNumber])));
          if (preselectedEntryIds && preselectedEntryIds.length > 0) {
            const wanted = new Set(preselectedEntryIds.map(entryRefKey));
            setSelectedKeys(relevant.filter((e) => isEligibleForBilling(e) && wanted.has(entryRefKey(e))).map(entryRefKey));
          } else {
            setSelectedKeys([]);
          }
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Failed to load time entries', description: error.message });
        } finally {
          setIsLoading(false);
        }
      }
    }
    loadEntries();
  }, [user, contactId, isOpen, toast, preselectedEntryIds]);

  const selectableEntries = useMemo(() => entries.filter(isEligibleForBilling), [entries]);

  const handleToggleSelect = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedKeys.length === selectableEntries.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(selectableEntries.map(entryRefKey));
    }
  };

  const handleAddSelected = () => {
    const selectedEntries = entries.filter(
      (entry) => selectedKeys.includes(entryRefKey(entry)) && isEligibleForBilling(entry)
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
                        checked={selectedKeys.length > 0 && selectedKeys.length === selectableEntries.length}
                        onCheckedChange={handleToggleSelectAll}
                        disabled={selectableEntries.length === 0}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length > 0 ? (
                    entries.map((entry) => {
                      const key = entryRefKey(entry);
                      const eligible = isEligibleForBilling(entry);
                      return (
                        <TableRow key={key} className={eligible ? undefined : 'opacity-60'}>
                          <TableCell>
                            <Checkbox
                              checked={selectedKeys.includes(key)}
                              onCheckedChange={() => handleToggleSelect(key)}
                              disabled={!eligible}
                            />
                          </TableCell>
                          <TableCell>
                            {entry.startTime ? format(entry.startTime, 'PPP') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className="line-clamp-1">{entry.title}</span>
                            {!eligible && entry.billedInvoiceId && (
                              <Badge variant="secondary" className="ml-2 text-[9px]">
                                Invoiced {invoiceNumbers.get(entry.billedInvoiceId) || 'INV'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatTime(entry.durationSeconds)}
                          </TableCell>
                        </TableRow>
                      );
                    })
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
          <Button onClick={handleAddSelected} disabled={selectedKeys.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            Add Selected ({selectedKeys.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
