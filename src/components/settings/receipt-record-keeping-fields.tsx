'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RECORD_KEEPING_MODES, type RecordKeepingMode, type ReceiptOcrSettings } from '@/lib/receipt-ocr-options';
import {
  RECORD_KEEPING_DESCRIPTIONS,
  RECORD_KEEPING_LABELS,
  resolveRecordKeeping,
} from '@/lib/receipt-record-keeping';
import type { RecordKeepingLogEntry } from '@/lib/receipt-settings-log';
import { Field } from './receipt-ocr-rules-common';

interface RecordKeepingFieldsProps {
  value: ReceiptOcrSettings;
  onChange: (patch: Partial<ReceiptOcrSettings>) => void;
  disabled: boolean;
  changeLog: RecordKeepingLogEntry[];
}

function SwitchRow({ title, hint, checked, disabled, onChange }: { title: string; hint: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}

/** Choose how strictly receipts are controlled: Simple (paper is the record), Audit-ready, or Custom. */
export function RecordKeepingFields({ value, onChange, disabled, changeLog }: RecordKeepingFieldsProps) {
  const controls = resolveRecordKeeping(value);
  const isCustom = value.recordKeepingMode === 'custom';

  return (
    <div className="space-y-4">
      <Field label="Record-keeping mode">
        <Select value={value.recordKeepingMode} disabled={disabled} onValueChange={(mode) => onChange({ recordKeepingMode: mode as RecordKeepingMode })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {RECORD_KEEPING_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>{RECORD_KEEPING_LABELS[mode]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <p className="text-sm text-muted-foreground">{RECORD_KEEPING_DESCRIPTIONS[value.recordKeepingMode]}</p>

      {isCustom && (
        <div className="space-y-2">
          <SwitchRow
            title="Keep a scan of each receipt"
            hint="Stores a private scan so a receipt's document number in the general ledger opens it."
            checked={controls.keepScan}
            disabled={disabled || value.requireScanToPost}
            onChange={(keepScan) => onChange({ keepScan })}
          />
          <SwitchRow
            title="Require a scan before posting"
            hint="A receipt cannot be posted until its scan is stored."
            checked={value.requireScanToPost}
            disabled={disabled}
            onChange={(requireScanToPost) => onChange({ requireScanToPost, ...(requireScanToPost ? { keepScan: true } : {}) })}
          />
          <SwitchRow
            title="Block posting while a receipt has errors"
            hint="Errors are missing required fields, amounts that do not add up, and invalid dates."
            checked={value.blockPostingOnErrors}
            disabled={disabled}
            onChange={(blockPostingOnErrors) => onChange({ blockPostingOnErrors })}
          />
        </div>
      )}

      <div className="flex gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          These settings decide how strictly Ogeemo checks new receipts. They are not a legal or CRA certification: what holds up in an
          audit depends on your own process. Keep paper originals unless your accountant says otherwise. Changing the mode never
          deletes stored scans or changes receipts already posted.
        </p>
      </div>

      {changeLog.length > 0 && (
        <details className="rounded-md border p-3 text-xs">
          <summary className="cursor-pointer font-medium">Change history ({changeLog.length})</summary>
          <ul className="mt-2 space-y-2">
            {changeLog.map((entry) => (
              <li key={`${entry.at}-${entry.byUserId}`}>
                <span className="font-medium">{new Date(entry.at).toLocaleString()}</span>
                {' - '}
                {entry.byName || entry.byUserId}
                <ul className="ml-4 list-disc text-muted-foreground">
                  {entry.changes.map((change) => <li key={change}>{change}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
