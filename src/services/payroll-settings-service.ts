'use client';

import { getOrganization, updateOrganizationDetails } from '@/core/organization-service';
import {
  needsPayrollSetup,
  normalizePayrollSettings,
  validatePayrollSettings,
  type PayrollSettings,
} from '@/lib/payroll-settings';

/**
 * Client access to the workspace's pay schedule and default deduction rate, which
 * live on the organization document. Every member can read them; Firestore rules
 * restrict writes to workspace administrators.
 */

export interface LoadedPayrollSettings {
  settings: PayrollSettings;
  /** True when no pay schedule has been saved yet (defaults are being shown). */
  isDefault: boolean;
}

export async function loadPayrollSettingsForOrg(orgId: string): Promise<LoadedPayrollSettings> {
  const org = await getOrganization(orgId);
  return {
    settings: normalizePayrollSettings(org?.payrollSettings),
    isDefault: needsPayrollSetup(org?.payrollSettings),
  };
}

/** Validates, saves and returns the cleaned settings; throws a readable message when invalid. */
export async function savePayrollSettingsForOrg(orgId: string, settings: PayrollSettings): Promise<PayrollSettings> {
  const cleaned = normalizePayrollSettings(settings);
  const problem = validatePayrollSettings(cleaned);
  if (problem) throw new Error(problem);
  await updateOrganizationDetails(orgId, { payrollSettings: cleaned });
  return cleaned;
}
