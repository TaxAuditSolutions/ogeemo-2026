// src/lib/firebase-admin.ts
import admin from 'firebase-admin';
import { getStorage as getAdminStorageSdk } from 'firebase-admin/storage';

// This environment variable is crucial for the gRPC client used by Firestore Admin SDK
// to work correctly in modern Node.js environments. It specifies a set of supported
// SSL cipher suites to avoid low-level DECODER errors.
process.env.GRPC_SSL_CIPHER_SUITES = process.env.GRPC_SSL_CIPHER_SUITES ?? 'HIGH+ECDSA';

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
    // The service account key is expected to be a JSON string from the environment variable.
    // This will parse it into a JavaScript object.
    const serviceAccount = JSON.parse(serviceAccountKey);
    
    // The private_key field often has its newlines escaped as `\n` when stored in an
    // environment variable. This line replaces those escaped characters with actual newline characters,
    // which is required for the key to be parsed correctly by the Firebase SDK.
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
    throw new Error(`Failed to initialize Firebase Admin SDK. Error: ${e.message}. Ensure FIREBASE_SERVICE_ACCOUNT_KEY is a valid, un-escaped JSON string.`);
  }
};

// Call the function to ensure the admin app is initialized before any services are exported.
initializeFirebaseAdmin();

// Export initialized services
export const getAdminStorage = () => getAdminStorageSdk(adminApp);
export const adminDb = admin.firestore(adminApp);
export const adminAuth = admin.auth(adminApp);


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
