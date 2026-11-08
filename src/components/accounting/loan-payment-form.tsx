'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Loan } from '@/core/accounting-service';
import { validateLoanPayment } from '@/lib/loan-payments';

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

interface LoanPaymentFormProps {
  loan: Loan;
  date: string;
  total: string;
  interest: string;
  suggestedInterest: number;
  onDate: (value: string) => void;
  onTotal: (value: string) => void;
  onInterest: (value: string) => void;
}

/** The three payment fields plus a live preview of how the payment splits and what the balance becomes. */
export function LoanPaymentForm({ loan, date, total, interest, suggestedInterest, onDate, onTotal, onInterest }: LoanPaymentFormProps) {
  const preview = validateLoanPayment({ balance: loan.outstandingBalance, date, total, interest });
  const verb = loan.loanType === 'payable' ? 'paid' : 'received';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="loan-pay-date">Date</Label>
          <Input id="loan-pay-date" type="date" value={date} onChange={(e) => onDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="loan-pay-total">Amount {verb}</Label>
          <Input id="loan-pay-total" type="number" min={0} step="0.01" value={total} onChange={(e) => onTotal(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="loan-pay-interest">Interest in it</Label>
          <Input id="loan-pay-interest" type="number" min={0} step="0.01" value={interest} onChange={(e) => onInterest(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {suggestedInterest > 0 ? `One month of interest at ${loan.interestRate}% is about ${money(suggestedInterest)}. ` : ''}
        Only the principal lowers the balance; the interest is recorded in your ledger as {loan.loanType === 'payable' ? 'an expense' : 'income'}.
      </p>
      {preview.error === null ? (
        <p className="rounded-md border bg-muted/30 p-2 text-sm">
          {money(preview.principal)} principal + {money(preview.interest)} interest. New balance:{' '}
          <strong>{money(Math.max(0, loan.outstandingBalance - preview.principal))}</strong>
        </p>
      ) : total !== '' ? (
        <p className="text-sm text-destructive">{preview.error}</p>
      ) : null}
    </div>
  );
}
