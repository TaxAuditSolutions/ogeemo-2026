'use client';

import React, { useMemo } from 'react';
import {
  adjacentPayPeriod,
  lastCompletedPayPeriod,
  payPeriodContaining,
  type PeriodConfig,
} from '@/lib/payroll-periods';

/** Shows the last completed, current and next pay period (exact dates) for a pay schedule. */
export function PayPeriodPreview({ config }: { config: PeriodConfig }) {
  const preview = useMemo(() => {
    const today = new Date();
    const current = payPeriodContaining(today, config);
    if (!current) return null;
    return {
      previous: lastCompletedPayPeriod(today, config),
      current,
      next: adjacentPayPeriod(current, 1, config),
    };
  }, [config]);

  const line = (label: string, period: { label: string } | null | undefined) => (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{period ? period.label : 'Enter the date above'}</span>
    </div>
  );

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your pay periods</p>
      {line('Last completed', preview?.previous)}
      {line('Current', preview?.current)}
      {line('Next', preview?.next)}
    </div>
  );
}
