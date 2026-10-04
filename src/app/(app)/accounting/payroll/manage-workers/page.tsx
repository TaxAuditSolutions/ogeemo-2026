
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

export default function ManageWorkersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // The worker directory moved to its own landing page (/workers), which
    // reads the same consolidated records and can add workers directly.
    router.replace('/workers');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting to Workers...</p>
      </div>
    </div>
  );
}
