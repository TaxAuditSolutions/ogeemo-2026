// src/app/actions.ts
'use server';

import { getAdminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

/**
 * A server action to reliably get the current user's UID from the session cookie.
 * This is the recommended pattern for accessing user identity in Server Components and API Routes.
 */
export async function getCurrentUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    if (!sessionCookie) {
        console.log("Server Action: No session cookie found.");
        return null;
    }
    try {
        const adminAuth = getAdminAuth();
        const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        return decodedToken.uid;
    } catch (error) {
        console.error('Server Action: Error verifying session cookie:', error);
        // Clear the invalid cookie
        cookieStore.delete('session');
        return null;
    }
}
