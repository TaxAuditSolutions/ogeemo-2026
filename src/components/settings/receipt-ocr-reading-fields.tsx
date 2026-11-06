'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  MAX_CUSTOM_INSTRUCTIONS,
  OCR_CURRENCIES,
  OCR_DATE_FORMATS,
  OCR_LANGUAGES,
  OCR_MODELS,
  OCR_TAX_MODES,
  type ReceiptOcrSettings,
} from '@/lib/receipt-ocr-options';
import { Field, NumberInput, type RulesFieldsProps } from './receipt-ocr-rules-common';

/** How OCR reads the document: model, language, date and tax conventions, currency, extra instructions. */
export function ReadingFields({ value, onChange, disabled }: RulesFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="OCR model" hint="Pro reads difficult scans best but is slower and costs more.">
        <Select value={value.model} disabled={disabled} onValueChange={(model) => onChange({ model: model as ReceiptOcrSettings['model'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {OCR_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Receipt language">
        <Select value={value.language} disabled={disabled} onValueChange={(language) => onChange({ language })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {OCR_LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Date format on receipts" hint="Used to read dates such as 03/04/2026 correctly.">
        <Select value={value.dateFormat} disabled={disabled} onValueChange={(dateFormat) => onChange({ dateFormat: dateFormat as ReceiptOcrSettings['dateFormat'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {OCR_DATE_FORMATS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Tax on receipts">
        <Select value={value.taxMode} disabled={disabled} onValueChange={(taxMode) => onChange({ taxMode: taxMode as ReceiptOcrSettings['taxMode'] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {OCR_TAX_MODES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Default currency" hint="Used when a receipt shows no currency.">
        <Select value={value.defaultCurrency} disabled={disabled} onValueChange={(defaultCurrency) => onChange({ defaultCurrency })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {OCR_CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Largest file accepted (MB)" hint="Up to 10 MB.">
        <NumberInput value={value.maxFileSizeMB} min={1} max={10} disabled={disabled} onChange={(maxFileSizeMB) => onChange({ maxFileSizeMB })} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Extra instructions for OCR" hint={`Optional. For example: "Ignore loyalty points." (${value.customInstructions.length}/${MAX_CUSTOM_INSTRUCTIONS})`}>
          <Textarea
            value={value.customInstructions}
            maxLength={MAX_CUSTOM_INSTRUCTIONS}
            rows={3}
            disabled={disabled}
            onChange={(e) => onChange({ customInstructions: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex items-start justify-between gap-3 rounded-md border p-3 sm:col-span-2">
        <div>
          <p className="text-sm font-medium">Run OCR automatically when a file is added</p>
          <p className="text-xs text-muted-foreground">Off by default. Each OCR run uses your AI quota.</p>
        </div>
        <Switch checked={value.autoRunOcrOnUpload} disabled={disabled} onCheckedChange={(autoRunOcrOnUpload) => onChange({ autoRunOcrOnUpload })} />
      </div>
    </div>
  );
}
