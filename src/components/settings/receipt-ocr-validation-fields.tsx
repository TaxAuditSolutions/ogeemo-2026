'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  OCR_DUPLICATE_MODES,
  RECEIPT_FIELD_OPTIONS,
  RECEIPT_LEDGER_LABELS,
  RECEIPT_LEDGER_TYPES,
  type ReceiptLedgerType,
  type ReceiptOcrSettings,
  type ReceiptRequiredField,
} from '@/lib/receipt-ocr-options';
import { Field, NumberInput, stopEnter, type RulesFieldsProps } from './receipt-ocr-rules-common';

/** Defaults applied to every new receipt. */
export function DefaultsFields({ value, onChange, disabled, categoryNames }: RulesFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Default ledger type">
        <Select value={value.defaultLedgerType} disabled={disabled} onValueChange={(t) => onChange({ defaultLedgerType: t as ReceiptLedgerType })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {RECEIPT_LEDGER_TYPES.map((t) => <SelectItem key={t} value={t}>{RECEIPT_LEDGER_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Default category" hint="Leave blank to choose a category for each receipt.">
        <Input
          list="receipt-category-names"
          value={value.defaultCategory}
          maxLength={120}
          disabled={disabled}
          onKeyDown={stopEnter}
          onChange={(e) => onChange({ defaultCategory: e.target.value })}
        />
        <datalist id="receipt-category-names">
          {categoryNames.map((name) => <option key={name} value={name} />)}
        </datalist>
      </Field>
    </div>
  );
}

/** What must be filled in, how amounts and dates are checked, and how duplicates are caught. */
export function ValidationFields({ value, onChange, disabled, taxRatesText, onTaxRatesText }: RulesFieldsProps) {
  const toggleRequired = (field: ReceiptRequiredField, checked: boolean) => {
    const next = new Set(value.requiredFields);
    if (checked) next.add(field);
    else next.delete(field);
    onChange({ requiredFields: RECEIPT_FIELD_OPTIONS.map((o) => o.value).filter((f) => next.has(f)) });
  };

  return (
    <div className="space-y-4">
      <Field label="Required before a receipt can be approved or posted">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {RECEIPT_FIELD_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.requiredFields.includes(option.value)}
                disabled={disabled}
                onCheckedChange={(checked) => toggleRequired(option.value, checked === true)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Amount tolerance" hint="Net + tax may differ from the total by up to this amount.">
          <NumberInput value={value.amountTolerance} min={0} max={10} step={0.01} disabled={disabled} onChange={(amountTolerance) => onChange({ amountTolerance })} />
        </Field>
        <Field label="Expected tax rates (%)" hint="Comma separated, for example 5, 13, 14.975. Other rates are flagged. Leave blank to skip.">
          <Input value={taxRatesText} disabled={disabled} onKeyDown={stopEnter} onChange={(e) => onTaxRatesText(e.target.value)} placeholder="5, 13" />
        </Field>
        <Field label="Flag dates in the future by more than (days)">
          <NumberInput value={value.maxFutureDays} min={0} max={365} disabled={disabled} onChange={(maxFutureDays) => onChange({ maxFutureDays })} />
        </Field>
        <Field label="Flag dates older than (days)" hint="0 means no limit.">
          <NumberInput value={value.maxAgeDays} min={0} max={3650} disabled={disabled} onChange={(maxAgeDays) => onChange({ maxAgeDays })} />
        </Field>
        <Field label="Flag receipts above this total" hint="0 means no limit.">
          <NumberInput value={value.maxReceiptAmount} min={0} max={10000000} step={0.01} disabled={disabled} onChange={(maxReceiptAmount) => onChange({ maxReceiptAmount })} />
        </Field>
        <Field label="Duplicate detection">
          <Select value={value.duplicateMode} disabled={disabled} onValueChange={(m) => onChange({ duplicateMode: m as ReceiptOcrSettings['duplicateMode'] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OCR_DUPLICATE_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <p className="text-xs text-muted-foreground">
        Whether these checks only warn or also stop a receipt from being posted is set above under Record keeping.
      </p>
    </div>
  );
}
