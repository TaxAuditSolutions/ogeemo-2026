'use client';

import React from 'react';
import { LoaderCircle, RotateCcw, Save, ScanText, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ReadingFields } from './receipt-ocr-reading-fields';
import { DefaultsFields, ValidationFields } from './receipt-ocr-validation-fields';
import { ReceiptVendorRulesEditor } from './receipt-vendor-rules-editor';
import { RecordKeepingFields } from './receipt-record-keeping-fields';
import { useReceiptOcrRules } from './receipt-ocr-rules-state';

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

/**
 * Settings card for receipt OCR rules: how receipts are read, the defaults new
 * receipts start with, vendor rules, and the checks run before approval.
 * Saved on the organization document; only workspace administrators can change it.
 */
export function ReceiptOcrRulesCard() {
  const rules = useReceiptOcrRules();
  const fieldProps = {
    value: rules.value,
    onChange: rules.patch,
    disabled: rules.disabled,
    taxRatesText: rules.taxRatesText,
    onTaxRatesText: rules.setTaxRatesText,
    categoryNames: rules.categoryNames,
  };

  return (
    <Card>
      <CardHeader className="border-b bg-primary/5">
        <div className="flex items-center gap-3">
          <ScanText className="h-6 w-6 text-primary" />
          <CardTitle className="text-base">Receipt OCR Rules</CardTitle>
        </div>
        <CardDescription>
          Control how scanned receipts are read, what they start with, and which checks they must pass before approval and posting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section title="Record keeping" description="How strictly receipts are controlled before they reach the ledger.">
          <RecordKeepingFields value={rules.value} onChange={rules.patch} disabled={rules.disabled} changeLog={rules.changeLog} />
        </Section>
        <Separator />
        <Section title="Reading" description="How OCR interprets your receipts.">
          <ReadingFields {...fieldProps} />
        </Section>
        <Separator />
        <Section title="Defaults for new receipts" description="Applied when a receipt is added.">
          <DefaultsFields {...fieldProps} />
        </Section>
        <Separator />
        <Section title="Vendor rules" description="Clean up vendor names and pre-fill the category and ledger type for vendors you buy from often.">
          <ReceiptVendorRulesEditor
            rules={rules.value.vendorRules}
            onChange={(vendorRules) => rules.patch({ vendorRules })}
            disabled={rules.disabled}
          />
        </Section>
        <Separator />
        <Section title="Validation" description="Checks that flag receipts needing attention.">
          <ValidationFields {...fieldProps} />
        </Section>
        {!rules.isAdmin && (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Only workspace administrators can change receipt OCR rules.
          </p>
        )}
      </CardContent>
      {rules.isAdmin && (
        <CardFooter className="flex flex-wrap gap-2 border-t bg-muted/10">
          <Button type="button" size="sm" onClick={rules.save} disabled={rules.disabled || !rules.orgId}>
            {rules.isBusy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save OCR rules
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={rules.disabled} onClick={rules.reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to defaults
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
