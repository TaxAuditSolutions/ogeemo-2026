'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function DeprecatedImageGeneratorPage() {
  useEffect(() => {
    // This page is deprecated. Redirecting to the main Image Manager.
    redirect('/image-manager');
  }, []);

  return null; // Return null while the redirect is processed.
}
