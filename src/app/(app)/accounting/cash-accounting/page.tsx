
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

export default function CashAccountingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Permanent redirect to the new Petty Cash hub
    router.replace('/accounting/petty-cash');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting to Petty Cash...</p>
      </div>
    </div>
  );
}
