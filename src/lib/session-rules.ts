/**
 * Deciding a user's CURRENT role from the live records (pure; see tests/session-rules.test.ts).
 *
 * A signed-in person's role is copied into their sign-in token ("claims"), and the token is only refreshed
 * about once an hour. So after an admin demotes or removes someone, the old token keeps the old role. The
 * server now checks the live profile and removes a person's access by revoking their sign-in sessions.
 */
import { isAccessLevel } from '@/lib/access-rules';
import type { AccessLevel } from '@/core/user-profile-service';

export interface ClaimsLike {
  orgId?: unknown;
  accessLevel?: unknown;
  isMasterTenant?: unknown;
}

export interface ProfileLike {
  orgId?: unknown;
  accessLevel?: unknown;
}

/** A user's membership in a workspace other than their home one (users/{uid}/orgMemberships/{orgId}). */
export interface MembershipLike {
  accessLevel?: unknown;
  isMasterTenant?: unknown;
}

export interface LiveAccess {
  orgId?: string;
  accessLevel?: AccessLevel;
  isMasterTenant: boolean;
  /** Why the sign-in was refused, when it was. */
  revoked?: string;
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

/**
 * The access a request really has. The token says who and which workspace; the live records say whether that is
 * still true. A removed user (no profile) and a user whose profile has no role (access revoked) get no access,
 * whatever their token says.
 *
 * A person can belong to several workspaces: their profile names the home one and each other workspace is a
 * membership. When the token's workspace is not the profile's, the membership for that workspace decides; with
 * no valid membership the person has no access there.
 */
export function liveAccess(
  claims: ClaimsLike,
  profile: ProfileLike | null | undefined,
  membership?: MembershipLike | null
): LiveAccess {
  const orgId = text(claims.orgId);
  if (!orgId) return { isMasterTenant: false };
  if (!profile) return { isMasterTenant: false, revoked: 'Your access to this workspace was removed.' };

  const profileOrg = text(profile.orgId);
  const profileRole = isAccessLevel(profile.accessLevel) ? profile.accessLevel : undefined;
  if (profileOrg && profileOrg !== orgId) {
    // Working in another workspace: only a real membership there grants access, with the role it records.
    const memberRole = membership && isAccessLevel(membership.accessLevel) ? membership.accessLevel : undefined;
    if (!memberRole) return { isMasterTenant: false, revoked: 'Your workspace changed. Please sign in again.' };
    return { orgId, accessLevel: memberRole, isMasterTenant: claims.isMasterTenant === true && membership?.isMasterTenant === true && memberRole === 'super_admin' };
  }
  if (!profileRole) return { isMasterTenant: false, revoked: 'Your access to this workspace was removed.' };

  // The master-tenant flag only counts when the live role is still super_admin.
  return {
    orgId,
    accessLevel: profileRole,
    isMasterTenant: claims.isMasterTenant === true && profileRole === 'super_admin',
  };
}
