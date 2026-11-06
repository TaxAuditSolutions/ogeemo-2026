'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MAX_VENDOR_RULES,
  RECEIPT_LEDGER_LABELS,
  RECEIPT_LEDGER_TYPES,
  type ReceiptLedgerType,
  type ReceiptTaxChoice,
  type ReceiptVendorRule,
} from '@/lib/receipt-ocr-options';

const KEEP_LEDGER = '__keep__';
const KEEP_TAX = '__keep_tax__';

interface VendorRulesEditorProps {
  rules: ReceiptVendorRule[];
  /** Tax types a rule can pick; empty hides the tax column. */
  taxChoices?: readonly ReceiptTaxChoice[];
  onChange: (rules: ReceiptVendorRule[]) => void;
  disabled: boolean;
}

/** Editable list of vendor rules: when the OCR vendor contains X, rename it and/or suggest a category, ledger type and tax type. */
export function ReceiptVendorRulesEditor({ rules, taxChoices = [], onChange, disabled }: VendorRulesEditorProps) {
  const showTax = taxChoices.length > 0;
  const update = (index: number, patch: Partial<ReceiptVendorRule>) =>
    onChange(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  const remove = (index: number) => onChange(rules.filter((_, i) => i !== index));
  const stopEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  return (
    <div className="space-y-3">
      {rules.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No vendor rules yet. A rule fills in a clean vendor name, category and ledger type whenever OCR reads a vendor
          name containing your text (for example, &quot;staples&quot;).
        </p>
      )}

      {rules.map((rule, index) => (
        <div key={index} className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-12">
          <div className="sm:col-span-3">
            <Label htmlFor={`vr-contains-${index}`} className="text-xs">Vendor contains</Label>
            <Input
              id={`vr-contains-${index}`}
              value={rule.contains}
              maxLength={80}
              disabled={disabled}
              onKeyDown={stopEnter}
              onChange={(e) => update(index, { contains: e.target.value })}
              placeholder="staples"
            />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor={`vr-name-${index}`} className="text-xs">Use vendor name</Label>
            <Input
              id={`vr-name-${index}`}
              value={rule.vendorName ?? ''}
              maxLength={120}
              disabled={disabled}
              onKeyDown={stopEnter}
              onChange={(e) => update(index, { vendorName: e.target.value })}
              placeholder="Staples Canada"
            />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor={`vr-cat-${index}`} className="text-xs">Default category</Label>
            <Input
              id={`vr-cat-${index}`}
              value={rule.category ?? ''}
              maxLength={120}
              disabled={disabled}
              onKeyDown={stopEnter}
              onChange={(e) => update(index, { category: e.target.value })}
              placeholder="Office Supplies"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Ledger type</Label>
            <Select
              value={rule.ledgerType ?? KEEP_LEDGER}
              disabled={disabled}
              onValueChange={(value) =>
                update(index, { ledgerType: value === KEEP_LEDGER ? undefined : (value as ReceiptLedgerType) })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={KEEP_LEDGER}>No change</SelectItem>
                {RECEIPT_LEDGER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{RECEIPT_LEDGER_LABELS[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end sm:col-span-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              aria-label={`Remove vendor rule ${index + 1}`}
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          {showTax && (
            <div className="sm:col-span-12 sm:max-w-xs">
              <Label className="text-xs">Tax type</Label>
              <Select
                value={rule.taxChoice ?? KEEP_TAX}
                disabled={disabled}
                onValueChange={(value) => update(index, { taxChoice: value === KEEP_TAX ? undefined : value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP_TAX}>No change</SelectItem>
                  {taxChoices.map((choice) => (
                    <SelectItem key={choice.id} value={choice.id}>{choice.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || rules.length >= MAX_VENDOR_RULES}
        onClick={() => onChange([...rules, { contains: '' }])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add vendor rule
      </Button>
    </div>
  );
}
