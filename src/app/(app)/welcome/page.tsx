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
  Inbox,
  Users,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { listMyOrgMemberships, switchActiveOrg } from '@/app/actions/org-actions';
import { useToast } from '@/hooks/use-toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { getUserWorkflows, type Workflow } from '@/services/workflow-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { allMenuItems } from '@/lib/menu-items';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * @fileOverview The primary welcome landing page for authenticated members.
 */

/** Step count of the Learn Ogeemo guided path (kept in sync by a guard test). */
const LEARN_TOTAL = 8;
/**
 * "Client Report" frame (welcome page): a client dropdown that jumps straight
 * to the client record (/contacts/[id]). Sits directly after the CurrentWork
 * "to-do" panel in both welcome states. Fails soft: empty list on error.
 */
function ClientReportFrame({
  variant = 'frame',
  stepNumber,
}: {
  /** 'frame' = standalone welcome frame; 'step' = numbered tile in the workflow steps grid. */
  variant?: 'frame' | 'step';
  stepNumber?: number;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Contact[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    getContacts()
      .then((list) => {
        if (!isMounted) return;
        setClients([...list].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {
        if (isMounted) setClients([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingClients(false);
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  const placeholder = isLoadingClients
    ? 'Loading clients…'
    : clients.length > 0
      ? 'Select a client…'
      : 'No clients yet';

  const clientSelect = (
    <Select value="" onValueChange={(id) => router.push(`/contacts/${id}`)}>
      <SelectTrigger
        className={variant === 'step' ? 'w-full bg-card' : 'w-[220px] bg-card'}
        aria-label="Select a client"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {clients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            {client.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (variant === 'step') {
    return (
      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {stepNumber ?? ''}
          </span>
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="min-w-0 truncate text-sm font-semibold">Client Report</span>
        </div>
        {clientSelect}
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-primary/20 bg-white p-4 shadow-lg">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Client Report</p>
          <p className="text-xs text-muted-foreground">
            Pick a client to see their full record — activity, tasks, projects and invoicing.
          </p>
        </div>
        {clientSelect}
        <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary/80">
          <Link href="/contacts">All clients</Link>
        </Button>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const { user, accessLevel, isMasterTenant } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
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

  // Start Your Day's workflow line: one small read of the user's workflow list
  // (the same per-user doc the Workflows page uses) + the active id that
  // useUserPreferences already provides. On load failure both stay null and
  // the line falls back to the neutral "Your workflow".
  const [workflowCount, setWorkflowCount] = useState<number | null>(null);
  const [activeWorkflowName, setActiveWorkflowName] = useState<string | null>(null);
  const [workflowList, setWorkflowList] = useState<Workflow[]>([]);
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    getUserWorkflows(user.uid)
      .then((list) => {
        if (!isMounted) return;
        const activeId = preferences?.activeWorkflowId ?? null;
        setActiveWorkflowName(list.find((w) => w.id === activeId)?.name ?? null);
        setWorkflowCount(list.length);
        setWorkflowList(list);
      })
      .catch(() => {
        // Keep the neutral label rather than guessing.
      });
    return () => {
      isMounted = false;
    };
  }, [user, preferences?.activeWorkflowId]);

  const workflowLineLabel =
    workflowCount === null
      ? 'Your workflow'
      : activeWorkflowName
        ? `Your workflow: ${activeWorkflowName}`
        : workflowCount > 0
          ? 'Choose a workflow'
          : 'Create your workflow';

  // Repeat-user doors: once an active workflow is applied (Make It Your Own
  // -> Your workflows -> Apply) the three doors collapse into a single start
  // button. The active workflow lives in the user's profile, so it carries
  // across logins and devices - nothing to re-pick: on load a resolved
  // standard always wins and "Your Day" opens directly. "Show the
  // getting-started doors" only brings the doors back for the current visit;
  // nothing is persisted (a persisted override once hid the saved workflow
  // behind the doors permanently, with no way back even after a hard reset).
  // Session-only: nothing about the doors is persisted. The old restored
  // override lived in localStorage and could never be cleared again, so a
  // user with a saved standard was trapped behind the doors even after a
  // hard reset - on load a resolved workflow now always wins.
  const [doorsRestored, setDoorsRestored] = useState(false);

  const handleShowDoors = () => {
    setDoorsRestored(true);
  };

  // One click back to the applied workflow within this visit.
  const handleDismissDoors = () => {
    setDoorsRestored(false);
  };

  // One-click "select and save" for the standard workflow is intentionally
  // NOT here: the welcome page shows the chosen workflow, and switching
  // standards happens on the Workflows page ("Set as standard").

  // Doors stay as the safe entry path while the workflow list loads, when it
  // fails to load, and when no workflow is active - they only collapse once a
  // workflow is confirmed active (name resolved) and the user has not
  // brought them back.
  const showDoors = doorsRestored || activeWorkflowName === null;

  // The chosen workflow itself, steps included - the welcome page displays
  // this, not a list of choices; switching standards happens on /workflows.
  const activeWorkflow = workflowList.find((w) => w.id === (preferences?.activeWorkflowId ?? null)) ?? null;

  // Greeting for the workflow-led header ("Welcome back, Dan").
  const firstName = (user?.displayName ?? '').trim().split(/\s+/)[0] ?? '';

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
    <div className="flex flex-col items-center justify-start min-h-[calc(100vh-64px)] px-4 pt-6 pb-10 bg-muted/10">
      {showHomeBanner && (
      <div className="w-full max-w-3xl mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-white p-4 shadow-lg">
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
        <div className="w-full max-w-3xl mb-6 rounded-2xl border border-primary/20 bg-white p-6 shadow-lg">
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

      <div className="w-full max-w-4xl space-y-6 animate-in fade-in zoom-in-95 duration-700">
        {/* Header: new users get the generic welcome; repeat users get a
            personal greeting and a page-level title - the chosen workflow
            is featured as the steps below, not as the page title. */}
        <header className="text-center space-y-3">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
            <Logo iconOnly markSize={48} />
          </div>
          {showDoors ? (
            <>
              <h1 className="text-2xl md:text-3xl font-bold font-headline text-primary tracking-tight">
                Welcome to Ogeemo
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Your business workspace is ready. <br className="hidden md:block" /> Pick a task below to get started.
              </p>
              {activeWorkflowName && (
                <button
                  type="button"
                  onClick={handleDismissDoors}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  <WorkflowIcon className="h-4 w-4" />
                  Back to your workflow — {activeWorkflowName}
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                Welcome back{firstName ? `, ${firstName}` : ''}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold font-headline text-primary tracking-tight">
                Your Day
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Your workflow steps, today&apos;s work and your clients — all in one place.
              </p>
            </>
          )}
        </header>

        {showDoors && <CurrentWorkPanel />}

        {showDoors && <ClientReportFrame />}

        {/* Three doors: the journey in order - learn, shape your workspace,
            then work. Calendar/money context comes from CurrentWorkPanel.
            Start Your Day carries a second, always-visible line to the user's
            own workflow - applying a workflow is what shapes the day, so it
            gets a one-click path from the home screen. Each card is a primary
            link (icon/title) plus the optional line - never nested anchors.

            Repeat users (an applied workflow) collapse this grid into their
            own workflow below; the choice persists in the profile, so it
            carries across logins, and one click brings the doors back. */}
        {showDoors && (
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
                workflowLine: false,
              },
              {
                href: '/make-it-your-own',
                icon: Paintbrush,
                title: 'Make It Your Own',
                description: 'Personalize your shortcuts, sidebar, header and look — make Ogeemo match how you work.',
                workflowLine: false,
              },
              {
                href: '/action-manager',
                icon: LayoutDashboard,
                title: 'Start Your Day',
                description: 'Your shortcuts — where the workday begins.',
                workflowLine: true,
              },
            ].map((door) => {
              const DoorIcon = door.icon;
              return (
                <Card key={door.href} className="group h-full transition-all hover:-translate-y-1 hover:shadow-xl">
                  <CardContent className="flex h-full flex-col items-center gap-2 p-6 text-center">
                    <Link href={door.href} className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <DoorIcon className="h-6 w-6 text-primary" strokeWidth={2.25} />
                      </div>
                      <p className="text-lg font-bold">{door.title}</p>
                      <p className="text-sm text-muted-foreground">{door.description}</p>
                      <span className="flex items-center gap-1 pt-2 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        Open <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                    {door.workflowLine && (
                      <Link
                        href="/workflows"
                        className="mt-auto flex w-full items-center justify-center gap-1.5 border-t pt-3 text-sm font-semibold text-primary hover:underline"
                      >
                        <WorkflowIcon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 truncate">{workflowLineLabel}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Repeat-user state: with a workflow applied the page becomes the
            workflow - ordered steps first, controls beneath. The choice is
            persisted, so there is nothing to re-pick on login; switching
            standards happens on the Workflows page. */}
        {!showDoors && (
          <div className="flex flex-col items-center gap-5">
            {activeWorkflow && activeWorkflow.items.length > 0 && (
              <p className="w-full text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Your {activeWorkflow.name} workflow — {activeWorkflow.items.length}{' '}
                {activeWorkflow.items.length === 1 ? 'step' : 'steps'}
              </p>
            )}
            {activeWorkflow && activeWorkflow.items.length > 0 && (
              <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeWorkflow.items.map((item, idx) => {
                  const StepIcon = allMenuItems.find((m) => m.href === item.href)?.icon ?? Inbox;
                  return (
                    <button
                      key={`${item.id}-${idx}`}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className="group flex items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {idx + 1}
                      </span>
                      <StepIcon className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary" />
                      <span className="min-w-0 truncate text-sm font-semibold">{item.label}</span>
                      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  );
                })}
                <ClientReportFrame variant="step" stepNumber={activeWorkflow.items.length + 1} />
              </div>
            )}
            {activeWorkflow && activeWorkflow.items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                This workflow has no steps yet — add destinations on the Workflows page.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="max-w-full">
                <Link href="/action-manager">
                  <LayoutDashboard className="mr-2 h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">Start your day — {activeWorkflowName}</span>
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/workflows">
                  <WorkflowIcon className="mr-2 h-4 w-4" /> Change workflow
                </Link>
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={handleShowDoors}
            >
              Show the getting-started doors
            </Button>
          </div>
        )}

        {/* Day context (calendar/money): above the doors for new users, but
            after the workflow steps for workflow users. */}
        {!showDoors && <CurrentWorkPanel />}

        {/* Fall back to the standalone frame when there is no workflow steps
            row to host the numbered Client Report tile (new users, or a
            saved workflow with no steps yet). */}
        {!showDoors && (!activeWorkflow || activeWorkflow.items.length === 0) && <ClientReportFrame />}

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/co-pilot"
            className="flex items-center gap-2 rounded-xl border-2 border-black px-6 py-3 text-base font-bold text-black transition-all hover:-translate-y-0.5 hover:bg-black hover:text-white"
          >
            <Bot className="h-5 w-5" />
            Your Co-Pilot
          </Link>
        </div>
      </div>

    </div>
  );
}
