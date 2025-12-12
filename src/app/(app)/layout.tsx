
'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { DndProviderWrapper } from '@/components/layout/dnd-provider-wrapper';
import { MainMenu } from '@/components/layout/main-menu';
import { ActiveTimerIndicator } from '@/components/layout/active-timer-indicator';
import { Sidebar, SidebarTrigger } from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LayoutDashboard, Bot, LoaderCircle } from 'lucide-react';
import { SidebarViewProvider } from '@/context/sidebar-view-context';

// Dynamically import the ClientLayout to ensure it's in a separate client-side chunk
const ClientLayout = dynamic(
  () => import('@/components/layout/client-layout').then((mod) => mod.ClientLayout),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    ),
  }
);


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientLayout>
      <DndProviderWrapper>
        <SidebarViewProvider>
          <div className="flex h-screen w-full bg-muted">
            {/* Sidebar */}
            <Sidebar className="hidden h-full w-[16rem] flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
              <div className="flex h-16 shrink-0 items-center justify-center border-b border-white/20 px-4 lg:px-6">
                <Logo />
              </div>
              <div className="flex-1 overflow-y-auto pt-4">
                <MainMenu />
              </div>
            </Sidebar>
            
            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <header className="flex h-16 items-center justify-between gap-4 bg-gradient-to-r from-[#3DD5C0] to-[#1E8E86] px-4 md:px-6">
                 <div className="flex items-center gap-4">
                   <SidebarTrigger className="md:hidden" />
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
                          <p>Action Manager</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                 </div>
                 <div className="flex justify-center">
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button asChild className="h-9 px-4 bg-card text-card-foreground hover:bg-card/90">
                                <Link href="/command-centre">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                        <span className="font-bold">OGEEMO</span>
                                    </div>
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Open Command Centre</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button asChild className="h-9 px-4 bg-card text-card-foreground hover:bg-card/90">
                                <a href="https://gemini.google.com/app" target="_blank" rel="noopener noreferrer">
                                    <div className="flex items-center gap-2">
                                        <Bot className="h-4 w-4" />
                                        <span className="font-bold">Gemini</span>
                                    </div>
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Open Gemini</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
                <div className="flex items-center gap-4">
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
    </ClientLayout>
  );
}
