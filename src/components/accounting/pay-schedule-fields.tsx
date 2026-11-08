'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { PAY_SCHEDULES, PAY_SCHEDULE_LABELS, WEEKDAY_LABELS, parseDateKey, type PaySchedule } from '@/lib/payroll-periods';
import type { PayrollSettings } from '@/lib/payroll-settings';

interface PayScheduleFieldsProps {
  draft: PayrollSettings;
  disabled: boolean;
  onChange: (patch: Partial<PayrollSettings>) => void;
}

/** Pay schedule picker plus the one extra input each schedule needs (weekday or bi-weekly anchor date). */
export function PayScheduleFields({ draft, disabled, onChange }: PayScheduleFieldsProps) {
  const anchorDate = parseDateKey(draft.biweeklyAnchor);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="paySchedule">Pay schedule</Label>
        <Select value={draft.paySchedule} disabled={disabled} onValueChange={(value) => onChange({ paySchedule: value as PaySchedule })}>
          <SelectTrigger id="paySchedule"><SelectValue placeholder="Select a pay schedule" /></SelectTrigger>
          <SelectContent>
            {PAY_SCHEDULES.map((schedule) => (
              <SelectItem key={schedule} value={schedule}>{PAY_SCHEDULE_LABELS[schedule]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {draft.paySchedule === 'weekly' && (
        <div className="space-y-2">
          <Label htmlFor="periodStartDay">Each week starts on</Label>
          <Select value={String(draft.periodStartDay)} disabled={disabled} onValueChange={(value) => onChange({ periodStartDay: Number(value) })}>
            <SelectTrigger id="periodStartDay"><SelectValue /></SelectTrigger>
            <SelectContent>
              {WEEKDAY_LABELS.map((day, index) => (
                <SelectItem key={day} value={String(index)}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {draft.paySchedule === 'bi-weekly' && (
        <div className="space-y-2">
          <Label htmlFor="biweeklyAnchor">First day of any one of your pay periods</Label>
          <Input
            id="biweeklyAnchor"
            type="date"
            disabled={disabled}
            value={draft.biweeklyAnchor ?? ''}
            onChange={(e) => onChange({ biweeklyAnchor: parseDateKey(e.target.value) ? e.target.value : null })}
          />
          <p className="text-xs text-muted-foreground">
            Every other period is 14 days from this date, so they stay in step.
            {anchorDate ? ` That day is a ${format(anchorDate, 'EEEE')}.` : ''}
          </p>
        </div>
      )}
    </>
  );
}
