
'use server';
// This environment variable MUST be set before any other Firebase modules are loaded.
process.env.GRPC_SSL_CIPHER_SUITES = process.env.GRPC_SSL_CIPHER_SUITES ?? 'HIGH+ECDSA';

import admin from 'firebase-admin';

// Hold instances in a singleton pattern
let adminApp: admin.app.App | null = null;
let dbInstance: admin.firestore.Firestore | null = null;
let authInstance: admin.auth.Auth | null = null;
let storageInstance: ReturnType<typeof admin.storage> | null = null;

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0]!;
    return;
  }
  
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. The application cannot connect to Firebase services on the server.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (e: any) {
    throw new Error(`Failed to initialize Firebase Admin SDK. Error: ${e.message}. Ensure FIREBASE_SERVICE_ACCOUNT_KEY is a valid, un-escaped JSON string.`);
  }
};

function getAdminApp() {
    if (!adminApp) {
        initializeFirebaseAdmin();
    }
    return adminApp!;
}

// Export getter functions instead of direct instances
export function getAdminDb() {
    if (!dbInstance) {
        dbInstance = getAdminApp().firestore();
    }
    return dbInstance;
}

export function getAdminAuth() {
    if (!authInstance) {
        authInstance = getAdminApp().auth();
    }
    return authInstance;
}

export function getAdminStorage() {
    if (!storageInstance) {
        storageInstance = getAdminApp().storage();
    }
    return storageInstance;
}


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
