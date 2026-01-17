'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

// This test page is now obsolete and redirects to the login page.
export default function AuthTestRedirectPage() {
  useEffect(() => {
    redirect('/login');
  }, []);

  return null;
}
