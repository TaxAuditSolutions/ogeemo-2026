
'use client';

import { useEffect, useState } from 'react';
import { FirebaseProvider, type FirebaseContextValue } from './provider';
import { initializeFirebase } from '@/firebase';

// This component ensures that Firebase is initialized only once on the client-side.
export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [services, setServices] = useState<FirebaseContextValue | null>(null);

  useEffect(() => {
    // The initializeFirebase function returns a promise, so we need to resolve it.
    initializeFirebase().then(setServices);
  }, []);

  // While Firebase is initializing, we can show a loader or nothing.
  // Returning null is fine for a brief moment.
  if (!services) {
    return null; 
  }

  return <FirebaseProvider value={services}>{children}</FirebaseProvider>;
}
