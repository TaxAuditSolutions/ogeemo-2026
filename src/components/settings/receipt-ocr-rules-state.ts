'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getExpenseCategories } from '@/core/accounting-service';
import { resolveOrgId } from '@/services/branding-service';
import { brandingErrorMessage } from '@/lib/branding-utils';
import {
  loadReceiptOcrSettingsForOrg,
  loadRecordKeepingLog,
  saveReceiptOcrSettingsForOrg,
} from '@/services/receipt-ocr-settings-service';
import type { RecordKeepingLogEntry } from '@/lib/receipt-settings-log';
import { DEFAULT_RECEIPT_OCR_SETTINGS, type ReceiptOcrSettings } from '@/lib/receipt-ocr-options';
import { normalizeReceiptOcrSettings } from '@/lib/receipt-ocr-settings';

function parseRates(text: string): number[] {
  return text
    .split(/[,;\s]+/)
    .map((part) => Number(part.replace('%', '')))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/** Loads, edits and saves the workspace's receipt OCR rules for the Settings card. */
export function useReceiptOcrRules() {
  const { user, accessLevel } = useAuth();
  const { toast } = useToast();
  const isAdmin = accessLevel === 'org_admin' || accessLevel === 'super_admin';

  const [orgId, setOrgId] = useState<string | null>(null);
  const [value, setValue] = useState<ReceiptOcrSettings>(DEFAULT_RECEIPT_OCR_SETTINGS);
  const [taxRatesText, setTaxRatesText] = useState('');
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [changeLog, setChangeLog] = useState<RecordKeepingLogEntry[]>([]);

  const hydrate = useCallback((settings: ReceiptOcrSettings) => {
    setValue(settings);
    setTaxRatesText(settings.expectedTaxRates.join(', '));
  }, []);

  useEffect(() => {
    let cancelled = false;
    resolveOrgId().then(async (id) => {
      if (cancelled || !id) return;
      setOrgId(id);
      try {
        const settings = await loadReceiptOcrSettingsForOrg(id);
        if (cancelled) return;
        hydrate(settings);
        setIsHydrated(true);
        loadRecordKeepingLog(id)
          .then((log) => {
            if (!cancelled) setChangeLog(log);
          })
          .catch(() => {
            /* the change log is informational; the form works without it */
          });
      } catch {
        /* the form stays disabled until the rules load */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  useEffect(() => {
    if (!user) return;
    getExpenseCategories(user.uid)
      .then((categories) => setCategoryNames(Array.from(new Set(categories.map((c) => c.name).filter(Boolean))).sort()))
      .catch(() => setCategoryNames([]));
  }, [user]);

  const patch = useCallback(
    (changes: Partial<ReceiptOcrSettings>) => setValue((current) => ({ ...current, ...changes })),
    []
  );

  const save = useCallback(async () => {
    if (!orgId) return;
    setIsBusy(true);
    try {
      const saved = await saveReceiptOcrSettingsForOrg(
        orgId,
        normalizeReceiptOcrSettings({ ...value, expectedTaxRates: parseRates(taxRatesText) }),
        { userId: user?.uid ?? 'unknown', name: user?.displayName ?? user?.email ?? undefined }
      );
      hydrate(saved);
      loadRecordKeepingLog(orgId).then(setChangeLog).catch(() => {});
      toast({ title: 'Receipt OCR rules saved', description: 'New OCR runs and receipt checks use these rules straight away.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save OCR rules', description: brandingErrorMessage(error) });
    } finally {
      setIsBusy(false);
    }
  }, [hydrate, orgId, taxRatesText, toast, user, value]);

  const reset = useCallback(() => hydrate(normalizeReceiptOcrSettings(undefined)), [hydrate]);

  return {
    orgId, value, patch, taxRatesText, setTaxRatesText, categoryNames, changeLog,
    isAdmin, isHydrated, isBusy, disabled: !isAdmin || !isHydrated || isBusy, save, reset,
  };
}
