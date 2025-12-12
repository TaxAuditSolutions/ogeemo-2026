'use client';

import { SidebarProvider } from '@/components/ui/sidebar';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      {children}
    </SidebarProvider>
  );
}
