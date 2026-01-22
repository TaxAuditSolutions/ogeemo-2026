
'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseServices } from '@/firebase';

async function getFunctionsService() {
    const { functions } = getFirebaseServices();
    return functions;
}

export async function startFirestoreBackup(): Promise<{ message: string, outputUriPrefix: string }> {
    const functions = await getFunctionsService();
    const triggerFirestoreBackup = httpsCallable(functions, 'triggerFirestoreBackup');
    
    const result = await triggerFirestoreBackup();
    return result.data as { message: string, outputUriPrefix: string };
}

export async function startAuthBackup(): Promise<{ message: string, destination: string }> {
    const functions = await getFunctionsService();
    const triggerAuthBackup = httpsCallable(functions, 'triggerAuthBackup');
    
    const result = await triggerAuthBackup();
    return result.data as { message: string, destination: string };
}
