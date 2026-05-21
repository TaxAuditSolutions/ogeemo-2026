'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/core/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AccessLevel } from '@/core/user-profile-service';

export async function registerOrganization(data: { orgName: string; email: string; password?: string; name?: string }) {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth || !adminDb) {
        throw new Error('Firebase Admin SDK is not initialized.');
    }

    let createdUid: string | null = null;

    try {
        // 1. Create the user via Firebase Admin SDK
        const userRecord = await adminAuth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.name,
        });
        
        createdUid = userRecord.uid; // Track the UID in case we need to roll back

        // 2. Prepare the Firestore batch to ensure database writes are atomic
        const batch = adminDb.batch();

        // 3. Create the Organization document
        const orgRef = adminDb.collection('organizations').doc();
        const orgId = orgRef.id;

        batch.set(orgRef, {
            id: orgId,
            name: data.orgName,
            createdAt: FieldValue.serverTimestamp(),
            ownerUid: createdUid,
        });

        // 4. Create the User Profile document
        const userRef = adminDb.collection('users').doc(createdUid);
        batch.set(userRef, {
            id: createdUid,
            email: data.email,
            displayName: data.name || '',
            orgId: orgId,
            accessLevel: 'org_admin',
            mentorshipRole: 'Apprentice', // Default business logic role
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 5. Commit the batch writes to Firestore
        await batch.commit();

        // 6. Set Custom Claims (happens outside the batch, but rarely fails if auth is up)
        await adminAuth.setCustomUserClaims(createdUid, {
            orgId: orgId,
            accessLevel: 'org_admin'
        });

        return { success: true, orgId, uid: createdUid };

    } catch (error: any) {
        console.error("Error registering organization:", error);
        
        // ROLLBACK: If anything above failed, and we created a user, delete them to prevent zombies.
        if (createdUid) {
            try {
                await adminAuth.deleteUser(createdUid);
                console.log(`Rollback successful: Deleted orphaned user ${createdUid}`);
            } catch (rollbackError) {
                console.error("CRITICAL: Failed to rollback user creation", rollbackError);
            }
        }

        throw new Error(error.message || 'Failed to register organization');
    }
}

const ROLE_WEIGHTS: Record<AccessLevel, number> = {
    org_admin: 3,
    editor: 2,
    viewer: 1,
};

export async function inviteUser(data: { invitedEmail: string; targetRole: AccessLevel; orgId: string }) {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth || !adminDb) {
        throw new Error('Firebase Admin SDK is not initialized.');
    }

    // 1. Authentication & Authorization
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
        throw new Error("Unauthorized: No session cookie found.");
    }

    let decodedToken;
    try {
        decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
        throw new Error("Unauthorized: Invalid session cookie.");
    }

    const requestingAccessLevel = decodedToken.accessLevel as AccessLevel;
    const requestingOrgId = decodedToken.orgId as string;

    if (!requestingAccessLevel || !requestingOrgId) {
        throw new Error("Unauthorized: Missing custom claims.");
    }

    if (requestingOrgId !== data.orgId) {
        throw new Error("Unauthorized: Cross-tenant invitation attempted.");
    }

    // 2. Hierarchy Check
    const requestingWeight = ROLE_WEIGHTS[requestingAccessLevel] || 0;
    const targetWeight = ROLE_WEIGHTS[data.targetRole] || 0;

    // Allow org_admins to invite anyone (including other org_admins).
    // For everyone else, they must strictly invite roles LOWER than themselves.
    if (requestingAccessLevel === 'org_admin') {
        if (targetWeight > requestingWeight) {
            throw new Error("Unauthorized: Cannot invite a role higher than yourself.");
        }
    } else {
        if (requestingWeight <= targetWeight) {
            throw new Error(`Unauthorized: An ${requestingAccessLevel} cannot invite a ${data.targetRole} or equal role.`);
        }
    }

    let createdUid: string | null = null;

    try {
        // 3. User Creation
        const userRecord = await adminAuth.createUser({
            email: data.invitedEmail,
            // Password is intentionally omitted to require a reset/setup flow
        });
        
        createdUid = userRecord.uid;

        const batch = adminDb.batch();

        // 4. Create Profile
        const userRef = adminDb.collection('users').doc(createdUid);
        batch.set(userRef, {
            id: createdUid,
            email: data.invitedEmail,
            displayName: '', // They can set this later
            orgId: requestingOrgId,
            accessLevel: data.targetRole,
            mentorshipRole: 'Apprentice', // Default business logic role
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        await batch.commit();

        // 5. Set Claims
        await adminAuth.setCustomUserClaims(createdUid, {
            orgId: requestingOrgId,
            accessLevel: data.targetRole
        });

        // 6. Send Email (Generate Password Reset Link)
        const passwordResetLink = await adminAuth.generatePasswordResetLink(data.invitedEmail);
        
        // TODO: Integrate with an email provider (SendGrid, Postmark, etc.) here.
        // Example: await sendEmail(data.invitedEmail, 'You have been invited!', `Click here to join: ${passwordResetLink}`);
        console.log(`[INVITATION LINK GENERATED] -> ${data.invitedEmail}: ${passwordResetLink}`);

        return { success: true, uid: createdUid };
    } catch (error: any) {
        console.error("Error inviting user:", error);
        
        if (createdUid) {
            try {
                await adminAuth.deleteUser(createdUid);
            } catch (rollbackError) {
                console.error("CRITICAL: Failed to rollback user creation", rollbackError);
            }
        }
        throw new Error(error.message || 'Failed to invite user');
    }
}
