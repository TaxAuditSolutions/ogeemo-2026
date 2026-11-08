'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getPayrollRuns, getWorkers, type SavedPayrollRun, type Worker } from '@/services/payroll-service';
import { getOrganization } from '@/core/organization-service';
import { resolveOrgId } from '@/services/branding-service';
import { formatAddress } from '@/lib/payroll-report';

/** Loads the saved payroll runs, the workers (for stub addresses) and the company identity (for the stub header). */
export function usePayrollHistory() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<SavedPayrollRun[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [company, setCompany] = useState<{ name?: string; address?: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const [savedRuns, fetchedWorkers] = await Promise.all([
        getPayrollRuns(user.uid),
        // Addresses on a stub are a nicety; the history still loads without them.
        getWorkers(user.uid).catch(() => [] as Worker[]),
      ]);
      setRuns(savedRuns);
      setWorkers(fetchedWorkers);
      const orgId = await resolveOrgId();
      const org = orgId ? await getOrganization(orgId).catch(() => null) : null;
      const a = org?.businessAddress;
      setCompany({ name: org?.name, address: formatAddress([a?.street, a?.city, a?.state, a?.postalCode, a?.country]) });
    } catch (error: any) {
      setLoadError(error?.message || 'Could not load payroll history.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { runs, workers, company, isLoading, loadError, reload: load };
}
