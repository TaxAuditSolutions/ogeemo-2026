'use server';

import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase-admin';

/**
 * Retrieves the current authenticated user's UID from the session cookie.
 * This is a server-side utility function used by API routes and server flows.
 * 
 * @returns The user's UID if authenticated, or null if no valid session exists.
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return null;
    }

    const adminAuth = getAdminAuth();
    // Verification with 'true' checks if the token has been revoked
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken.uid;
  } catch (error) {
    // If the cookie is expired or invalid, we simply return null
    // rather than throwing, allowing the caller to handle unauthorized access.
    return null;
  }
}
