'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoaderCircle, Save } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { usePayrollSettings } from '@/hooks/use-payroll-settings';
import { PayPeriodPreview } from '@/components/accounting/pay-period-preview';
import { PayScheduleFields } from '@/components/accounting/pay-schedule-fields';
import { validatePayrollSettings, type PayrollSettings } from '@/lib/payroll-settings';
import { DEFAULT_DEDUCTION_RATE_PERCENT } from '@/lib/payroll-deductions';

/**
 * Payroll Settings card: pay schedule (with the exact period dates it produces)
 * and the default deduction rate. Saved on the organization, so everyone in the
 * workspace sees the same periods. Only administrators can change it.
 */
export function PayScheduleCard() {
  const { accessLevel } = useAuth();
  const { toast } = useToast();
  const { settings, isDefault, isLoading, loadError, save } = usePayrollSettings();
  const isAdmin = accessLevel === 'org_admin' || accessLevel === 'super_admin';

  const [draft, setDraft] = useState<PayrollSettings>(settings);
  const [rateText, setRateText] = useState(String(settings.deductionRatePercent));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(settings);
    setRateText(String(settings.deductionRatePercent));
  }, [settings]);

  const effective: PayrollSettings = useMemo(() => {
    const parsed = rateText.trim() === '' ? NaN : parseFloat(rateText);
    return { ...draft, deductionRatePercent: parsed };
  }, [draft, rateText]);

  const problem = validatePayrollSettings(effective);

  const handleSave = async () => {
    if (problem) {
      toast({ variant: 'destructive', title: 'Check your settings', description: problem });
      return;
    }
    setIsSaving(true);
    try {
      await save(effective);
      toast({ title: 'Payroll settings saved', description: 'Run Payroll will now use this pay schedule and deduction rate.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: error?.message || 'Only a workspace administrator can change these settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" /> Loading pay schedule...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-primary/5 border-b">
        <CardTitle className="text-base">Pay Periods & Deductions</CardTitle>
        <CardDescription>
          Pay periods follow your schedule, so each one starts the day after the last one ends. Run Payroll uses these.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
        {isDefault && !loadError && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            No pay schedule has been saved yet. Choose yours and save, so every payroll run uses the same periods.
          </p>
        )}
        {!isAdmin && <p className="text-sm text-muted-foreground">Only a workspace administrator can change these settings.</p>}

        <PayScheduleFields draft={draft} disabled={!isAdmin} onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))} />
        <PayPeriodPreview config={effective} />

        <div className="space-y-2">
          <Label htmlFor="deductionRate">Payroll deductions (% of gross pay)</Label>
          <Input
            id="deductionRate"
            type="number"
            min={0}
            max={100}
            step="0.01"
            className="max-w-[10rem]"
            disabled={!isAdmin}
            value={rateText}
            onChange={(e) => setRateText(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            An estimate of tax, EI, CPP and benefits. The default is {DEFAULT_DEDUCTION_RATE_PERCENT}%. You can still change it for a single run on Run Payroll.
          </p>
        </div>
      </CardContent>
      {isAdmin && (
        <CardFooter className="justify-end border-t pt-4">
          <Button onClick={handleSave} disabled={isSaving || !!problem}>
            {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save pay schedule
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
