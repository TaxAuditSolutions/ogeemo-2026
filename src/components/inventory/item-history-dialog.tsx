
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Item as InventoryItem } from '@/services/inventory-service';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ItemHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: InventoryItem | null;
}

// Mock data for demonstration purposes
const mockHistory = [
    { type: 'Purchase', date: new Date(), quantityChange: 100, notes: 'Initial stock order' },
    { type: 'Sale', date: new Date(Date.now() - 86400000), quantityChange: -5, notes: 'Invoice #2024-031' },
    { type: 'Adjustment', date: new Date(Date.now() - 86400000 * 2), quantityChange: -1, notes: 'Internal use' },
    { type: 'Sale', date: new Date(Date.now() - 86400000 * 3), quantityChange: -10, notes: 'Invoice #2024-028' },
];

export function ItemHistoryDialog({ isOpen, onOpenChange, item }: ItemHistoryDialogProps) {
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
                        {mockHistory.map((entry, index) => (
                            <TableRow key={index}>
                                <TableCell>{format(entry.date, 'PP')}</TableCell>
                                <TableCell>{entry.type}</TableCell>
                                <TableCell className={cn("text-right font-mono", entry.quantityChange > 0 ? 'text-green-600' : 'text-red-600')}>
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
