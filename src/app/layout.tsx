
import type { ReactNode } from "react";
import { Inter, Orbitron } from 'next/font/google';
import { AuthProvider } from '@/context/auth-context';
import { LoadingProvider } from '@/context/loading-context';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import "./globals.css";

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '600', '700'],
});

const fontHeadline = Inter({
  subsets: ['latin'],
  variable: '--font-headline',
  weight: ['700'],
});

export const fontOrbitron = Orbitron({
    subsets: ['latin'],
    variable: '--font-orbitron',
    weight: ['700'],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(fontBody.variable, fontHeadline.variable, fontOrbitron.variable, "font-body")}>
        <AuthProvider>
          <LoadingProvider>
            {children}
            <Toaster />
          </LoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
