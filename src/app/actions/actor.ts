/**
 * Who is calling a user-management server action (server only).
 *
 * These actions used to read the caller's role from the session cookie's claims, which can be days out of date,
 * so a demoted or removed admin kept admin powers until their cookie expired. The role now comes from the live
 * profile through getCurrentSessionContext. This file is deliberately NOT a 'use server' module: it exports a
 * plain helper, not an endpoint the browser could call.
 */
import { getCurrentSessionContext } from '@/app/actions';
import { getAdminAuth, getAdminDb } from '@/core/firebase-admin';
import type { Actor } from '@/lib/access-rules';

export interface ActorContext {
  actor: Actor;
  adminAuth: NonNullable<ReturnType<typeof getAdminAuth>>;
  adminDb: NonNullable<ReturnType<typeof getAdminDb>>;
}

export async function requireActor(): Promise<ActorContext> {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK is not initialized.');

  const session = await getCurrentSessionContext();
  if (!session) throw new Error('Unauthorized: Please sign in again.');
  if (!session.accessLevel || (!session.orgId && !session.isMasterTenant)) {
    throw new Error('Unauthorized: Your access to this workspace was removed or has not been set up.');
  }
  return {
    actor: { uid: session.userId, orgId: session.orgId, accessLevel: session.accessLevel, isMasterTenant: session.isMasterTenant },
    adminAuth,
    adminDb,
  };
}

/**
 * Takes a person's access away NOW. Their profile is deleted by the caller; this ends the sign-ins that are
 * already open (a removed user used to stay signed in, with their old role, until the token expired) and clears
 * the workspace from their account so a new sign-in does not bring it back. The account itself is kept, because a
 * person may belong to other workspaces.
 */
export async function revokeWorkspaceAccess(
  adminAuth: NonNullable<ReturnType<typeof getAdminAuth>>,
  uid: string,
  orgId: string
): Promise<void> {
  try {
    const record = await adminAuth.getUser(uid);
    const claims = { ...(record.customClaims ?? {}) } as Record<string, unknown>;
    if (claims.orgId === orgId) {
      delete claims.orgId;
      delete claims.accessLevel;
      delete claims.isMasterTenant;
      await adminAuth.setCustomUserClaims(uid, claims);
    }
    await adminAuth.revokeRefreshTokens(uid);
  } catch (error: any) {
    // The profile is already gone, so the live check still denies them; log so a stuck account can be found.
    console.error(`[Access] Could not revoke sessions for ${uid}:`, error?.message ?? error);
  }
}

/** Ends a person's open sign-ins after a role change so the new role is what their next request sees. */
export async function refreshSessionsAfterRoleChange(
  adminAuth: NonNullable<ReturnType<typeof getAdminAuth>>,
  uid: string
): Promise<void> {
  try {
    await adminAuth.revokeRefreshTokens(uid);
  } catch (error: any) {
    console.error(`[Access] Could not refresh sessions for ${uid}:`, error?.message ?? error);
  }
}
