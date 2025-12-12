
// src/lib/firebase-admin.ts
import admin from 'firebase-admin';
import { getStorage as getAdminStorageSdk } from 'firebase-admin/storage';

let adminApp: admin.app.App;

// This function acts as a singleton to ensure the Firebase Admin SDK is initialized only once.
const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0]!;
    return adminApp;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. The application cannot connect to Firebase services on the server.');
  }

  try {
    let serviceAccount;
    // The service account key might be a JSON string or already a parsed object
    // depending on the environment. We need to handle both cases.
    if (typeof serviceAccountKey === 'string') {
        try {
            serviceAccount = JSON.parse(serviceAccountKey);
        } catch (e) {
            throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON. Please ensure it's a valid JSON string. Error: ${(e as Error).message}`);
        }
    } else if (typeof serviceAccountKey === 'object') {
        serviceAccount = serviceAccountKey;
    } else {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not a valid string or object.');
    }
    
    // FIX: The private_key needs to have its escaped newlines replaced with actual newlines.
    // This is a common issue when passing multiline strings through environment variables.
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return adminApp;
  } catch (e: any) {
    // Provide a more detailed error message to help with debugging.
    throw new Error(`Failed to initialize Firebase Admin SDK. Error: ${e.message}`);
  }
};

// Call the function to ensure the admin app is initialized before any services are exported.
initializeFirebaseAdmin();

// Export initialized services
export const getAdminStorage = () => getAdminStorageSdk(adminApp);
export const adminDb = admin.firestore(adminApp);
export const adminAuth = admin.auth(adminApp);
