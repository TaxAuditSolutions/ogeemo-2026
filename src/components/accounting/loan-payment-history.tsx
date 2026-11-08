'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { paymentTotals, type LoanPayment } from '@/lib/loan-payments';
import { displayDay } from '@/lib/payables';

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

interface LoanPaymentHistoryProps {
  payments: readonly LoanPayment[] | undefined;
  removingId: string | null;
  onRemove: (paymentId: string) => void;
}

/** The payments made on a loan, newest first, with a total of principal and interest and a remove button each. */
export function LoanPaymentHistory({ payments, removingId, onRemove }: LoanPaymentHistoryProps) {
  const totals = paymentTotals(payments);
  const list = [...(payments ?? [])].reverse();

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Payment history ({money(totals.principal)} principal, {money(totals.interest)} interest so far)
      </p>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No payments recorded yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {list.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 p-2 text-sm">
              <span>
                {displayDay(p.date, (d) => format(d, 'PP'))}
                <span className="ml-2 text-muted-foreground">
                  {money(p.principal)} + {money(p.interest)} interest
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                disabled={removingId === p.id}
                onClick={() => onRemove(p.id)}
                title="Remove this payment"
              >
                {removingId === p.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
