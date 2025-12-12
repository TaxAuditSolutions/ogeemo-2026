'use client';

import React, { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { isFirestorePermissionError, type FirestorePermissionError } from '@/firebase/errors';

/**
 * A client-side component that listens for Firestore permission errors
 * and displays them in the Next.js development error overlay.
 * This component does not render any visible UI in production.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (permissionError: FirestorePermissionError) => {
      if (process.env.NODE_ENV === 'development') {
        if (isFirestorePermissionError(permissionError)) {
          // Throwing the error here will cause Next.js to catch it and
          // display its rich development error overlay with the full context.
          setError(permissionError);
        }
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  if (error) {
    // Re-throwing the error inside the render cycle ensures Next.js catches it.
    throw error;
  }

  return null; // This component does not render anything itself.
}
