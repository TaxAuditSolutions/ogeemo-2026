'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

/**
 * @fileOverview Redirects the app root to the welcome page.
 */
export default function AppPageRoot() {
  useEffect(() => {
    redirect('/welcome');
  }, []);

  return null;
}
