'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/core/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AccessLevel } from '@/core/user-profile-service';
import { canManageTargetRole } from '@/core/rbac';

// Canonical tenant shape. isMasterTenant is true only for the single "Ogeemo"
// organization whose super_admins manage tenant lifecycle (see createTenantWithSuperAdmin).
export interface Organization {
    id: string;
    name: string;
    createdAt: any;
    updatedAt?: any;
    ownerUid: string;
    isMasterTenant: boolean;
}

async function requireMasterTenantSuperAdmin() {
    const adminAuth = getAdminAuth();
    if (!adminAuth) throw new Error('Firebase Admin SDK is not initialized.');

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) throw new Error('Unauthorized: No session cookie found.');

    let decodedToken;
    try {
        decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch {
        throw new Error('Unauthorized: Invalid session cookie.');
    }

    const accessLevel = decodedToken.accessLevel as AccessLevel | undefined;
    const isMasterTenant = decodedToken.isMasterTenant === true;

    if (accessLevel !== 'super_admin' || !isMasterTenant) {
        throw new Error('Unauthorized: Master tenant super admin required.');
    }

    return decodedToken;
}

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
            isMasterTenant: false,
        });

        // 4. Create the User Profile document
        const userRef = adminDb.collection('users').doc(createdUid);
        batch.set(userRef, {
            id: createdUid,
            email: data.email,
            displayName: data.name || '',
            orgId: orgId,
            accessLevel: 'super_admin',
            mentorshipRole: 'Apprentice', // Default business logic role
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // 5. Commit the batch writes to Firestore
        await batch.commit();

        // 6. Set Custom Claims (happens outside the batch, but rarely fails if auth is up)
        await adminAuth.setCustomUserClaims(createdUid, {
            orgId: orgId,
            accessLevel: 'super_admin',
            isMasterTenant: false,
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

    // 2. Hierarchy Check: strict matrix, target role must be strictly below the requester's role
    // (a super_admin may invite another super_admin within their own tenant).
    if (!canManageTargetRole(requestingAccessLevel, data.targetRole)) {
        throw new Error(`Unauthorized: An ${requestingAccessLevel} cannot invite a ${data.targetRole} role.`);
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
            accessLevel: data.targetRole,
            isMasterTenant: false,
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

/**
 * Changes a user's accessLevel within the requester's own tenant, enforcing the strict
 * target-role matrix, and keeps Firestore + custom claims in sync (fixes prior claims drift).
 */
export async function updateUserAccess(data: { targetUid: string; newRole: AccessLevel | 'none' }) {
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
        throw new Error('Unauthorized: Cross-tenant access change attempted.');
    }
    if (data.targetUid === decodedToken.uid) {
        throw new Error('Unauthorized: Use another admin account to change your own role.');
    }
    // Every tenant must retain its super admin, so that role is immutable once granted.
    if (currentTargetRole === 'super_admin') {
        throw new Error('The Super Admin authority level cannot be changed. Every tenant must keep at least one Super Admin.');
    }
    if (!canManageTargetRole(requestingAccessLevel, currentTargetRole || 'viewer')) {
        throw new Error(`Unauthorized: An ${requestingAccessLevel} cannot manage a ${currentTargetRole} user.`);
    }
    // 'none' (revoked access) is always below every real role, so any actor who can
    // manage the target's current role may also revoke it.
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
        return { success: true };
    }

    await userRef.update({
        accessLevel: data.newRole,
        updatedAt: FieldValue.serverTimestamp(),
    });

    await adminAuth.setCustomUserClaims(data.targetUid, {
        orgId: requestingOrgId,
        accessLevel: data.newRole,
        isMasterTenant: false,
    });

    return { success: true };
}

/**
 * Removes a user's profile from the tenant, enforcing the same target-role matrix as updateUserAccess.
 */
export async function removeUser(targetUid: string) {
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
    if (targetUid === decodedToken.uid) {
        throw new Error('Unauthorized: Cannot remove your own account.');
    }

    const userRef = adminDb.collection('users').doc(targetUid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        return { success: true }; // Already gone.
    }
    const targetData = userSnap.data() || {};

    if (targetData.orgId !== requestingOrgId) {
        throw new Error('Unauthorized: Cross-tenant removal attempted.');
    }
    if (!canManageTargetRole(requestingAccessLevel, targetData.accessLevel as AccessLevel)) {
        throw new Error(`Unauthorized: An ${requestingAccessLevel} cannot remove a ${targetData.accessLevel} user.`);
    }

    const batch = adminDb.batch();
    if (targetData.contactId) {
        batch.delete(adminDb.collection('contacts').doc(targetData.contactId));
    }
    batch.delete(userRef);
    await batch.commit();

    return { success: true };
}

/**
 * Master Tenant (Ogeemo) only: atomically provisions a brand-new tenant Organization
 * along with its founding super_admin (that tenant's top authority). The master tenant
 * super admin never gains ongoing access to the new company's data or claims.
 */
export async function createTenantWithSuperAdmin(data: { companyName: string; email: string; password?: string; name?: string; employeeNumber?: string; notes?: string }) {
    await requireMasterTenantSuperAdmin();
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK is not initialized.');

    let createdUid: string | null = null;
    try {
        const userRecord = await adminAuth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.name,
        });
        createdUid = userRecord.uid;

        const batch = adminDb.batch();

        const orgRef = adminDb.collection('organizations').doc();
        const orgId = orgRef.id;
        batch.set(orgRef, {
            id: orgId,
            name: data.companyName,
            createdAt: FieldValue.serverTimestamp(),
            ownerUid: createdUid,
            isMasterTenant: false,
        });

        const userRef = adminDb.collection('users').doc(createdUid);
        batch.set(userRef, {
            id: createdUid,
            email: data.email,
            displayName: data.name || '',
            employeeNumber: data.employeeNumber || '',
            notes: data.notes || '',
            orgId: orgId,
            accessLevel: 'super_admin',
            mentorshipRole: 'Apprentice',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        await batch.commit();

        await adminAuth.setCustomUserClaims(createdUid, {
            orgId,
            accessLevel: 'super_admin',
            isMasterTenant: false,
        });

        if (!data.password) {
            const passwordResetLink = await adminAuth.generatePasswordResetLink(data.email);
            console.log(`[TENANT ADMIN INVITE LINK] -> ${data.email}: ${passwordResetLink}`);
        }

        return { success: true, orgId, uid: createdUid };
    } catch (error: any) {
        if (createdUid) {
            try {
                await adminAuth.deleteUser(createdUid);
            } catch (rollbackError) {
                console.error('CRITICAL: Failed to rollback user creation', rollbackError);
            }
        }
        throw new Error(error.message || 'Failed to create tenant');
    }
}

/**
 * Master Tenant (Ogeemo) only: lists all non-master companies for the Tenant Management dashboard.
 */
export async function listCompanies(): Promise<Array<{ id: string; name: string; ownerUid: string | null; status: 'active' | 'suspended' }>> {
    await requireMasterTenantSuperAdmin();
    const adminDb = getAdminDb();
    if (!adminDb) throw new Error('Firebase Admin SDK is not initialized.');

    const snapshot = await adminDb.collection('organizations').where('isMasterTenant', '==', false).get();
    return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            name: data.name as string,
            ownerUid: (data.ownerUid as string | null) ?? null,
            status: (data.status as 'active' | 'suspended') ?? 'active',
        };
    });
}

/**
 * Master Tenant (Ogeemo) only: updates a tenant's display name.
 */
export async function updateTenantName(orgId: string, newName: string): Promise<void> {
    await requireMasterTenantSuperAdmin();
    const adminDb = getAdminDb();
    if (!adminDb) throw new Error('Firebase Admin SDK is not initialized.');

    const orgRef = adminDb.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) throw new Error('Organization not found.');
    if (orgSnap.data()?.isMasterTenant === true) throw new Error('Cannot modify the master tenant.');

    await orgRef.update({
        name: newName,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Master Tenant (Ogeemo) only: activates or suspends a subscriber tenant.
 */
export async function updateTenantStatus(orgId: string, status: 'active' | 'suspended'): Promise<void> {
    await requireMasterTenantSuperAdmin();
    const adminDb = getAdminDb();
    if (!adminDb) throw new Error('Firebase Admin SDK is not initialized.');

    const orgRef = adminDb.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) throw new Error('Organization not found.');
    if (orgSnap.data()?.isMasterTenant === true) throw new Error('Cannot modify the master tenant status.');

    await orgRef.update({
        status,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Master Tenant (Ogeemo) only: updates a tenant's name and its admin's email/name.
 */
export async function updateTenantDetails(orgId: string, name: string, adminEmail: string, adminName: string): Promise<void> {
    await requireMasterTenantSuperAdmin();
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK is not initialized.');

    const orgRef = adminDb.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) throw new Error('Organization not found.');
    if (orgSnap.data()?.isMasterTenant === true) throw new Error('Cannot modify the master tenant.');

    const orgData = orgSnap.data()!;
    const ownerUid = orgData.ownerUid as string | null;

    // Update org name
    await orgRef.update({
        name,
        updatedAt: FieldValue.serverTimestamp(),
    });

    // Update admin user details if we have an owner
    if (ownerUid) {
        const userRef = adminDb.collection('users').doc(ownerUid);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
            await userRef.update({
                email: adminEmail,
                displayName: adminName,
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        // Update Firebase Auth user record
        try {
            await adminAuth.updateUser(ownerUid, {
                email: adminEmail,
                displayName: adminName,
            });
        } catch (error: any) {
            console.error('Failed to update Auth user record:', error);
        }
    }
}

/**
 * Master Tenant (Ogeemo) only: deletes a tenant organization and disables its users.
 * Firebase Auth users are disabled (not deleted) to preserve audit trails.
 */
export async function deleteTenant(orgId: string): Promise<void> {
    await requireMasterTenantSuperAdmin();
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK is not initialized.');

    const orgRef = adminDb.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) throw new Error('Organization not found.');
    if (orgSnap.data()?.isMasterTenant === true) throw new Error('Cannot delete the master tenant.');

    // Disable all users belonging to this org
    const userSnapshot = await adminDb.collection('users').where('orgId', '==', orgId).get();
    const disablePromises = userSnapshot.docs.map(async (docSnap) => {
        const uid = docSnap.id;
        try {
            await adminAuth.updateUser(uid, { disabled: true });
        } catch (error: any) {
            console.error(`Failed to disable user ${uid}:`, error);
        }
    });
    await Promise.all(disablePromises);

    // Delete user profile documents and the org
    const batch = adminDb.batch();
    userSnapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
    });
    batch.delete(orgRef);
    await batch.commit();
}

/**
 * Master Tenant (Ogeemo) only: returns detailed info for a specific tenant including its user list.
 */
export async function getTenantDetails(orgId: string): Promise<{
    id: string;
    name: string;
    status: 'active' | 'suspended';
    createdAt: any;
    ownerUid: string | null;
    users: Array<{ uid: string; email: string; displayName: string; accessLevel: string }>;
}> {
    await requireMasterTenantSuperAdmin();
    const adminDb = getAdminDb();
    if (!adminDb) throw new Error('Firebase Admin SDK is not initialized.');

    const orgRef = adminDb.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) throw new Error('Organization not found.');

    const orgData = orgSnap.data()!;

    const userSnapshot = await adminDb.collection('users').where('orgId', '==', orgId).get();
    const users = userSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
            uid: docSnap.id,
            email: data.email as string,
            displayName: (data.displayName as string) || '',
            accessLevel: (data.accessLevel as string) || 'viewer',
        };
    });

    return {
        id: orgSnap.id,
        name: orgData.name as string,
        status: (orgData.status as 'active' | 'suspended') ?? 'active',
        createdAt: orgData.createdAt ?? null,
        ownerUid: (orgData.ownerUid as string | null) ?? null,
        users,
    };
}
