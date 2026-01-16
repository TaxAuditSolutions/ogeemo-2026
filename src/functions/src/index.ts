'use server';

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { v1 } from "@google-cloud/firestore";

// This environment variable is crucial for the gRPC client used by Firestore Admin SDK
// to work correctly in modern Node.js environments. It specifies a set of supported
// SSL cipher suites to avoid low-level DECODER errors.
process.env.GRPC_SSL_CIPHER_SUITES = process.env.GRPC_SSL_CIPHER_SUITES ?? 'HIGH+ECDSA';

// Initialize the Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}

const firestoreClient = new v1.FirestoreAdminClient();

/**
 * Initiates a backup of the Firestore database.
 */
export const triggerFirestoreBackup = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  try {
    const projectId = JSON.parse(process.env.FIREBASE_CONFIG!).projectId;
    if (!projectId) {
      throw new functions.https.HttpsError("internal", "Could not determine the Firebase project ID.");
    }
    
    const bucket = `gs://${projectId}-backups`;

    const request = {
      name: firestoreClient.databasePath(projectId, "(default)"),
      outputUriPrefix: bucket,
      collectionIds: [],
    };

    const [response] = await firestoreClient.exportDocuments(request);
    console.log(`Firestore export operation name: ${response.name}`);
    return {
      message: "Firestore backup successfully initiated.",
      operationName: response.name,
    };
  } catch (error: any) {
    console.error("Error initiating Firestore backup:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "An error occurred while initiating the Firestore backup."
    );
  }
});

/**
 * Initiates a backup of Firebase Authentication users.
 */
export const triggerAuthBackup = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  try {
    const projectId = JSON.parse(process.env.FIREBASE_CONFIG!).projectId;
    const bucketName = `${projectId}-backups`;
    
    const storage = admin.storage();
    const bucket = storage.bucket(bucketName);

    const [exists] = await bucket.exists();
    if (!exists) {
        console.log(`Bucket ${bucketName} does not exist. Creating it...`);
        // You can specify a location, e.g., 'US'
        await storage.createBucket(bucketName);
        console.log(`Bucket ${bucketName} created.`);
    }

    const date = new Date().toISOString().split('T')[0];
    const fileName = `auth-export/auth-backup-${date}.json`;
    const file = bucket.file(fileName);

    const users: admin.auth.UserRecord[] = [];
    let nextPageToken: string | undefined;

    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      listUsersResult.users.forEach(userRecord => users.push(userRecord.toJSON() as admin.auth.UserRecord));
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    await file.save(JSON.stringify({ users }, null, 2), {
      contentType: 'application/json',
    });

    console.log(`Auth export created: ${fileName}`);
    return {
      message: "Authentication user backup successfully created.",
      fileName: fileName,
      bucket: bucketName
    };
  } catch (error: any) {
    console.error('Error exporting auth users:', error);
    throw new functions.https.HttpsError('internal', error.message || 'An error occurred while exporting users.');
  }
});


interface SearchActionParams {
    query: string;
    sources: ('contacts' | 'files')[];
}

type SearchResult = (any) & { resultType: 'Contact' | 'File' };

export const search = functions.https.onCall(async (data: SearchActionParams, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const userId = context.auth.uid;
    const { query, sources } = data;

    if (!query || !sources || sources.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Query and sources are required.');
    }

    try {
        const searchTerm = query.toLowerCase().trim();
        const searchPromises: Promise<SearchResult[]>[] = [];

        if (sources.includes('contacts')) {
            const contactsPromise = admin.firestore()
                .collection('contacts')
                .where('userId', '==', userId)
                .where('keywords', 'array-contains', searchTerm)
                .get()
                .then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), resultType: 'Contact' as const })));
            searchPromises.push(contactsPromise);
        }

        if (sources.includes('files')) {
            const filesPromise = admin.firestore()
                .collection('files')
                .where('userId', '==', userId)
                .where('keywords', 'array-contains', searchTerm)
                .get()
                .then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), resultType: 'File' as const })));
            searchPromises.push(filesPromise);
        }

        const resultsArrays = await Promise.all(searchPromises);
        const results = resultsArrays.flat();

        return { results };

    } catch (error: any) {
        console.error("[Search Function Error]", error);
        throw new functions.https.HttpsError('internal', error.message || 'An unexpected server error occurred.');
    }
});
