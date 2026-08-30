'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/core/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AccessLevel } from '@/core/user-profile-service';

// ─── Types ───────────────────────────────────────────────────────────────────────

export interface TenantSummary {
    id: string;
    name: string;
    ownerUid: string | null;
    ownerEmail: string | null;
    ownerName: string | null;
    createdAt: string | null;
    status: 'active' | 'suspended';
    userCount: number;
    isMasterTenant: boolean;
}

function serializeFirestoreDate(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value.seconds === 'number') {
        const ms = (value.seconds * 1000) + Math.floor((value.nanoseconds ?? 0) / 1_000_000);
        return new Date(ms).toISOString();
    }
    return null;
}

function getDateMs(value: string | null): number {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

export interface OwnerDashboardStats {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalUsers: number;
    totalAdmins: number;
    recentTenants: TenantSummary[];
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────────

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

// ─── Server Actions ────────────────────────────────────────────────────────────────

/**
 * Master Tenant only: returns aggregate dashboard metrics for the Ogeemo Owner Console.
 */
export async function getOwnerDashboardStats(): Promise<OwnerDashboardStats> {
    await requireMasterTenantSuperAdmin();
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();
    if (!adminDb || !adminAuth) throw new Error('Firebase Admin SDK is not initialized.');

    // 1. Fetch all organizations (including master)
    const orgSnapshot = await adminDb.collection('organizations').orderBy('createdAt', 'desc').get();
    const allOrgs = orgSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            name: data.name as string,
            ownerUid: (data.ownerUid as string | null) ?? null,
            createdAt: serializeFirestoreDate(data.createdAt),
            status: (data.status as 'active' | 'suspended') ?? 'active',
            isMasterTenant: data.isMasterTenant === true,
        };
    });

    // 2. Fetch all users to compute counts per org
    const userSnapshot = await adminDb.collection('users').get();
    const usersByOrg: Record<string, number> = {};
    let totalAdmins = 0;

    userSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const orgId = data.orgId as string | undefined;
        if (orgId) {
            usersByOrg[orgId] = (usersByOrg[orgId] || 0) + 1;
        }
        const level = data.accessLevel as AccessLevel | undefined;
        if (level === 'super_admin' || level === 'org_admin') {
            totalAdmins++;
        }
    });

    // 3. Resolve owner emails for recent tenants (top 5 non-master)
    const nonMasterOrgs = allOrgs.filter((o) => !o.isMasterTenant);
    const recentOrgIds = nonMasterOrgs.slice(0, 5);
    const ownerEmailMap: Record<string, { email: string | null; name: string | null }> = {};

    if (adminAuth && recentOrgIds.length > 0) {
        await Promise.all(
            recentOrgIds.map(async (org) => {
                if (!org.ownerUid) {
                    ownerEmailMap[org.ownerUid || ''] = { email: null, name: null };
                    return;
                }
                try {
                    const userRecord = await adminAuth.getUser(org.ownerUid);
                    ownerEmailMap[org.ownerUid] = {
                        email: userRecord.email ?? null,
                        name: userRecord.displayName ?? null,
                    };
                } catch {
                    ownerEmailMap[org.ownerUid] = { email: null, name: null };
                }
            })
        );
    }

    // 4. Build tenant summaries
    const tenantSummaries: TenantSummary[] = recentOrgIds.map((org) => ({
        id: org.id,
        name: org.name,
        ownerUid: org.ownerUid,
        ownerEmail: org.ownerUid ? ownerEmailMap[org.ownerUid]?.email ?? null : null,
        ownerName: org.ownerUid ? ownerEmailMap[org.ownerUid]?.name ?? null : null,
        createdAt: org.createdAt,
        status: org.status,
        userCount: usersByOrg[org.id] || 0,
        isMasterTenant: false,
    }));

    // 5. Compute aggregate stats (non-master only for subscriber counts)
    const subscriberOrgs = nonMasterOrgs;
    const activeTenants = subscriberOrgs.filter((o) => o.status !== 'suspended').length;
    const suspendedTenants = subscriberOrgs.filter((o) => o.status === 'suspended').length;
    const totalUsers = Object.entries(usersByOrg)
        .filter(([orgId]) => {
            const org = allOrgs.find((o) => o.id === orgId);
            return org && !org.isMasterTenant;
        })
        .reduce((sum, [, count]) => sum + count, 0);

    return {
        totalTenants: subscriberOrgs.length,
        activeTenants,
        suspendedTenants,
        totalUsers,
        totalAdmins,
        recentTenants: tenantSummaries,
    };
}

/**
 * Master Tenant only: lists all subscriber tenants with detailed info.
 */
export async function listTenantsDetailed(): Promise<TenantSummary[]> {
    await requireMasterTenantSuperAdmin();
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();
    if (!adminDb || !adminAuth) throw new Error('Firebase Admin SDK is not initialized.');

    // 1. Fetch all organizations and filter client-side so older docs without
    //    an explicit isMasterTenant value are still included as subscriber tenants.
    const orgSnapshot = await adminDb.collection('organizations').get();
    const orgs = orgSnapshot.docs
        .filter((docSnap) => docSnap.data()?.isMasterTenant !== true)
        .map((docSnap) => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                name: data.name as string,
                ownerUid: (data.ownerUid as string | null) ?? null,
                createdAt: serializeFirestoreDate(data.createdAt),
                status: (data.status as 'active' | 'suspended') ?? 'active',
                isMasterTenant: false,
            };
        });

    // 2. Fetch all users to compute counts per org
    const userSnapshot = await adminDb.collection('users').get();
    const usersByOrg: Record<string, number> = {};
    userSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const orgId = data.orgId as string | undefined;
        if (orgId) {
            usersByOrg[orgId] = (usersByOrg[orgId] || 0) + 1;
        }
    });

    // 3. Resolve owner emails
    const ownerUids = [...new Set(orgs.map((o) => o.ownerUid).filter(Boolean))] as string[];
    const ownerEmailMap: Record<string, { email: string | null; name: string | null }> = {};

    if (adminAuth && ownerUids.length > 0) {
        await Promise.all(
            ownerUids.map(async (uid) => {
                try {
                    const userRecord = await adminAuth.getUser(uid);
                    ownerEmailMap[uid] = {
                        email: userRecord.email ?? null,
                        name: userRecord.displayName ?? null,
                    };
                } catch {
                    ownerEmailMap[uid] = { email: null, name: null };
                }
            })
        );
    }

    // 4. Build summaries, sorted by creation date descending
    return orgs
        .map((org) => ({
            id: org.id,
            name: org.name,
            ownerUid: org.ownerUid,
            ownerEmail: org.ownerUid ? ownerEmailMap[org.ownerUid]?.email ?? null : null,
            ownerName: org.ownerUid ? ownerEmailMap[org.ownerUid]?.name ?? null : null,
            createdAt: org.createdAt,
            status: org.status,
            userCount: usersByOrg[org.id] || 0,
            isMasterTenant: false,
        }))
        .sort((a, b) => getDateMs(b.createdAt) - getDateMs(a.createdAt));
}

/**
 * Master Tenant only: activates or suspends a subscriber tenant.
 * Suspended tenants remain in the database but their users lose access
 * (enforced via Firestore rules checking org status).
 */
export async function updateTenantStatus(orgId: string, status: 'active' | 'suspended'): Promise<void> {
    await requireMasterTenantSuperAdmin();
    const adminDb = getAdminDb();
    if (!adminDb) throw new Error('Firebase Admin SDK is not initialized.');

    const orgRef = adminDb.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
        throw new Error('Organization not found.');
    }
    if (orgSnap.data()?.isMasterTenant === true) {
        throw new Error('Cannot modify the master tenant status.');
    }

    await orgRef.update({
        status,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Master Tenant only: returns detailed info for a specific tenant including its user list.
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
    const adminAuth = getAdminAuth();
    if (!adminDb || !adminAuth) throw new Error('Firebase Admin SDK is not initialized.');

    const orgRef = adminDb.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
        throw new Error('Organization not found.');
    }

    const orgData = orgSnap.data()!;

    // Fetch users belonging to this org
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