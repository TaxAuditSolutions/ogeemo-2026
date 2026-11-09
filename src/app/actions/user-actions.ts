'use server';

import { getAdminAuth, getAdminDb } from '@/core/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AccessLevel, SidebarAccessConfig } from '@/core/user-profile-service';
import { isAdminRole, mayChangeRole, mayEditUser, mayInvite } from '@/lib/access-rules';
import { oneLine } from '@/lib/ai-input';
import { strongPasswordSchema } from '@/lib/password-policy';
import { refreshSessionsAfterRoleChange, requireActor } from '@/app/actions/actor';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Formats a user-friendly error message when an email is already registered in Firebase Auth.
 * Firebase Auth enforces unique email addresses across the entire project, so each user must
 * have a distinct email. Email aliases (plus addressing) are suggested as a workaround since
 * most providers deliver them to the same inbox.
 */
function formatEmailExistsError(email: string): string {
    const aliasEmail = email.replace('@', '+admin@');
    return (
        `The email "${email}" is already registered to a Firebase Auth account. ` +
        `Each user must have a unique email address. ` +
        `Use a different email, or try an alias like "${aliasEmail}" ` +
        `which most email providers deliver to the same inbox.`
    );
}

/**
 * Pre-checks whether an email is already registered in Firebase Auth.
 * Returns true if the email is taken, false if available.
 */
async function isEmailAlreadyInUse(adminAuth: NonNullable<ReturnType<typeof getAdminAuth>>, email: string): Promise<boolean> {
    try {
        await adminAuth.getUserByEmail(email);
        return true;
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/email-not-found') {
            return false;
        }
        console.error('Unexpected error during email pre-check:', error);
        return false; // Don't block — let createUser handle it
    }
}

/**
 * Updates an existing user's profile within the requester's own tenant using the Firebase Admin SDK.
 * This bypasses client-side Firestore security rules that block direct writes on hosted environments.
 */
export async function updateUserInTenant(data: {
    targetUid: string;
    displayName?: string;
    employeeNumber?: string;
    notes?: string;
    newRole?: AccessLevel | 'none';
    sidebarAccess?: SidebarAccessConfig;
}) {
    const { actor, adminAuth, adminDb } = await requireActor();

    const userRef = adminDb.collection('users').doc(data.targetUid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        throw new Error('Target user not found.');
    }
    const target = {
        uid: data.targetUid,
        orgId: userSnap.data()?.orgId as string | undefined,
        accessLevel: userSnap.data()?.accessLevel as AccessLevel | undefined,
    };

    // Every check runs BEFORE anything is written. This used to save the profile edits first and only then refuse the
    // role change, so a refused request still changed the person's name, notes and menu access.
    const mayEdit = mayEditUser(actor, target);
    if (!mayEdit.ok) throw new Error(mayEdit.error);
    const roleChange = data.newRole !== undefined && data.newRole !== (target.accessLevel || 'none');
    if (roleChange) {
        const mayRole = mayChangeRole(actor, target, data.newRole as AccessLevel | 'none');
        if (!mayRole.ok) throw new Error(mayRole.error);
    }
    if (data.sidebarAccess !== undefined && actor.uid === target.uid && !isAdminRole(actor.accessLevel)) {
        throw new Error('Unauthorized: Only an administrator can change menu access.');
    }

    const updateData: { [key: string]: any } = {
        updatedAt: FieldValue.serverTimestamp(),
    };
    if (data.displayName !== undefined) updateData.displayName = oneLine(data.displayName, 120);
    if (data.employeeNumber !== undefined) updateData.employeeNumber = oneLine(data.employeeNumber, 40);
    if (data.notes !== undefined) updateData.notes = String(data.notes).slice(0, 2000);
    if (data.sidebarAccess !== undefined) {
        updateData.sidebarAccess = data.sidebarAccess.mode === 'inherit' ? { mode: 'inherit' } : data.sidebarAccess;
    }
    if (roleChange) {
        updateData.accessLevel = data.newRole === 'none' ? FieldValue.delete() : data.newRole;
    }

    await userRef.update(updateData);

    if (data.displayName !== undefined) {
        try {
            await adminAuth.updateUser(data.targetUid, { displayName: updateData.displayName });
        } catch (e) {
            console.error('Failed to update Auth display name:', e);
        }
    }

    if (roleChange) {
        await adminAuth.setCustomUserClaims(data.targetUid, {
            orgId: target.orgId,
            ...(data.newRole === 'none' ? {} : { accessLevel: data.newRole }),
            isMasterTenant: false,
        });
        // The person's open sign-ins carry the old role; end them so the new role is what applies next.
        await refreshSessionsAfterRoleChange(adminAuth, data.targetUid);
    }

    return { success: true };
}

/**
 * Creates a new user within the requester's own tenant using the Firebase Admin SDK.
 * This avoids client-side domain authorization issues on hosted environments.
 */
export async function createUserInTenant(data: {
    email: string;
    password: string;
    name?: string;
    employeeNumber?: string;
    notes?: string;
    accessLevel: AccessLevel;
    sidebarAccess?: SidebarAccessConfig;
}) {
    const { actor, adminAuth, adminDb } = await requireActor();

    const allowed = mayInvite(actor, actor.orgId, data.accessLevel);
    if (!allowed.ok) throw new Error(allowed.error);

    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new Error('Enter a valid email address.');
    const strength = strongPasswordSchema.safeParse(data.password);
    if (!strength.success) throw new Error(strength.error.issues[0]?.message ?? 'Choose a stronger password.');
    const requestingOrgId = actor.orgId as string;

    // Pre-check: Firebase Auth requires unique email addresses across the entire project.
    if (await isEmailAlreadyInUse(adminAuth, email)) {
        throw new Error(formatEmailExistsError(email));
    }

    let createdUid: string | null = null;
    try {
        const userRecord = await adminAuth.createUser({
            email,
            password: data.password,
            displayName: data.name ? oneLine(data.name, 120) : undefined,
        });
        createdUid = userRecord.uid;

        const userRef = adminDb.collection('users').doc(createdUid);
        await userRef.set({
            id: createdUid,
            email,
            displayName: oneLine(data.name, 120),
            employeeNumber: oneLine(data.employeeNumber, 40),
            notes: String(data.notes ?? '').slice(0, 2000),
            orgId: requestingOrgId,
            accessLevel: data.accessLevel,
            sidebarAccess: data.sidebarAccess && data.sidebarAccess.mode !== 'inherit' ? data.sidebarAccess : { mode: 'inherit' },
            mentorshipRole: 'Apprentice',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        await adminAuth.setCustomUserClaims(createdUid, {
            orgId: requestingOrgId,
            accessLevel: data.accessLevel,
            isMasterTenant: false,
        });

        return { success: true, uid: createdUid };
    } catch (error: any) {
        if (createdUid) {
            try {
                await adminAuth.deleteUser(createdUid);
            } catch (rollbackError) {
                console.error('CRITICAL: Failed to rollback user creation', rollbackError);
            }
            try {
                await adminDb.collection('users').doc(createdUid).delete();
            } catch (rollbackError) {
                console.error('CRITICAL: Failed to roll back the profile of a failed user creation', rollbackError);
            }
        }
        if (error.code === 'auth/email-already-exists') {
            throw new Error(formatEmailExistsError(email));
        }
        throw new Error(error.message || 'Failed to create user');
    }
}
