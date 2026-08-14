// Canonical Organization (tenant) shape and creation logic now live in org-actions.ts
// to avoid two divergent org-creation code paths (see org-actions.ts registerOrganization).
export type { Organization } from '@/app/actions/org-actions';

import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import type { Organization } from '@/app/actions/org-actions';

const ORGANIZATIONS_COLLECTION = 'organizations';

/** Fetches a single organization's public fields (name) for display purposes. */
export async function getOrganization(orgId: string): Promise<Pick<Organization, 'id' | 'name'> | null> {
    const { db } = getFirebaseServices();
    const snap = await getDoc(doc(db, ORGANIZATIONS_COLLECTION, orgId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return { id: snap.id, name: data.name as string };
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

/**
 * Calculates the monthly membership price based on seat count.
 * Logic: $25 for the first 5 seats, $5 for each additional seat.
 */
export function calculateMembershipPrice(seatCount: number): number {
    const basePrice = 25;
    const includedSeats = 5;
    const extraSeatPrice = 5;

    if (seatCount <= includedSeats) {
        return basePrice;
    }

    const extraSeats = seatCount - includedSeats;
    return basePrice + (extraSeats * extraSeatPrice);
}
