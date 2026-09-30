'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DndProviderWrapper } from '@/components/layout/dnd-provider-wrapper';
import { MainMenu } from '@/components/layout/main-menu';
import { GlobalSearch } from '@/components/layout/global-search';
import { useUserPreferences } from '@/hooks/use-user-preferences';
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
import { Settings, Building2, HelpCircle } from 'lucide-react';
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
  const { openAndPin, close, state, isMobile, isMobileOpen } = useOgeemoCopilotSidebar();
  const isOpen = isMobile ? isMobileOpen : state === 'expanded';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          className={`flex h-8 items-center gap-2 rounded-full border border-black/10 px-3 py-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-800 shadow-sm backdrop-blur-sm transition-colors hover:bg-white/50 ${isOpen ? 'bg-white/60' : 'bg-white/35'}`}
          onClick={() => (isOpen ? close() : openAndPin())}
          aria-label={isOpen ? 'Close Ogeemo Co-Pilot' : 'Open Ogeemo Co-Pilot'}
          aria-expanded={isOpen}
        >
          <CoPilotMark className="h-4 w-4 shrink-0" />
          <span>Co-Pilot</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Your AI assistant for Ogeemo and your work.</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, accessLevel, isMasterTenant } = useAuth();
  const [activeTenantName, setActiveTenantName] = useState<string>('');
  const [tenantOptions, setTenantOptions] = useState<Array<{ orgId: string; companyName: string; isActive: boolean }>>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const { preferences } = useUserPreferences();
  const showWorkspaceButton = preferences?.showWorkspaceButton ?? true;
  const showRoleBadge = preferences?.showRoleBadge ?? true;

  const roleLabel = isMasterTenant ? 'Master Tenant' : accessLevel === 'super_admin' ? 'Super Admin' : accessLevel === 'org_admin' ? 'Org Admin' : accessLevel === 'editor' ? 'Editor' : accessLevel === 'viewer' ? 'Viewer' : 'Member';
  const roleExplanation = isMasterTenant
    ? 'Full ownership access across the platform and all workspaces.'
    : accessLevel === 'super_admin'
      ? 'Platform-wide administrative access.'
      : accessLevel === 'org_admin'
        ? 'Administrator access for this workspace.'
        : accessLevel === 'editor'
          ? 'Can create and edit records in this workspace.'
          : accessLevel === 'viewer'
            ? 'Read-only access to this workspace.'
            : 'Standard member access to this workspace.';

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
                      <div className="flex gap-1">
                        <Button asChild variant="ghost" className="flex-1 justify-start gap-3 text-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2">
                          <Link href="/settings" aria-label="Settings">
                            <Settings className="h-4 w-4 shrink-0" />
                            <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" className="flex-1 justify-start gap-3 text-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2">
                          <Link href="/help" aria-label="Help">
                            <HelpCircle className="h-4 w-4 shrink-0" />
                            <span className="group-data-[collapsible=icon]:hidden">Help</span>
                          </Link>
                        </Button>
                      </div>
                    </SidebarFooter>
                  </Sidebar>

                  {/* Main Content */}
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <header className="flex h-16 items-center bg-[var(--header-bg)] px-4 md:px-6 print:hidden" style={{ background: 'var(--header-bg, linear-gradient(to right, #3DD5C0, #1E8E86))' }}>
                      {/* Left Column: Branding */}
                      <div className="flex-1 flex items-center gap-4 min-w-0">
                        <SidebarTrigger className="h-8 w-8 md:hidden" />

                        <Link href="/welcome" className="flex items-center transition-opacity hover:opacity-80 shrink-0">
                          <Logo className="text-black" />
                        </Link>

                        <GlobalSearch isOpen={searchOpen} onOpenChange={setSearchOpen} />
                      </div>

                      {/* Center Column: Intelligence Nodes */}
                      <div className="flex items-center justify-center gap-4">
                        <TooltipProvider>
                          <CopilotHeaderButton />
                        </TooltipProvider>
                      </div>

                      {/* Right Column: Orchestration & Identity */}
                      <div className="flex-1 flex items-center justify-end gap-4 min-w-0">
                        <TooltipProvider>
                        {showWorkspaceButton && (tenantOptions.length > 1 ? (
                          <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="hidden sm:flex h-8 items-center gap-2 rounded-full border border-black/10 bg-white/35 px-3 py-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-800 shadow-sm backdrop-blur-sm max-w-[220px] hover:bg-white/50">
                                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{activeTenantName || 'Workspace'}</span>
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>Active workspace — click to switch between workspaces. This button can be turned off and on in Settings.</p>
                              </TooltipContent>
                            </Tooltip>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="hidden sm:flex h-8 items-center gap-2 rounded-full border border-black/10 bg-white/35 px-3 py-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-800 shadow-sm backdrop-blur-sm max-w-[220px]">
                                <Building2 className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{activeTenantName}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>Active workspace. This button can be turned off and on in Settings.</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : null)}

                        {showRoleBadge && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="hidden sm:flex h-8 items-center rounded-full border border-black/10 bg-white/35 px-3 py-0 text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 shadow-sm backdrop-blur-sm">
                              {roleLabel}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p>{roleExplanation} This badge can be turned off and on in Settings.</p>
                          </TooltipContent>
                        </Tooltip>
                        )}

                        <UserNav />
                        </TooltipProvider>
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
