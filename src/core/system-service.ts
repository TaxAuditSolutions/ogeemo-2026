import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

const SYSTEM_DOC_PATH = 'metadata/system';

/**
 * Manages the global user counter and system-wide stats.
 */
export async function incrementUserCounter(): Promise<{ count: number; isFounder: boolean }> {
    const { db } = getFirebaseServices();
    const systemDocRef = doc(db, SYSTEM_DOC_PATH);

    return await runTransaction(db, async (transaction) => {
        const systemDoc = await transaction.get(systemDocRef);
        
        let currentCount = 0;
        if (systemDoc.exists()) {
            currentCount = systemDoc.data().total_users || 0;
        }

        const newCount = currentCount + 1;
        const isFounder = newCount <= 500;

        transaction.set(systemDocRef, {
            total_users: newCount,
            last_updated: serverTimestamp()
        }, { merge: true });

        return { count: newCount, isFounder };
    });
}

/**
 * Fetches the current total user count.
 */
export async function getSystemStats(): Promise<{ total_users: number }> {
    const { db } = getFirebaseServices();
    const systemDocRef = doc(db, SYSTEM_DOC_PATH);
    const systemDoc = await getDoc(systemDocRef);
    
    if (systemDoc.exists()) {
        return { total_users: systemDoc.data().total_users || 0 };
    }
    return { total_users: 0 };
}
