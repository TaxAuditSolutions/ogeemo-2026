'use client';

import * as React from 'react';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { archiveStatusLabel } from '@/lib/receipt-archive-utils';
import type { ReceiptStagingItem } from '@/services/receipt-staging-service';

function formatAmount(value?: number): string {
  return typeof value === 'number' ? value.toLocaleString(undefined, { style: 'currency', currency: 'CAD' }) : '-';
}

interface ReceiptArchiveTableProps {
  receipts: ReceiptStagingItem[];
  onView: (receipt: ReceiptStagingItem) => void;
}

/** Results table for the Receipt Archive. A document number opens the stored file when there is one. */
export function ReceiptArchiveTable({ receipts, onView }: ReceiptArchiveTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document #</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">File</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {receipts.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">
              {item.storagePath ? (
                <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => onView(item)}>
                  {item.auditReferenceId || 'View'}
                </button>
              ) : (
                item.auditReferenceId || '-'
              )}
            </TableCell>
            <TableCell className="text-xs">{item.transactionDate || '-'}</TableCell>
            <TableCell className="font-medium">{item.proposedCompany || item.merchantName || item.fileName || '-'}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{item.proposedCategory || '-'}</TableCell>
            <TableCell className="text-right font-mono">{formatAmount(item.totalAmount)}</TableCell>
            <TableCell>
              <Badge variant={item.status === 'posted' ? 'default' : 'secondary'}>{archiveStatusLabel(item.status)}</Badge>
            </TableCell>
            <TableCell className="text-right">
              {item.storagePath ? (
                <Button size="sm" variant="ghost" onClick={() => onView(item)}>
                  <FileText className="mr-1 h-4 w-4" /> View
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Not stored</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
