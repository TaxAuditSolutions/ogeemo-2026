'use client';

import { useCallback, useEffect, useState } from 'react';
import { resolveOrgId } from '@/services/branding-service';
import { loadPayrollSettingsForOrg, savePayrollSettingsForOrg } from '@/services/payroll-settings-service';
import { DEFAULT_PAYROLL_SETTINGS, type PayrollSettings } from '@/lib/payroll-settings';

/** Loads the workspace pay schedule and default deduction rate, and saves changes (administrators only). */
export function usePayrollSettings() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [settings, setSettings] = useState<PayrollSettings>(DEFAULT_PAYROLL_SETTINGS);
  const [isDefault, setIsDefault] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const id = await resolveOrgId();
      setOrgId(id);
      if (!id) {
        setLoadError('Could not find your workspace.');
        return;
      }
      const loaded = await loadPayrollSettingsForOrg(id);
      setSettings(loaded.settings);
      setIsDefault(loaded.isDefault);
    } catch (error: any) {
      setLoadError(error?.message || 'Could not load payroll settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (next: PayrollSettings) => {
      if (!orgId) throw new Error('Could not find your workspace.');
      const cleaned = await savePayrollSettingsForOrg(orgId, next);
      setSettings(cleaned);
      setIsDefault(false);
      return cleaned;
    },
    [orgId]
  );

  return { settings, isDefault, isLoading, loadError, save, reload };
}
