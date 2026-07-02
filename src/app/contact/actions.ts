'use server';

import { getFirebaseServices } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function sendConnectionSignal(data: {
    firstName: string;
    lastName: string;
    email: string;
    subject: string;
    message: string;
}) {
    try {
        const { db } = getFirebaseServices();
        
        await addDoc(collection(db, 'inquiries'), {
            ...data,
            targetEmail: 'dan@danwhite.ca',
            createdAt: serverTimestamp(),
            status: 'new'
        });

        return { success: true };
    } catch (error: any) {
        console.error("Failed to save inquiry:", error);
        return { success: false, error: error.message };
    }
}
