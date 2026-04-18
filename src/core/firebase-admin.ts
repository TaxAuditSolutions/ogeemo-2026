
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
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("[Firebase Admin] WARNING: FIREBASE_SERVICE_ACCOUNT_KEY is missing. Admin features (Server-side Auth) are disabled in development.");
        return null;
      }
      
      // Fallback for Firebase Functions / Cloud Run (production)
      // Provides Application Default Credentials automatically.
      try {
        return admin.initializeApp({
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
      } catch (e: any) {
        throw new Error(`Failed to initialize Firebase Admin SDK default: ${e.message}`);
      }
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } catch (e: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error("[Firebase Admin] Initialization failed:", e.message);
        return null;
      }
      throw new Error(`Failed to initialize Firebase Admin SDK: ${e.message}`);
    }
  }
  return admin.app();
}

export function getAdminDb() {
  if (!dbInstance) {
    const app = getAdminApp();
    if (!app) return null;
    dbInstance = getAdminFirestoreSdk(app);
  }
  return dbInstance;
}

export function getAdminAuth() {
  if (!authInstance) {
    const app = getAdminApp();
    if (!app) return null;
    authInstance = getAdminAuthSdk(app);
  }
  return authInstance;
}

export function getAdminStorage() {
  if (!storageInstance) {
    const app = getAdminApp();
    if (!app) return null;
    storageInstance = getAdminStorageSdk(app);
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
        const adminStorage = getAdminStorage();
        if (!adminStorage) {
            console.warn("Admin Storage: SDK not initialized, returning empty content.");
            return '';
        }
        const bucket = adminStorage.bucket();
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            throw new Error(`File does not exist at path: ${storagePath}`);
        }
        const contents = await file.download();
        return contents.toString('utf-8');
    } catch (error: any) {
        console.error(`Admin Storage: Failed to fetch content from ${storagePath}:`, error);
        return ''; // Silent fail for content fetching in dev
    }
}
