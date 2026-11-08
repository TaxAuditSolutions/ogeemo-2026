'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  PAY_SCHEDULE_LABELS,
  adjacentPayPeriod,
  isStandardPeriod,
  lastCompletedPayPeriod,
  payPeriodContaining,
  type PeriodConfig,
} from '@/lib/payroll-periods';

interface PayPeriodPickerProps {
  config: PeriodConfig;
  /** True when the workspace has not saved a pay schedule yet. */
  isDefaultSchedule: boolean;
  startDate?: Date;
  endDate?: Date;
  onChange: (start: Date, end: Date) => void;
}

const longDate = (date: Date) => format(date, 'EEE, MMM d, yyyy');

function DateButton({ label, value, onPick, disabled }: { label: string; value?: Date; onPick: (d: Date) => void; disabled?: (d: Date) => boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, 'PPP') : 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CustomCalendar mode="single" selected={value} disabled={disabled} initialFocus onSelect={(d) => { if (d) { onPick(d); setOpen(false); } }} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Chooses the payroll period. By default it steps through the workspace's defined
 * pay periods (exact dates shown); custom dates remain available but are flagged,
 * because periods that do not follow the schedule can leave gaps or overlaps.
 */
export function PayPeriodPicker({ config, isDefaultSchedule, startDate, endDate, onChange }: PayPeriodPickerProps) {
  const [custom, setCustom] = useState(false);
  const scheduleWorks = !!payPeriodContaining(new Date(), config);
  const showCustom = custom || !scheduleWorks;
  const today = startOfDay(new Date());
  const standard = startDate && endDate ? isStandardPeriod(startDate, endDate, config) : false;
  const current = startDate && standard ? payPeriodContaining(startDate, config) : null;

  const step = (direction: 1 | -1) => {
    const next = current ? adjacentPayPeriod(current, direction, config) : null;
    if (next) onChange(next.start, next.end);
  };
  const useLastCompleted = () => {
    const last = lastCompletedPayPeriod(new Date(), config);
    if (last) onChange(last.start, last.end);
    setCustom(false);
  };

  if (showCustom) {
    return (
      <div className="space-y-4">
        {!scheduleWorks && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            No pay schedule is set up yet. <Link href="/accounting/payroll/settings" className="underline font-medium">Set it in Payroll Settings</Link> so periods line up, or pick dates below.
          </p>
        )}
        <DateButton label="Start of Payroll Period" value={startDate} onPick={(d) => onChange(d, endDate && endDate >= d ? endDate : d)} />
        <DateButton label="End of Payroll Period" value={endDate} disabled={(d) => (startDate ? d < startDate : false)} onPick={(d) => startDate && onChange(startDate, d)} />
        {scheduleWorks && (
          <>
            <p className="text-xs text-muted-foreground">Custom dates may not match your {PAY_SCHEDULE_LABELS[config.paySchedule].split(' (')[0].toLowerCase()} pay periods.</p>
            <Button variant="outline" size="sm" onClick={useLastCompleted}>Use my pay schedule</Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isDefaultSchedule && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Using a default {config.paySchedule} schedule. <Link href="/accounting/payroll/settings" className="underline font-medium">Confirm it in Payroll Settings</Link>.
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => step(-1)} disabled={!current} title="Previous pay period"><ChevronLeft className="h-4 w-4" /></Button>
        <div className="flex-1 rounded-md border bg-muted/30 p-2 text-center">
          <p className="text-sm font-semibold">{current ? current.label : 'Choose a pay period'}</p>
          {startDate && endDate && <p className="text-[11px] text-muted-foreground">{longDate(startDate)} to {longDate(endDate)}</p>}
        </div>
        <Button variant="outline" size="icon" onClick={() => step(1)} disabled={!current} title="Next pay period"><ChevronRight className="h-4 w-4" /></Button>
      </div>
      {endDate && endDate >= today && (
        <p className="text-xs text-amber-700">This period has not finished yet, so some time may still be missing.</p>
      )}
      {startDate && endDate && !standard && (
        <p className="text-xs text-amber-700">These dates are not a whole pay period of your schedule.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={useLastCompleted}>Last completed period</Button>
        <Button variant="ghost" size="sm" onClick={() => setCustom(true)}>Use custom dates</Button>
      </div>
    </div>
  );
}
