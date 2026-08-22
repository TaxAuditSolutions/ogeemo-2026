'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/core/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AccessLevel } from '@/core/user-profile-service';
import { canManageTargetRole } from '@/core/rbac';

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
}) {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    if (!adminAuth || !adminDb) {
        throw new Error('Firebase Admin SDK is not initialized.');
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) {
        throw new Error('Unauthorized: No session cookie found.');
    }

    let decodedToken;
    try {
        decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
        throw new Error('Unauthorized: Invalid session cookie.');
    }

    const requestingAccessLevel = decodedToken.accessLevel as AccessLevel;
    const requestingOrgId = decodedToken.orgId as string;

    if (!requestingAccessLevel || !requestingOrgId) {
        throw new Error('Unauthorized: Missing custom claims.');
    }

    const userRef = adminDb.collection('users').doc(data.targetUid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        throw new Error('Target user not found.');
    }

    const targetOrgId = userSnap.data()?.orgId as string | undefined;
    const currentTargetRole = userSnap.data()?.accessLevel as AccessLevel | undefined;

    if (!targetOrgId || targetOrgId !== requestingOrgId) {
        throw new Error('Unauthorized: Cross-tenant update attempted.');
    }

    // Don't allow editing super admins unless you are a super admin
    if (currentTargetRole === 'super_admin' && requestingAccessLevel !== 'super_admin') {
        throw new Error('Unauthorized: Cannot edit a super admin.');
    }

    // Build update object
    const updateData: { [key: string]: any } = {
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.employeeNumber !== undefined) updateData.employeeNumber = data.employeeNumber;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Update the profile
    await userRef.update(updateData);

    // Update auth user display name if provided
    if (data.displayName !== undefined) {
        try {
            await adminAuth.updateUser(data.targetUid, { displayName: data.displayName });
        } catch (e) {
            console.error('Failed to update Auth display name:', e);
        }
    }

    // Update access level if changed
    if (data.newRole !== undefined && data.newRole !== (currentTargetRole || 'none')) {
        if (currentTargetRole === 'super_admin') {
            throw new Error('The Super Admin authority level cannot be changed.');
        }

        if (data.targetUid === decodedToken.uid) {
            throw new Error('Unauthorized: Use another admin account to change your own role.');
        }

        if (!canManageTargetRole(requestingAccessLevel, currentTargetRole || 'viewer')) {
            throw new Error(`Unauthorized: An ${requestingAccessLevel} cannot manage a ${currentTargetRole} user.`);
        }

        if (data.newRole !== 'none' && !canManageTargetRole(requestingAccessLevel, data.newRole)) {
            throw new Error(`Unauthorized: An ${requestingAccessLevel} cannot assign the ${data.newRole} role.`);
        }

        if (data.newRole === 'none') {
            await userRef.update({
                accessLevel: FieldValue.delete(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            await adminAuth.setCustomUserClaims(data.targetUid, {
                orgId: requestingOrgId,
                isMasterTenant: false,
            });
        } else {
            await userRef.update({
                accessLevel: data.newRole,
                updatedAt: FieldValue.serverTimestamp(),
            });
            await adminAuth.setCustomUserClaims(data.targetUid, {
                orgId: requestingOrgId,
                accessLevel: data.newRole,
                isMasterTenant: false,
            });
        }
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
}) {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    if (!adminAuth || !adminDb) {
        throw new Error('Firebase Admin SDK is not initialized.');
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) {
        throw new Error('Unauthorized: No session cookie found.');
    }

    let decodedToken;
    try {
        decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
        throw new Error('Unauthorized: Invalid session cookie.');
    }

    const requestingAccessLevel = decodedToken.accessLevel as AccessLevel;
    const requestingOrgId = decodedToken.orgId as string;

    if (!requestingAccessLevel || !requestingOrgId) {
        throw new Error('Unauthorized: Missing custom claims.');
    }

    if (!canManageTargetRole(requestingAccessLevel, data.accessLevel)) {
        throw new Error(`Unauthorized: An ${requestingAccessLevel} cannot assign the ${data.accessLevel} role.`);
    }

    // Pre-check: Firebase Auth requires unique email addresses across the entire project.
    if (await isEmailAlreadyInUse(adminAuth, data.email)) {
        throw new Error(formatEmailExistsError(data.email));
    }

    let createdUid: string | null = null;
    try {
        const userRecord = await adminAuth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.name,
        });
        createdUid = userRecord.uid;

        const userRef = adminDb.collection('users').doc(createdUid);
        await userRef.set({
            id: createdUid,
            email: data.email,
            displayName: data.name || '',
            employeeNumber: data.employeeNumber || '',
            notes: data.notes || '',
            orgId: requestingOrgId,
            accessLevel: data.accessLevel,
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
        }
        if (error.code === 'auth/email-already-exists') {
            throw new Error(formatEmailExistsError(data.email));
        }
        throw new Error(error.message || 'Failed to create user');
    }
}
