'use client';

/**
 * @fileOverview Operational service for Mentor and Mediation nodes.
 * Implements the KISS mediation logic for collective accountability.
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export interface MentorReview {
    requester_id: string;
    target_mentor_id: string;
    dispute_description: string;
    status: 'pending' | 'resolved' | 'dismissed';
    resolution_notes?: string;
    createdAt?: any;
}

const MEDIATION_COLLECTION = 'mentor_reviews';

/**
 * Submits a high-fidelity mediation request to the Lead Mentor Team.
 * This triggers immediate system notification nodes.
 */
export async function submitMentorReview(data: Omit<MentorReview, 'status' | 'createdAt'>): Promise<void> {
    const { db } = getFirebaseServices();
    const reviewData = {
        ...data,
        status: 'pending',
        createdAt: serverTimestamp(),
    };

    const collectionRef = collection(db, MEDIATION_COLLECTION);

    await addDoc(collectionRef, reviewData).catch(async (error) => {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: collectionRef.path,
                operation: 'create',
                requestResourceData: reviewData,
            } satisfies SecurityRuleContext));
        }
        throw error;
    });
    
    // Note: In a production node, a Cloud Function would trigger an email 
    // notification to Dan White and the Lead Mentor Team upon document creation.
}
