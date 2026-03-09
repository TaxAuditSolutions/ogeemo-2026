
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

/**
 * @fileOverview Redirection for deprecated User List.
 * System identities are now searchable and manageable within the Contact Hub.
 */
export default function UserListRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/contacts');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting to Synchronized Contact Hub...</p>
      </div>
    </div>
  );
}
