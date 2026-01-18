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

  // Pass null services down during SSR and initial client render.
  // Components that use these services are responsible for handling the null case,
  // typically by showing a loading state. This prevents a major hydration mismatch.
  return <FirebaseProvider value={services || { app: null, auth: null, db: null, functions: null, storage: null }}>{children}</FirebaseProvider>;
}
