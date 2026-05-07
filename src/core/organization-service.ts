import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

export interface Organization {
    id: string;
    name: string;
    ownerId: string;
    seatCount: number;
    basePrice: number;
    extraSeatPrice: number;
    totalMonthlyPrice: number;
    createdAt: any;
    updatedAt: any;
}

const ORGANIZATIONS_COLLECTION = 'organizations';

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

/**
 * Provisions a new organization for a member.
 */
export async function createOrganization(ownerId: string, name: string, seatCount: number): Promise<Organization> {
    const { db } = getFirebaseServices();
    const orgId = `org_${ownerId}`; // Simple 1:1 mapping for now
    const orgRef = doc(db, ORGANIZATIONS_COLLECTION, orgId);

    const totalMonthlyPrice = calculateMembershipPrice(seatCount);

    const organization: Organization = {
        id: orgId,
        name: name || `${ownerId}'s Circle`,
        ownerId,
        seatCount,
        basePrice: 25,
        extraSeatPrice: 5,
        totalMonthlyPrice,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await setDoc(orgRef, organization);
    return organization;
}

/**
 * Updates an organization's seat count and recalculates price.
 */
export async function updateSeatCount(orgId: string, newSeatCount: number): Promise<void> {
    const { db } = getFirebaseServices();
    const orgRef = doc(db, ORGANIZATIONS_COLLECTION, orgId);
    
    const newPrice = calculateMembershipPrice(newSeatCount);

    await updateDoc(orgRef, {
        seatCount: newSeatCount,
        totalMonthlyPrice: newPrice,
        updatedAt: serverTimestamp()
    });
}
