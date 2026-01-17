
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { LoaderCircle } from 'lucide-react';

export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    // The logout function in the auth context now handles the full sign-out
    // process, including the redirect, so we just need to call it.
    logout();
  }, [logout]);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Logging out...</p>
      </div>
    </div>
  );
}
