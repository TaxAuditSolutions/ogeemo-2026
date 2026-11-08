'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, User } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { parseLedgerDate } from '@/lib/ledger-date';
import { format } from 'date-fns';
import type { PayrollRunDetail, SavedPayrollRun } from '@/services/payroll-service';

/** A saved day key (2026-01-15) as "Jan 15, 2026", without the time zone shifting it a day. */
export const formatDay = (key: string) => {
  const date = parseLedgerDate(key);
  return date ? format(date, 'LLL dd, y') : key;
};

interface DialogProps {
  run: SavedPayrollRun | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RunDetailsDialog({ run, open, onOpenChange }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payroll Details</DialogTitle>
          <DialogDescription>Summary for the pay period ending {run ? formatDay(run.periodEnd) : ''}.</DialogDescription>
        </DialogHeader>
        {run && (
          <div className="py-4 space-y-3">
            <div className="flex justify-between text-sm"><span>Gross pay</span><span className="font-mono">{formatCurrency(run.totalGrossPay)}</span></div>
            <div className="flex justify-between text-sm">
              <span>Deductions{run.deductionRatePercent !== undefined ? ` (estimated at ${run.deductionRatePercent}%)` : ''}</span>
              <span className="font-mono">({formatCurrency(run.totalDeductions)})</span>
            </div>
            <div className="flex justify-between text-lg font-semibold"><span>Net pay</span><span className="font-mono">{formatCurrency(run.totalNetPay)}</span></div>
            <h4 className="font-medium pt-2">Employee Payments</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.details.map((detail, index) => (
                  <TableRow key={`${detail.employeeId}-${index}`}>
                    <TableCell>{detail.employeeName}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(detail.grossPay)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(detail.netPay)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RunStubsDialog({ run, open, onOpenChange, onViewStub }: DialogProps & { onViewStub: (detail: PayrollRunDetail) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Pay Stubs</DialogTitle>
          <DialogDescription>Select an employee to view their pay stub for this period.</DialogDescription>
        </DialogHeader>
        {run && (
          <div className="py-4 space-y-2">
            {run.details.map((detail, index) => (
              <div key={`${detail.employeeId}-${index}`} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{detail.employeeName}</span>
                </div>
                <Button variant="secondary" onClick={() => onViewStub(detail)}><FileText className="mr-2 h-4 w-4" /> View Stub</Button>
              </div>
            ))}
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
