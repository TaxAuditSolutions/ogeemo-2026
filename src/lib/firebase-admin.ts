
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import { getStorage as getAdminStorageSdk } from 'firebase-admin/storage';
import { getAuth as getAdminAuthSdk } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestoreSdk } from 'firebase-admin/firestore';


let adminApp: admin.app.App;
let dbInstance: admin.firestore.Firestore;
let authInstance: admin.auth.Auth;
let storageInstance: admin.storage.Storage;

function getAdminApp() {
  // This function is now idempotent, ensuring it only initializes the app once.
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } catch (e: any) {
      throw new Error(`Failed to initialize Firebase Admin SDK: ${e.message}`);
    }
  }
  return admin.app();
}

export function getAdminDb() {
  if (!dbInstance) {
    dbInstance = getAdminFirestoreSdk(getAdminApp());
  }
  return dbInstance;
}

export function getAdminAuth() {
  if (!authInstance) {
    authInstance = getAdminAuthSdk(getAdminApp());
  }
  return authInstance;
}

export function getAdminStorage() {
  if (!storageInstance) {
    storageInstance = getAdminStorageSdk(getAdminApp());
  }
  return storageInstance;
}

export { getAdminApp };

export async function getAdminFileContentFromStorage(storagePath: string): Promise<string> {
    if (!storagePath) {
        console.warn("Admin Storage: Storage path is empty, returning empty content.");
        return '';
    }
    try {
        const bucket = getAdminStorage().bucket();
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            throw new Error(`File does not exist at path: ${storagePath}`);
        }
        const contents = await file.download();
        return contents.toString('utf-8');
    } catch (error: any) {
        console.error(`Admin Storage: Failed to fetch content from ${storagePath}:`, error);
        throw new Error(`Failed to retrieve file content: ${error.message}`);
    }
}
