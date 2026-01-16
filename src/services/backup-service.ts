
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeFirebase } from '@/firebase';

export type BackupType = 'firestore' | 'auth';

export async function initiateBackup(backupType: BackupType): Promise<{ message: string, operationName?: string, fileName?: string }> {
  const { functions } = await initializeFirebase();
  const functionName = backupType === 'firestore' ? 'triggerFirestoreBackup' : 'triggerAuthBackup';
  const trigger = httpsCallable(functions, functionName);
  
  try {
    const result = await trigger();
    return result.data as { message: string, operationName?: string, fileName?: string };
  } catch (error: any) {
    console.error(`Error initiating ${backupType} backup:`, error);
    throw new Error(error.message || `Failed to initiate ${backupType} backup`);
  }
}
