import { collection, addDoc, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

export interface HytexerciseLog {
    id?: string;
    userId: string;
    timestamp: Date;
    action: 'completed' | 'skipped';
    durationMinutes: number;
}

const COLLECTION_NAME = 'hytexerciseLogs';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

export async function logHytexerciseAction(userId: string, action: 'completed' | 'skipped', durationMinutes: number): Promise<void> {
    if (!userId) return;
    const db = getDb();
    
    await addDoc(collection(db, COLLECTION_NAME), {
        userId,
        timestamp: Timestamp.now(),
        action,
        durationMinutes
    });
}

export async function getHytexerciseLogs(userId: string, startDate?: Date, endDate?: Date): Promise<HytexerciseLog[]> {
    if (!userId) return [];
    
    const db = getDb();
    let q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    
    // Note: To use multiple range filters or ordering, Firestore might require an index.
    // For simplicity, we can fetch all for the user and filter in memory if it's small, 
    // or use startAt/endAt if we add a composite index. We will filter in memory to avoid index requirement issues for now.
    
    const snapshot = await getDocs(q);
    let logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            userId: data.userId,
            timestamp: data.timestamp?.toDate() || new Date(),
            action: data.action,
            durationMinutes: data.durationMinutes || 0
        } as HytexerciseLog;
    });

    // Filter by date range in memory
    if (startDate) {
        logs = logs.filter(log => log.timestamp >= startDate);
    }
    if (endDate) {
        // Include the entire end date day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        logs = logs.filter(log => log.timestamp <= endOfDay);
    }

    // Sort descending by date
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return logs;
}
