
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeFirebase } from '@/firebase';

export async function initiateBackup() {
  const { functions } = await initializeFirebase();
  const triggerBackup = httpsCallable(functions, 'triggerBackup');
  
  try {
    const result = await triggerBackup();
    return result.data as { message: string, operationName: string };
  } catch (error: any) {
    console.error('Error initiating backup:', error);
    throw new Error(error.message || 'Failed to initiate backup');
  }
}
