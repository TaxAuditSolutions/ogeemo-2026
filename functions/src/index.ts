
'use server';

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { v1 } from "@google-cloud/firestore";

// This environment variable is crucial for the gRPC client used by Firestore Admin SDK
// to work correctly in modern Node.js environments. It specifies a set of supported
// SSL cipher suites to avoid low-level DECODER errors.
process.env.GRPC_SSL_CIPHER_SUITES = process.env.GRPC_SSL_CIPHER_SUITES ?? 'HIGH+ECDSA';

// Initialize the Firebase Admin SDK
admin.initializeApp();

const firestoreClient = new v1.FirestoreAdminClient();

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
