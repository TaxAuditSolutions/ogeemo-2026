'use client';

import React from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isValidDeductionPercent } from '@/lib/payroll-deductions';

interface DeductionRateFieldProps {
  value: string;
  defaultPercent: number;
  onChange: (value: string) => void;
}

/** Per-run deduction percentage, starting from the workspace default and adjustable before submitting. */
export function DeductionRateField({ value, defaultPercent, onChange }: DeductionRateFieldProps) {
  const valid = isValidDeductionPercent(value);
  const differs = valid && parseFloat(value) !== defaultPercent;

  return (
    <div className="space-y-2">
      <Label htmlFor="runDeductionRate">Deductions (% of gross pay)</Label>
      <div className="flex items-center gap-2">
        <Input
          id="runDeductionRate"
          type="number"
          min={0}
          max={100}
          step="0.01"
          className="max-w-[8rem]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {differs && (
          <button type="button" className="text-xs underline text-muted-foreground" onClick={() => onChange(String(defaultPercent))}>
            Reset to {defaultPercent}%
          </button>
        )}
      </div>
      {!valid ? (
        <p className="text-xs text-destructive">Enter a percentage from 0 to 100.</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          An estimate of tax, EI, CPP and benefits for this run only. Change the default in{' '}
          <Link href="/accounting/payroll/settings" className="underline">Payroll Settings</Link>.
        </p>
      )}
    </div>
  );
}
