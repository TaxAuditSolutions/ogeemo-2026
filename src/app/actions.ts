'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/core/firebase-admin';

export type SessionAccessLevel = 'super_admin' | 'org_admin' | 'editor' | 'viewer';

export interface CurrentSessionContext {
  userId: string;
  orgId?: string;
  accessLevel?: SessionAccessLevel;
  isMasterTenant: boolean;
}

const ACCESS_LEVELS = new Set<SessionAccessLevel>(['super_admin', 'org_admin', 'editor', 'viewer']);

export async function getCurrentSessionContext(): Promise<CurrentSessionContext | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) return null;

    const adminAuth = getAdminAuth();
    let decodedToken: Record<string, unknown>;

    if (!adminAuth && sessionCookie.startsWith('dev_mock_')) {
      decodedToken = { uid: sessionCookie.replace('dev_mock_', '') };
    } else if (adminAuth) {
      decodedToken = await adminAuth.verifySessionCookie(sessionCookie, false);
    } else {
      return null;
    }

    const userId = typeof decodedToken.uid === 'string' ? decodedToken.uid : '';
    if (!userId) return null;

    let orgId = typeof decodedToken.orgId === 'string' ? decodedToken.orgId : undefined;
    let accessLevel = ACCESS_LEVELS.has(decodedToken.accessLevel as SessionAccessLevel)
      ? decodedToken.accessLevel as SessionAccessLevel
      : undefined;
    let isMasterTenant = decodedToken.isMasterTenant === true;

    if (!orgId || !accessLevel) {
      const db = getAdminDb();
      const profile = db ? (await db.collection('users').doc(userId).get()).data() : undefined;
      const profileAccessLevel = profile?.accessLevel;
      orgId = orgId || (typeof profile?.orgId === 'string' ? profile.orgId : undefined);
      accessLevel = accessLevel || (ACCESS_LEVELS.has(profileAccessLevel) ? profileAccessLevel : undefined);
      isMasterTenant = isMasterTenant || profile?.isMasterTenant === true;
    }

    return { userId, orgId, accessLevel, isMasterTenant };
  } catch (error: any) {
    console.error('Auth Action: Failed to resolve session context.', error.message);
    return null;
  }
}

/**
 * Retrieves the current authenticated user's UID from the session cookie.
 * This is a server-side utility function used by Server Actions and API routes.
 * 
 * @returns The user's UID if authenticated, or null if no valid session exists.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const context = await getCurrentSessionContext();
  return context?.userId ?? null;
}
