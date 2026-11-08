'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { recordLoanPayment, removeLoanPaymentRecord, type Loan } from '@/core/accounting-service';
import { isPaidOff, suggestMonthlyInterest, validateLoanPayment } from '@/lib/loan-payments';
import { todayDateKey } from '@/lib/ledger-date';
import { LoanPaymentForm } from '@/components/accounting/loan-payment-form';
import { LoanPaymentHistory } from '@/components/accounting/loan-payment-history';

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

interface LoanPaymentDialogProps {
  loan: Loan | null;
  onOpenChange: (open: boolean) => void;
  /** Called after a payment is saved or removed so the list can reload from the saved loan. */
  onChanged: () => void;
}

/** Records a payment on a loan (principal lowers the balance, interest goes to the ledger) and shows its history. */
export function LoanPaymentDialog({ loan, onOpenChange, onChanged }: LoanPaymentDialogProps) {
  const { toast } = useToast();
  const [date, setDate] = useState(todayDateKey());
  const [total, setTotal] = useState('');
  const [interest, setInterest] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const suggested = useMemo(() => (loan ? suggestMonthlyInterest(loan.outstandingBalance, loan.interestRate ?? 0) : 0), [loan]);

  useEffect(() => {
    if (!loan) return;
    setDate(todayDateKey());
    setTotal(loan.monthlyPayment ? String(loan.monthlyPayment) : '');
    setInterest(suggested > 0 ? suggested.toFixed(2) : '');
  }, [loan, suggested]);

  if (!loan) return null;
  const paidOff = isPaidOff(loan.outstandingBalance);

  const handleSave = async () => {
    if (isSaving) return;
    const check = validateLoanPayment({ balance: loan.outstandingBalance, date, total, interest });
    if (check.error !== null) {
      toast({ variant: 'destructive', title: 'Check the payment', description: check.error });
      return;
    }
    setIsSaving(true);
    try {
      const result = await recordLoanPayment(loan.id, { date, total, interest });
      toast({
        title: 'Payment recorded',
        description: `Balance is now ${money(result.outstandingBalance)}.${check.interest > 0 ? ' The interest was added to your ledger.' : ''}`,
      });
      setTotal('');
      onChanged();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Payment failed', description: error?.message || 'The payment was not saved.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (paymentId: string) => {
    if (removingId) return;
    if (!window.confirm('Remove this payment? Its principal goes back onto the balance and its interest entry is removed from the ledger.')) return;
    setRemovingId(paymentId);
    try {
      const result = await removeLoanPaymentRecord(loan.id, paymentId);
      toast({ title: 'Payment removed', description: `Balance is now ${money(result.outstandingBalance)}.` });
      onChanged();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not remove', description: error?.message || 'The payment was not removed.' });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={!!loan} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payments - {loan.counterparty}</DialogTitle>
          <DialogDescription>
            Balance owing: <strong>{money(loan.outstandingBalance)}</strong>
            {paidOff && ' - paid off'}
          </DialogDescription>
        </DialogHeader>

        {!paidOff && (
          <LoanPaymentForm
            loan={loan}
            date={date}
            total={total}
            interest={interest}
            suggestedInterest={suggested}
            onDate={setDate}
            onTotal={setTotal}
            onInterest={setInterest}
          />
        )}

        <LoanPaymentHistory payments={loan.payments} removingId={removingId} onRemove={handleRemove} />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          {!paidOff && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />} Record payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
