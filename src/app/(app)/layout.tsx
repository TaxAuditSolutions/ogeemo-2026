'use client';

import Link from 'next/link';
import { DndProviderWrapper } from '@/components/layout/dnd-provider-wrapper';
import { MainMenu } from '@/components/layout/main-menu';
import { ActiveTimerIndicator } from '@/components/layout/active-timer-indicator';
import { Sidebar, SidebarProvider, SidebarTrigger, SidebarFooter } from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LayoutDashboard, Bot, Search, Settings, BrainCircuit } from 'lucide-react';
import { SidebarViewProvider } from '@/context/sidebar-view-context';
import { ThemeOrchestrator } from '@/components/layout/theme-orchestrator';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DndProviderWrapper>
        <SidebarViewProvider>
          <ThemeOrchestrator />
          <div className="flex h-screen w-full bg-muted">
            {/* Sidebar */}
            <Sidebar className="hidden h-full w-[16rem] flex-col border-r bg-sidebar text-sidebar-foreground md:flex print:hidden">
              <div className="flex-1 overflow-y-auto pt-4">
                <MainMenu />
              </div>
              <SidebarFooter className="border-t border-white/10 p-4 shrink-0">
                <Button asChild variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent">
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </Button>
              </SidebarFooter>
            </Sidebar>
            
            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <header className="flex h-16 items-center bg-[var(--header-bg)] px-4 md:px-6 print:hidden" style={{ background: 'var(--header-bg, linear-gradient(to right, #3DD5C0, #1E8E86))' }}>
                 {/* Left Column: Branding */}
                 <div className="flex-1 flex items-center gap-4">
                   <SidebarTrigger className="md:hidden" />
                   
                   <Link href="/welcome" className="flex items-center transition-opacity hover:opacity-80">
                      <Logo className="text-black" />
                   </Link>
                 </div>

                  {/* Center Column: Intelligence Nodes */}
                  <div className="flex items-center justify-center gap-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild size="icon" className="h-10 w-10 rounded-full bg-card text-primary shadow-sm hover:shadow-primary/20 hover:scale-105 transition-all border border-primary/20">
                            <Link href="/ai-dispatch">
                                <BrainCircuit className="h-5 w-5" />
                                <span className="sr-only">Ogeemo AI</span>
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="font-headline font-bold uppercase text-[10px] tracking-widest">
                          Ogeemo Dispatch
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button asChild size="icon" className="h-10 w-10 rounded-full bg-card text-muted-foreground shadow-sm hover:text-primary hover:shadow-primary/10 hover:scale-105 transition-all border border-muted/20">
                            <a href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer">
                                <Bot className="h-5 w-5" />
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
                <div className="flex-1 flex items-center justify-end gap-4">
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
                  <UserNav />
                </div>
              </header>
              <main className="flex-1 overflow-y-auto bg-background">
                  {children}
              </main>
            </div>
          </div>
          <ActiveTimerIndicator />
        </SidebarViewProvider>
      </DndProviderWrapper>
    </SidebarProvider>
  );
}
