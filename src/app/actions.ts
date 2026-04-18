'use server';

import { cookies } from 'next/headers';
import { getAdminAuth } from '@/core/firebase-admin';

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
      console.warn("Auth Action: No 'session' cookie found in request.");
      return null;
    }

    const adminAuth = getAdminAuth();
    if (!adminAuth) {
        if (sessionCookie.startsWith('dev_mock_')) {
            console.warn("Auth Action: Admin SDK not initialized. Using dev mock session.");
            return sessionCookie.replace('dev_mock_', '');
        }
        console.warn("Auth Action: Admin SDK not initialized. Returning unauthenticated state.");
        return null;
    }
    
    // Signature verification only (checkRevoked: false) for maximum performance 
    // and resilience in development/prototyping environments.
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, false);
    return decodedToken.uid;
  } catch (error: any) {
    console.error("Auth Action: Failed to verify session cookie.", error.message);
    return null;
  }
}
