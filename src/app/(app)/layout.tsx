'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DndProviderWrapper } from '@/components/layout/dnd-provider-wrapper';
import { MainMenu } from '@/components/layout/main-menu';
import { ActiveTimerIndicator } from '@/components/layout/active-timer-indicator';
import { Sidebar, SidebarProvider, SidebarTrigger, SidebarFooter } from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LayoutDashboard, Search, Settings, BrainCircuit, Building2, Sparkles } from 'lucide-react';
import { SidebarViewProvider } from '@/context/sidebar-view-context';
import { ThemeOrchestrator } from '@/components/layout/theme-orchestrator';
import { HytexerciseProvider } from '@/context/hytexercise-context';
import { useAuth } from '@/context/auth-context';
import { listMyOrgMemberships, switchActiveOrg } from '@/app/actions/org-actions';
import { CoPilotMark } from '@/components/co-pilot/co-pilot-mark';
import { OgeemoCopilotSidebar } from '@/components/co-pilot/ogeemo-copilot-sidebar';
import { OgeemoCopilotProvider } from '@/context/ogeemo-copilot-context';
import {
  OgeemoCopilotSidebarProvider,
  useOgeemoCopilotSidebar,
} from '@/context/ogeemo-copilot-sidebar-context';

function CopilotHeaderButton() {
  const { openAndPin } = useOgeemoCopilotSidebar();

  return (
    <Button
      type="button"
      size="icon"
      className="h-11 w-11 rounded-full bg-card text-primary shadow-sm hover:scale-105 hover:shadow-primary/20 transition-all border border-primary/20 p-0"
      onClick={openAndPin}
      aria-label="Open Ogeemo Co-Pilot"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10">
        <CoPilotMark className="h-6 w-6" />
      </div>
    </Button>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, accessLevel, isMasterTenant } = useAuth();
  const [activeTenantName, setActiveTenantName] = useState<string>('');
  const [tenantOptions, setTenantOptions] = useState<Array<{ orgId: string; companyName: string; isActive: boolean }>>([]);

  const roleLabel = isMasterTenant ? 'Master Tenant' : accessLevel === 'super_admin' ? 'Super Admin' : accessLevel === 'org_admin' ? 'Org Admin' : accessLevel === 'editor' ? 'Editor' : accessLevel === 'viewer' ? 'Viewer' : 'Member';

  useEffect(() => {
    if (!user) {
      setActiveTenantName('');
      setTenantOptions([]);
      return;
    }

    let isMounted = true;

    async function loadActiveTenant() {
      try {
        const memberships = await listMyOrgMemberships();
        const activeMembership = memberships.find((membership) => membership.isActive);
        if (isMounted) {
          setActiveTenantName(activeMembership?.companyName || '');
          setTenantOptions(memberships);
        }
      } catch (error) {
        if (isMounted) {
          setActiveTenantName('');
          setTenantOptions([]);
        }
      }
    }

    loadActiveTenant();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSwitchTenant = async (orgId: string) => {
    if (!user || !orgId || tenantOptions.find((tenant) => tenant.orgId === orgId)?.isActive) return;

    try {
      await switchActiveOrg(orgId);
      const idToken = await user.getIdToken(true);
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      window.location.href = '/welcome';
    } catch (error) {
      console.error('Header tenant switch failed:', error);
    }
  };

  return (
    <SidebarProvider>
      <OgeemoCopilotSidebarProvider>
        <OgeemoCopilotProvider>
          <DndProviderWrapper>
            <SidebarViewProvider>
              <ThemeOrchestrator />
              <HytexerciseProvider>
                <div className="flex h-screen w-full bg-muted">
                  {/* Sidebar */}
                  <Sidebar className="hidden h-full flex-col border-r bg-sidebar text-sidebar-foreground md:flex print:hidden">
                    <div className="flex-1 overflow-y-auto pt-4">
                      <MainMenu />
                    </div>
                    <SidebarFooter className="border-t border-white/10 p-4 shrink-0 group-data-[collapsible=icon]:p-2">
                      <Button asChild variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2">
                        <Link href="/settings" aria-label="Settings">
                          <Settings className="h-4 w-4 shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                        </Link>
                      </Button>
                    </SidebarFooter>
                  </Sidebar>

                  {/* Main Content */}
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <header className="flex h-16 items-center bg-[var(--header-bg)] px-4 md:px-6 print:hidden" style={{ background: 'var(--header-bg, linear-gradient(to right, #3DD5C0, #1E8E86))' }}>
                      {/* Left Column: Branding */}
                      <div className="flex-1 flex items-center gap-4 min-w-0">
                        <SidebarTrigger className="md:hidden" />

                        <Link href="/welcome" className="flex items-center transition-opacity hover:opacity-80 shrink-0">
                          <Logo className="text-black" />
                        </Link>
                      </div>

                      {/* Center Column: Intelligence Nodes */}
                      <div className="flex items-center justify-center gap-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CopilotHeaderButton />
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="font-headline font-bold uppercase text-[10px] tracking-widest">
                              Ogeemo Co-Pilot
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button asChild size="icon" className="h-10 w-10 rounded-full bg-card text-muted-foreground shadow-sm hover:text-primary hover:shadow-primary/10 hover:scale-105 transition-all border border-muted/20 p-0">
                                <a href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer" className="flex h-full w-full items-center justify-center">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-muted/20 bg-muted/10">
                                    <Sparkles className="h-4 w-4" />
                                  </div>
                                  <span className="sr-only">Google Gemini</span>
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="font-headline font-bold uppercase text-[10px] tracking-widest">
                              Google AI
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {/* Right Column: Orchestration & Identity */}
                      <div className="flex-1 flex items-center justify-end gap-4 min-w-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button asChild size="icon" className="h-9 w-9 bg-card text-card-foreground hover:bg-card/90">
                                <Link href="/action-manager">
                                  <LayoutDashboard className="h-5 w-5" />
                                  <span className="sr-only">Action Manager</span>
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>Action Manager: One Action to Rule them All</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {tenantOptions.length > 1 ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="hidden sm:flex items-center gap-2 rounded-full border border-black/10 bg-white/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-800 shadow-sm backdrop-blur-sm max-w-[220px] hover:bg-white/50">
                                <Building2 className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{activeTenantName || 'Workspace'}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                              {tenantOptions.map((tenant) => (
                                <DropdownMenuItem
                                  key={tenant.orgId}
                                  onSelect={() => handleSwitchTenant(tenant.orgId)}
                                  disabled={tenant.isActive}
                                  className={tenant.isActive ? 'font-semibold text-primary' : ''}
                                >
                                  <span className="flex-1 truncate">{tenant.companyName}</span>
                                  {tenant.isActive && <span className="ml-2 text-[10px] uppercase tracking-[0.2em]">Active</span>}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : activeTenantName ? (
                          <div className="hidden sm:flex items-center gap-2 rounded-full border border-black/10 bg-white/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-800 shadow-sm backdrop-blur-sm max-w-[220px]">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{activeTenantName}</span>
                          </div>
                        ) : null}

                        <div className="hidden sm:flex items-center rounded-full border border-black/10 bg-white/35 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 shadow-sm backdrop-blur-sm">
                          {roleLabel}
                        </div>

                        <UserNav />
                      </div>
                    </header>
                    <main className="flex-1 overflow-y-auto bg-background">
                      {children}
                    </main>
                  </div>
                  <OgeemoCopilotSidebar />
                </div>
              </HytexerciseProvider>
            </SidebarViewProvider>
          </DndProviderWrapper>
        </OgeemoCopilotProvider>
      </OgeemoCopilotSidebarProvider>
    </SidebarProvider>
  );
}
