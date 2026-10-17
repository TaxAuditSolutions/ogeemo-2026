import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from '@/context/auth-context';
import { LoadingProvider } from '@/context/loading-context';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { fontBody, fontHeadline, fontOrbitron } from '@/lib/fonts';
import "./globals.css";

/**
 * Site-wide SEO defaults. Every marketing page previously shipped with no
 * <title> or meta description at all. Marketing routes override these via
 * per-route layout.tsx files (their pages are client components, so metadata
 * must live in a server file); authenticated app pages inherit the default.
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://app.ogeemo.com'),
  title: {
    default: 'Ogeemo — One Business. One System.',
    template: '%s | Ogeemo',
  },
  description:
    'Ogeemo is one system for your books, clients, quoting, and time — instead of disconnected apps. An anti-greed, success-scaled business operating system.',
  openGraph: {
    siteName: 'Ogeemo',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(fontBody.variable, fontHeadline.variable, fontOrbitron.variable, "font-body")}>
        <AuthProvider>
          <LoadingProvider>
            <FirebaseErrorListener />
            {children}
            <Toaster />
          </LoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
