
'use server';

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { v1 } from "@google-cloud/firestore";

// Initialize the Firebase Admin SDK
admin.initializeApp();

const firestoreClient = new v1.FirestoreAdminClient();

/**
 * Initiates a backup of the Firestore database.
 *
 * This function is callable from the client-side application and will
 * start an export of the entire Firestore database to a Google Cloud
 * Storage bucket.
 */
export const triggerBackup = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  // Get the project ID from the FIREBASE_CONFIG environment variable.
  // This is a more reliable method than relying on GCP_PROJECT.
  const projectId = JSON.parse(process.env.FIREBASE_CONFIG!).projectId;
  if (!projectId) {
    throw new functions.https.HttpsError("internal", "Could not determine the Firebase project ID.");
  }
  
  // The Google Cloud Storage bucket to export to.
  // The format is 'gs://[YOUR_BUCKET_NAME]'
  const bucket = `gs://${projectId}-backups`;

  const request = {
    name: firestoreClient.databasePath(projectId, "(default)"),
    outputUriPrefix: bucket,
    // Leave collectionIds empty to export all collections
    collectionIds: [],
  };

  try {
    const [response] = await firestoreClient.exportDocuments(request);
    console.log(`Operation name: ${response.name}`);
    return {
      message: "Backup successfully initiated.",
      operationName: response.name,
    };
  } catch (error) {
    console.error(error);
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while initiating the backup.",
      error
    );
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

    
