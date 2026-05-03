'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AboutContent } from '@/components/landing/about-content';

/**
 * @fileOverview The root landing page.
 * If logged in, redirects to the welcome page.
 * If not logged in, displays the About content as the home page.
 */
export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/welcome');
    }
  }, [user, isLoading, router]);

  // While checking auth status, we'll show the landing page by default
  // to make the initial load feel fast (it will flash/switch if logged in)
  if (user && !isLoading) {
    return null; // Let the useEffect handle the redirect
  }

  return <AboutContent />;
}
