
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { v1 as firestore_v1 } from "@google-cloud/firestore";
import { getStorage } from "firebase-admin/storage";

// This environment variable is crucial for the gRPC client used by Firestore Admin SDK
// to work correctly in modern Node.js environments. It specifies a set of supported
// SSL cipher suites to avoid low-level DECODER errors.
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';

// Initialize the Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}

const firestoreClient = new firestore_v1.FirestoreAdminClient();
const storage = getStorage();

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


// --- Backup Functions ---

export const triggerFirestoreBackup = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    console.error("GCLOUD_PROJECT environment variable not set.");
    throw new functions.https.HttpsError('internal', 'GCLOUD_PROJECT environment variable not set.');
  }

  const databaseName = firestoreClient.databasePath(projectId, '(default)');
  const bucketName = `gs://${projectId}-backups`;
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const outputUriPrefix = `${bucketName}/firestore/${timestamp}`;

  try {
    console.log(`Starting Firestore export to: ${outputUriPrefix}`);
    const [response] = await firestoreClient.exportDocuments({
      name: databaseName,
      outputUriPrefix: outputUriPrefix,
      collectionIds: [], // Export all collections
    });
    console.log(`Firestore export operation started: ${response.name}`);
    return { message: "Firestore backup process initiated successfully.", operationName: response.name, outputUriPrefix };
  } catch (error: any) {
    console.error("Firestore backup failed:", error);
    throw new functions.https.HttpsError('internal', `Firestore backup failed: ${error.message}`);
  }
});

export const triggerAuthBackup = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  
  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    console.error("GCLOUD_PROJECT environment variable not set.");
    throw new functions.https.HttpsError('internal', 'GCLOUD_PROJECT environment variable not set.');
  }

  const bucketName = `${projectId}-backups`;
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const destination = `auth/auth_export_${timestamp}.json`;
  
  try {
    const bucket = storage.bucket(bucketName);
    const [exists] = await bucket.exists();
    if (!exists) {
        console.log(`Backup bucket ${bucketName} does not exist, creating it.`);
        await bucket.create();
        console.log(`Bucket ${bucketName} created.`);
    }

    const users: admin.auth.UserRecord[] = [];
    let nextPageToken;
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      listUsersResult.users.forEach(userRecord => users.push(userRecord));
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    const file = bucket.file(destination);
    await file.save(JSON.stringify(users.map(u => u.toJSON()), null, 2), {
        contentType: 'application/json'
    });
    
    console.log(`Auth export successful. ${users.length} users exported to gs://${bucketName}/${destination}.`);
    return { message: `Successfully exported ${users.length} users.`, destination: `gs://${bucketName}/${destination}` };

  } catch (error: any) {
    console.error("Auth backup failed:", error);
    throw new functions.https.HttpsError('internal', `Auth backup failed: ${error.message}`);
  }
});
