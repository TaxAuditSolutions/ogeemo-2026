
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

export default function UserListRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // The User List is now consolidated into the Contacts Hub.
    router.replace('/contacts');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting to Contacts Hub...</p>
      </div>
    </div>
  );
}
