'use server';

import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase-admin';

/**
 * Retrieves the current authenticated user's UID from the session cookie.
 * This is a server-side utility function used by Server Actions and API routes.
 * 
 * @returns The user's UID if authenticated, or null if no valid session exists.
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      console.warn("Auth Action: No session cookie found.");
      return null;
    }

    const adminAuth = getAdminAuth();
    
    // We set checkRevoked to false for the prototype to avoid permission/latency issues.
    // This still verifies the signature and expiration of the cookie.
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, false);
    return decodedToken.uid;
  } catch (error: any) {
    console.error("Auth Action: Failed to verify session cookie.", error.message);
    return null;
  }
}
