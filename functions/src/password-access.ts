/**
 * Who may change whose password (pure; unit tested in tests/functions-password-access.test.ts).
 *
 * The function used to check only that the CALLER held an admin role in some workspace, so an admin of one
 * workspace could set the password of any user in any other workspace (and of a Super Admin in their own).
 * The caller's role and workspace are now read from the LIVE profile, and the target's workspace and role are
 * compared with them. This mirrors mayResetPassword in src/lib/access-rules.ts.
 */
export type Role = "super_admin" | "org_admin" | "editor" | "viewer";

const WEIGHT: Record<Role, number> = { super_admin: 4, org_admin: 3, editor: 2, viewer: 1 };

export function asRole(value: unknown): Role | undefined {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(WEIGHT, value) ? (value as Role) : undefined;
}

export interface PasswordActor {
  uid: string;
  /** From the live profile, not the token. */
  role?: Role;
  orgId?: string;
  /** The token says so AND the live role is still super_admin. */
  isPlatformAdmin: boolean;
}

export interface PasswordTarget {
  uid: string;
  role?: Role;
  orgId?: string;
}

export type PasswordDecision = { ok: true } | { ok: false; message: string };

export function mayChangePassword(actor: PasswordActor, target: PasswordTarget): PasswordDecision {
  if (actor.uid === target.uid) return { ok: true };
  if (actor.role !== "org_admin" && actor.role !== "super_admin") {
    return { ok: false, message: "You are not allowed to change this password." };
  }
  if (actor.isPlatformAdmin) return { ok: true };
  if (!actor.orgId || !target.orgId || actor.orgId !== target.orgId) {
    return { ok: false, message: "You can only change passwords for people in your own workspace." };
  }
  if (actor.role !== "super_admin" && WEIGHT[actor.role] <= WEIGHT[target.role ?? "viewer"]) {
    return { ok: false, message: "You can only change passwords for people with a lower role than yours." };
  }
  return { ok: true };
}

/** True when the password has 8+ characters with upper and lower case, a number and a symbol. */
export function isStrongPassword(password: unknown): password is string {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password)
  );
}
