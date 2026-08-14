import type { AccessLevel } from '@/core/user-profile-service';

// Shared role hierarchy used by both server actions and client UI gating.
// super_admin is the top authority for ANY tenant (master or regular) -- isMasterTenant
// is an orthogonal flag that additionally grants cross-tenant lifecycle powers.
export const ROLE_WEIGHTS: Record<AccessLevel, number> = {
    super_admin: 4,
    org_admin: 3,
    editor: 2,
    viewer: 1,
};

export const ROLE_ORDER: AccessLevel[] = ['viewer', 'editor', 'org_admin', 'super_admin'];

export const ROLE_LABELS: Record<AccessLevel, string> = {
    super_admin: 'Super Admin (Tenant Owner)',
    org_admin: 'Admin (Full Access)',
    editor: 'Editor (Operational)',
    viewer: 'Viewer (Read-Only)',
};

/**
 * Strict target-role matrix: an actor may only manage (create/update/delete) users
 * whose role is strictly below their own. super_admin can manage all roles.
 */
export function canManageTargetRole(actingRole: AccessLevel | null | undefined, targetRole: AccessLevel): boolean {
    if (!actingRole) return false;
    if (actingRole === 'super_admin') return true;
    return ROLE_WEIGHTS[actingRole] > ROLE_WEIGHTS[targetRole];
}

/** Roles an acting user is allowed to assign to another user, for UI dropdown gating. */
export function getAssignableRoles(actingRole: AccessLevel | null | undefined, isMasterTenant: boolean): AccessLevel[] {
    if (!actingRole) return [];
    // super_admin is assignable by any existing super_admin within their own tenant --
    // isMasterTenant only gates tenant-lifecycle actions, not in-tenant role assignment.
    return ROLE_ORDER.filter((role) => canManageTargetRole(actingRole, role));
}

/** True if the acting user may open/see the User Manager module at all. */
export function canAccessUserManager(actingRole: AccessLevel | null | undefined): boolean {
    return actingRole === 'org_admin' || actingRole === 'super_admin';
}
