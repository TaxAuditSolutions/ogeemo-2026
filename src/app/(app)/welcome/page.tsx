'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { CurrentWorkPanel } from '@/components/welcome/current-work-panel';
import {
  ArrowRight, Building2, Check,
  Bot,
  Paintbrush, Compass, LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { listMyOrgMemberships, switchActiveOrg } from '@/app/actions/org-actions';
import { useToast } from '@/hooks/use-toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';

/**
 * @fileOverview The primary welcome landing page for authenticated members.
 */

/** Step count of the Learn Ogeemo guided path (kept in sync by a guard test). */
const LEARN_TOTAL = 8;
export default function WelcomePage() {
  const { user, accessLevel, isMasterTenant } = useAuth();
  const { toast } = useToast();
  const [tenantOptions, setTenantOptions] = useState<Array<{ orgId: string; companyName: string; isActive: boolean }>>([]);
  const [isSwitchingTenant, setIsSwitchingTenant] = useState(false);
  const { preferences } = useUserPreferences();
  const showHomeBanner = preferences?.showHomeBanner ?? true;

  // Get Started door: reflect progress on the Learn Ogeemo guided path
  // (reads the same localStorage map the Learn page writes).
  const [learnDone, setLearnDone] = useState(0);
  useEffect(() => {
    if (!user) return;
    try {
      const raw = window.localStorage.getItem('ogeemo-learn-progress');
      const all = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
      setLearnDone(new Set(all[user.uid] ?? []).size);
    } catch {
      setLearnDone(0);
    }
  }, [user]);

  const currentWorkspaceName = tenantOptions.find((tenant) => tenant.isActive)?.companyName || 'Current Workspace';
  const roleLabel = isMasterTenant ? 'Master Tenant' : accessLevel === 'super_admin' ? 'Super Admin' : accessLevel === 'org_admin' ? 'Org Admin' : accessLevel === 'editor' ? 'Editor' : accessLevel === 'viewer' ? 'Viewer' : 'Member';

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    listMyOrgMemberships()
      .then((memberships) => {
        if (!isMounted) return;
        setTenantOptions(memberships.filter(Boolean) as Array<{ orgId: string; companyName: string; isActive: boolean }>);
      })
      .catch(() => {
        if (isMounted) setTenantOptions([]);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSwitchTenant = async (orgId: string) => {
    if (!user) return;

    try {
      setIsSwitchingTenant(true);
      await switchActiveOrg(orgId);
      const idToken = await user.getIdToken(true);
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      window.location.href = '/welcome';
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Workspace switch failed',
        description: error.message || 'Unable to switch to the selected workspace.',
      });
    } finally {
      setIsSwitchingTenant(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4 bg-muted/10">
      {showHomeBanner && (
      <div className="w-full max-w-3xl mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-white p-4 shadow-lg">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Building2 className="h-4 w-4 text-primary" />
          <span>Current workspace:</span>
          <span className="font-bold text-primary">{currentWorkspaceName}</span>
        </div>
        <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          {roleLabel}
        </div>
      </div>
      )}

      {tenantOptions.length > 1 && (
        <div className="w-full max-w-3xl mb-8 rounded-2xl border border-primary/20 bg-white p-6 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Workspace Selection</p>
              <h2 className="mt-2 text-2xl font-bold font-headline text-primary">Choose which workspace to open</h2>
            </div>
            <Building2 className="h-8 w-8 text-primary" />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {tenantOptions.map((tenant) => (
              <Button
                key={tenant.orgId}
                variant={tenant.isActive ? 'default' : 'outline'}
                className="h-auto justify-between rounded-xl px-4 py-4 text-left"
                onClick={() => handleSwitchTenant(tenant.orgId)}
                disabled={isSwitchingTenant || tenant.isActive}
              >
                <span className="flex items-center gap-3">
                  <Building2 className="h-4 w-4" />
                  <span className="font-semibold">{tenant.companyName}</span>
                </span>
                {tenant.isActive ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in-95 duration-700">
        <header className="text-center space-y-3">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
            <Logo iconOnly markSize={48} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline text-primary tracking-tight">
            Welcome to Ogeemo
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Your business workspace is ready. <br className="hidden md:block" /> Pick a task below to get started.
          </p>
        </header>

        <CurrentWorkPanel />

        {/* Three doors: the journey in order - learn, shape your workspace,
            then work. Calendar/money context comes from CurrentWorkPanel. */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              href: '/learn',
              icon: Compass,
              title: 'Get Started',
              description:
                learnDone === 0
                  ? 'New here? Follow the guided path — it walks you through Ogeemo step by step.'
                  : learnDone >= LEARN_TOTAL
                    ? `You have finished all ${LEARN_TOTAL} steps. Come back any time to revisit a lesson or guide.`
                    : `You are ${learnDone} of ${LEARN_TOTAL} steps in — pick up where you left off.`,
            },
            {
              href: '/make-it-your-own',
              icon: Paintbrush,
              title: 'Make It Your Own',
              description: 'Personalize your shortcuts, sidebar, header and look — make Ogeemo match how you work.',
            },
            {
              href: '/action-manager',
              icon: LayoutDashboard,
              title: 'Start Your Day',
              description: 'Your shortcuts — where the workday begins.',
            },
          ].map((door) => {
            const DoorIcon = door.icon;
            return (
              <Link key={door.href} href={door.href} className="group">
                <Card className="h-full transition-all hover:-translate-y-1 hover:shadow-xl">
                  <CardContent className="flex h-full flex-col items-center gap-2 p-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <DoorIcon className="h-6 w-6 text-primary" strokeWidth={2.25} />
                    </div>
                    <p className="text-lg font-bold">{door.title}</p>
                    <p className="text-sm text-muted-foreground">{door.description}</p>
                    <span className="mt-auto flex items-center gap-1 pt-2 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Open <ArrowRight className="h-4 w-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/co-pilot"
            className="flex items-center gap-2 rounded-xl border-2 border-black px-6 py-3 text-base font-bold text-black transition-all hover:-translate-y-0.5 hover:bg-black hover:text-white"
          >
            <Bot className="h-5 w-5" />
            Ask the Co-Pilot
          </Link>
        </div>
      </div>

    </div>
  );
}
