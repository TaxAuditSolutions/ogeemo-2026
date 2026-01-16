
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

export default function LogoutPage() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function performLogout() {
      await logout();
      // The AuthProvider will handle redirecting to /login automatically,
      // but we push here for a faster redirect client-side.
      router.push('/login');
    }
    performLogout();
  }, [logout, router]);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Logging out...</p>
      </div>
    </div>
  );
}
