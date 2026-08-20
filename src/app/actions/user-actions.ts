'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/core/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AccessLevel } from '@/core/user-profile-service';
import { canManageTargetRole } from '@/core/rbac';

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
        throw new Error(error.message || 'Failed to create user');
    }
}