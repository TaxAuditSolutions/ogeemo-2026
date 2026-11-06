'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ReceiptOcrSettings } from '@/lib/receipt-ocr-options';

/** Props shared by every section of the OCR rules form. */
export interface RulesFieldsProps {
  value: ReceiptOcrSettings;
  onChange: (patch: Partial<ReceiptOcrSettings>) => void;
  disabled: boolean;
  /** Raw text of the expected tax rates box (kept as typed until saved). */
  taxRatesText: string;
  onTaxRatesText: (text: string) => void;
  categoryNames: string[];
}

export const stopEnter = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') e.preventDefault();
};

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  disabled,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled: boolean;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <Input
      type="number"
      value={Number.isFinite(value) ? value : ''}
      min={min}
      max={max}
      step={step ?? 1}
      disabled={disabled}
      onKeyDown={stopEnter}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
    />
  );
}
