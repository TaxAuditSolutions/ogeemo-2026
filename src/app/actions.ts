'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/core/firebase-admin';
import { liveAccess } from '@/lib/session-rules';

export type SessionAccessLevel = 'super_admin' | 'org_admin' | 'editor' | 'viewer';

export interface CurrentSessionContext {
  userId: string;
  orgId?: string;
  accessLevel?: SessionAccessLevel;
  isMasterTenant: boolean;
}

/**
 * Who is making this request, and what they may do RIGHT NOW.
 *
 * The session cookie only proves who the person is. Their workspace and role are copied into it when it is
 * made and are not refreshed for days, so an admin who demotes or removes someone used to change nothing until
 * that person signed in again. The role is now read from the live profile on every request (liveAccess): a
 * demotion applies at once, and a removed user (no profile) gets no workspace and no role.
 *
 * The cookie is also checked against revoked sessions, so revoking a person's sessions signs them out here too.
 */
export async function getCurrentSessionContext(): Promise<CurrentSessionContext | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) return null;

    const adminAuth = getAdminAuth();
    let decodedToken: Record<string, unknown>;

    if (!adminAuth && sessionCookie.startsWith('dev_mock_')) {
      // Local development without service-account credentials only; a hosted build always has Admin credentials.
      if (process.env.NODE_ENV === 'production') return null;
      decodedToken = { uid: sessionCookie.replace('dev_mock_', '') };
    } else if (adminAuth) {
      // `true` also rejects a session whose user was disabled or had their sessions revoked.
      decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } else {
      return null;
    }

    const userId = typeof decodedToken.uid === 'string' ? decodedToken.uid : '';
    if (!userId) return null;

    const db = getAdminDb();
    const profile = db ? (await db.collection('users').doc(userId).get()).data() : undefined;
    // Working in a workspace other than the profile's own: the membership for it decides.
    const tokenOrg = typeof decodedToken.orgId === 'string' ? decodedToken.orgId : '';
    const membership = db && profile && tokenOrg && typeof profile.orgId === 'string' && profile.orgId !== tokenOrg
      ? (await db.collection('users').doc(userId).collection('orgMemberships').doc(tokenOrg).get()).data() ?? null
      : null;

    // With no database (local development) the token is all there is; otherwise the live profile decides.
    const access = db
      ? liveAccess(decodedToken, profile ?? null, membership)
      : { orgId: typeof decodedToken.orgId === 'string' ? decodedToken.orgId : undefined, accessLevel: undefined, isMasterTenant: false };

    // A person with a profile but no workspace token yet (first sign-in) falls back to the profile.
    const orgId = access.orgId ?? (access.revoked ? undefined : (typeof profile?.orgId === 'string' ? profile.orgId : undefined));
    const accessLevel = access.accessLevel ?? (access.revoked ? undefined : liveAccess({ orgId: orgId ?? 'x' }, { orgId: orgId ?? 'x', accessLevel: profile?.accessLevel }).accessLevel);

    return { userId, orgId, accessLevel, isMasterTenant: access.isMasterTenant };
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
