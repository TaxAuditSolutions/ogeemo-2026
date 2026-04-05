'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

/**
 * @fileOverview The root landing page. 
 * Performs a "Golden Gate" redirection on the client-side to avoid 
 * server-side crashes due to missing Firebase Admin credentials.
 */
export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/welcome');
      } else {
        router.replace('/about');
      }
    }
  }, [user, isLoading, router]);

  // Render nothing or a minimal loading state while redirecting.
  // The AuthProvider already handles the global startup spinner.
  return null;
}
