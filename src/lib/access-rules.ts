/**
 * Who may manage whom (pure; see tests/access-rules.test.ts).
 *
 * The rules used to be repeated, slightly differently, in rbac.ts, three server actions and the Firestore rules.
 * The server-side decisions now come from here, so a user-management action asks one place "may this person do
 * this to that person", and the answer is the same everywhere.
 */
import { ROLE_WEIGHTS, canManageTargetRole } from '@/core/rbac';
import type { AccessLevel } from '@/core/user-profile-service';

export interface Actor {
  uid: string;
  orgId?: string;
  accessLevel?: AccessLevel;
  isMasterTenant?: boolean;
}

export interface Target {
  uid: string;
  orgId?: string | null;
  accessLevel?: AccessLevel | null;
}

export type Decision = { ok: true } | { ok: false; error: string };

const ok: Decision = { ok: true };
const no = (error: string): Decision => ({ ok: false, error });

/** True for a real role name; anything else (including a made-up string from the browser) is not a role. */
export function isAccessLevel(value: unknown): value is AccessLevel {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ROLE_WEIGHTS, value);
}

/** The master tenant's super admins may act across workspaces; nobody else may. */
export function isPlatformAdmin(actor: Pick<Actor, 'accessLevel' | 'isMasterTenant'>): boolean {
  return actor.isMasterTenant === true && actor.accessLevel === 'super_admin';
}

/** Why this actor may not act on this person's workspace, or ok. */
export function sameWorkspace(actor: Actor, target: Target): Decision {
  if (!actor.accessLevel || (!isPlatformAdmin(actor) && !actor.orgId)) return no('Unauthorized: Missing custom claims.');
  if (!target.orgId) return no('Unauthorized: That user does not belong to a workspace.');
  if (!isPlatformAdmin(actor) && target.orgId !== actor.orgId) return no('Unauthorized: Cross-workspace change attempted.');
  return ok;
}

/** Editing a user's profile details (name, notes, menu access), not their role. */
export function mayEditUser(actor: Actor, target: Target): Decision {
  const scope = sameWorkspace(actor, target);
  if (!scope.ok) return scope;
  if (actor.uid === target.uid) return ok;
  if (!canManageTargetRole(actor.accessLevel, (target.accessLevel as AccessLevel) || 'viewer')) {
    return no(`Unauthorized: An ${actor.accessLevel} cannot manage a ${target.accessLevel || 'viewer'} user.`);
  }
  return ok;
}

/**
 * Changing a user's role (or revoking access with 'none'). The workspace owner keeps the top role, nobody changes
 * their own role, and the actor must outrank both the current and the new role.
 */
export function mayChangeRole(actor: Actor, target: Target, newRole: AccessLevel | 'none'): Decision {
  if (newRole !== 'none' && !isAccessLevel(newRole)) return no('That is not a valid role.');
  const scope = sameWorkspace(actor, target);
  if (!scope.ok) return scope;
  if (actor.uid === target.uid) return no('Unauthorized: Use another admin account to change your own role.');
  if (target.accessLevel === 'super_admin') {
    return no('The Super Admin authority level cannot be changed. Every tenant must keep at least one Super Admin.');
  }
  if (!canManageTargetRole(actor.accessLevel, target.accessLevel || 'viewer')) {
    return no(`Unauthorized: An ${actor.accessLevel} cannot manage a ${target.accessLevel || 'viewer'} user.`);
  }
  if (newRole !== 'none' && !canManageTargetRole(actor.accessLevel, newRole)) {
    return no(`Unauthorized: An ${actor.accessLevel} cannot assign the ${newRole} role.`);
  }
  return ok;
}

/** Creating or inviting someone into the actor's own workspace with `role`. */
export function mayInvite(actor: Actor, workspaceId: string | undefined, role: unknown): Decision {
  if (!actor.accessLevel || (!isPlatformAdmin(actor) && !actor.orgId)) return no('Unauthorized: Missing custom claims.');
  if (!isAccessLevel(role)) return no('That is not a valid role.');
  if (!isPlatformAdmin(actor) && actor.orgId !== workspaceId) return no('Unauthorized: Cross-workspace invitation attempted.');
  if (!canManageTargetRole(actor.accessLevel, role)) return no(`Unauthorized: An ${actor.accessLevel} cannot assign the ${role} role.`);
  return ok;
}

/** Removing a person from a workspace. Nobody removes themselves, and the owner (top role) is never removed here. */
export function mayRemove(actor: Actor, target: Target): Decision {
  if (actor.uid === target.uid) return no('Unauthorized: Cannot remove your own account.');
  const scope = sameWorkspace(actor, target);
  if (!scope.ok) return scope;
  if (!canManageTargetRole(actor.accessLevel, (target.accessLevel as AccessLevel) || 'viewer')) {
    return no(`Unauthorized: An ${actor.accessLevel} cannot remove a ${target.accessLevel || 'viewer'} user.`);
  }
  return ok;
}

/**
 * Changing another person's password. The Cloud Function used to check only that the CALLER was an admin of any
 * workspace, so an admin of workspace A could reset the password of a user in workspace B.
 */
export function mayResetPassword(actor: Actor, target: Target): Decision {
  if (actor.uid === target.uid) return ok;
  if (actor.accessLevel !== 'org_admin' && actor.accessLevel !== 'super_admin') {
    return no('You are not allowed to change this password.');
  }
  return mayEditUser(actor, target);
}

/** Roles that may write business records (the same set the Firestore rules call editor-or-above). */
export function canWrite(level: unknown): boolean {
  return level === 'editor' || level === 'org_admin' || level === 'super_admin';
}

/** Roles that may administer a workspace. */
export function isAdminRole(level: unknown): boolean {
  return level === 'org_admin' || level === 'super_admin';
}
