import type { ReactNode } from "react";
import { AuthProvider } from '@/context/auth-context';
import { LoadingProvider } from '@/context/loading-context';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { fontBody, fontHeadline, fontOrbitron } from '@/lib/fonts';
import "./globals.css";

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
