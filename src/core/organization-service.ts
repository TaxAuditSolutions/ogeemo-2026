// Canonical Organization (tenant) shape and creation logic now live in org-actions.ts
// to avoid two divergent org-creation code paths (see org-actions.ts registerOrganization).
export type { Organization } from '@/app/actions/org-actions';

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import type { Organization } from '@/app/actions/org-actions';

const ORGANIZATIONS_COLLECTION = 'organizations';

/** Fetches a single organization's company-identity fields for display (issuer info on invoices). */
export async function getOrganization(orgId: string): Promise<Pick<Organization, 'id' | 'name' | 'businessAddress' | 'businessPhone' | 'email' | 'businessNumber' | 'numbering'> | null> {
    const { db } = getFirebaseServices();
    const snap = await getDoc(doc(db, ORGANIZATIONS_COLLECTION, orgId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        id: snap.id,
        name: data.name as string,
        businessAddress: data.businessAddress ?? undefined,
        businessPhone: data.businessPhone ?? undefined,
        email: data.email ?? undefined,
        businessNumber: data.businessNumber ?? undefined,
        numbering: data.numbering ?? undefined,
    };
}

/** Batches lookups for multiple organizations, keyed by orgId, tolerating individual failures. */
export async function getOrganizationsByIds(orgIds: string[]): Promise<Record<string, string>> {
    const uniqueIds = Array.from(new Set(orgIds.filter(Boolean)));
    const entries = await Promise.all(
        uniqueIds.map(async (orgId) => {
            try {
                const org = await getOrganization(orgId);
                return [orgId, org?.name ?? orgId] as const;
            } catch {
                return [orgId, orgId] as const;
            }
        })
    );
    return Object.fromEntries(entries);
}

/** Renames a tenant. Firestore rules restrict this to the org's own org_admin/super_admin. */
export async function updateOrganizationName(orgId: string, name: string): Promise<void> {
    const { db } = getFirebaseServices();
    await updateDoc(doc(db, ORGANIZATIONS_COLLECTION, orgId), {
        name,
        updatedAt: serverTimestamp(),
    });
}
/**
 * Persists the workspace's company identity (address, phone, email, business number)
 * on the org document - the issuer info shown on invoices. Firestore rules restrict this to org_admin.
 */
export async function updateOrganizationDetails(
    orgId: string,
    details: Pick<Organization, 'businessAddress' | 'businessPhone' | 'email' | 'businessNumber' | 'numbering'>
): Promise<void> {
    const { db } = getFirebaseServices();
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    (Object.keys(details) as (keyof typeof details)[]).forEach((key) => {
        const value = details[key];
        if (value !== undefined) payload[key] = value;
    });
    await updateDoc(doc(db, ORGANIZATIONS_COLLECTION, orgId), payload);
}

/**
 * Calculates the monthly membership price based on seat count.
 * Logic: $30 for the first 5 seats, $5 for each additional seat.
 */
export function calculateMembershipPrice(seatCount: number): number {
    const basePrice = 30;
    const includedSeats = 5;
    const extraSeatPrice = 5;

    if (seatCount <= includedSeats) {
        return basePrice;
    }

    const extraSeats = seatCount - includedSeats;
    return basePrice + (extraSeats * extraSeatPrice);
}
