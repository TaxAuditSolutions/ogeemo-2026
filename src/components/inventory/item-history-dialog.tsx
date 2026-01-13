
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Item as InventoryItem, type InventoryLog } from '@/services/inventory-service';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ItemHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: InventoryItem | null;
  logs: InventoryLog[];
}

export function ItemHistoryDialog({ isOpen, onOpenChange, item, logs }: ItemHistoryDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transaction History: {item?.name}</DialogTitle>
          <DialogDescription>
            A log of all stock changes for this item.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <ScrollArea className="h-72 w-full rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Change</TableHead>
                            <TableHead>Notes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((entry) => (
                            <TableRow key={entry.id}>
                                <TableCell>{format(entry.timestamp, 'PP')}</TableCell>
                                <TableCell>{entry.reason}</TableCell>
                                <TableCell className={cn("text-right font-mono", entry.quantityChange >= 0 ? 'text-green-600' : 'text-red-600')}>
                                    {entry.quantityChange > 0 ? '+' : ''}{entry.quantityChange}
                                </TableCell>
                                <TableCell>{entry.notes}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
