'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MAX_TAX_CHOICES,
  TAX_CALCULATION_OPTIONS,
  type ReceiptTaxChoice,
  type TaxCalculation,
} from '@/lib/receipt-ocr-options';
import { Field, stopEnter, type RulesFieldsProps } from './receipt-ocr-rules-common';

const NO_DEFAULT = '__none__';

function newChoiceId(existing: readonly ReceiptTaxChoice[]): string {
  let n = existing.length + 1;
  while (existing.some((choice) => choice.id === `custom-${n}`)) n += 1;
  return `custom-${n}`;
}

/** How tax is worked out on receipts, the tax types a reviewer can choose from, and the default. */
export function TaxFields({ value, onChange, disabled }: RulesFieldsProps) {
  const choices = value.taxChoices;
  const update = (id: string, patch: Partial<ReceiptTaxChoice>) =>
    onChange({ taxChoices: choices.map((choice) => (choice.id === id ? { ...choice, ...patch } : choice)) });
  const remove = (id: string) =>
    onChange({
      taxChoices: choices.filter((choice) => choice.id !== id),
      defaultTaxChoice: value.defaultTaxChoice === id ? '' : value.defaultTaxChoice,
      vendorRules: value.vendorRules.map((rule) => (rule.taxChoice === id ? { ...rule, taxChoice: undefined } : rule)),
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="How tax is worked out"
          hint={
            value.taxCalculation === 'from_total'
              ? 'OCR reads only the total. The reviewer chooses a tax type and the tax is calculated from the total. The tax printed on the receipt is kept for comparison only.'
              : 'The net and tax printed on the receipt are used as OCR reads them.'
          }
        >
          <Select
            value={value.taxCalculation}
            disabled={disabled}
            onValueChange={(taxCalculation) => onChange({ taxCalculation: taxCalculation as TaxCalculation })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TAX_CALCULATION_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tax type new receipts start with" hint="Leave on “Choose each time” if your receipts use different taxes. A vendor rule overrides this.">
          <Select
            value={value.defaultTaxChoice || NO_DEFAULT}
            disabled={disabled || value.taxCalculation !== 'from_total'}
            onValueChange={(id) => onChange({ defaultTaxChoice: id === NO_DEFAULT ? '' : id })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DEFAULT}>Choose each time</SelectItem>
              {choices.map((choice) => <SelectItem key={choice.id} value={choice.id}>{choice.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        label="Tax types"
        hint="The rate is the tax as a percentage of the price before tax, and receipts are treated as tax-included. For two taxes together, such as GST + PST, enter the combined rate. Rates change by province and over time, so check each one."
      >
        <div className="space-y-2">
          {choices.map((choice) => (
            <div key={choice.id} className="grid grid-cols-12 items-center gap-2">
              <Input
                className="col-span-7"
                aria-label="Tax type name"
                value={choice.name}
                maxLength={40}
                disabled={disabled}
                onKeyDown={stopEnter}
                onChange={(e) => update(choice.id, { name: e.target.value })}
              />
              <Input
                className="col-span-3"
                aria-label={`${choice.name} rate in percent`}
                type="number"
                min={0}
                max={100}
                step={0.001}
                value={Number.isFinite(choice.rate) ? choice.rate : ''}
                disabled={disabled}
                onKeyDown={stopEnter}
                onChange={(e) => update(choice.id, { rate: e.target.value === '' ? 0 : Number(e.target.value) })}
              />
              <span className="col-span-1 text-xs text-muted-foreground">%</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="col-span-1"
                disabled={disabled}
                aria-label={`Remove ${choice.name}`}
                onClick={() => remove(choice.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || choices.length >= MAX_TAX_CHOICES}
            onClick={() => onChange({ taxChoices: [...choices, { id: newChoiceId(choices), name: 'New tax', rate: 0 }] })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add tax type
          </Button>
        </div>
      </Field>
    </div>
  );
}
