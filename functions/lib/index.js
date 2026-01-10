
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const firestore_1 = require("@google-cloud/firestore");
// Initialize the Firebase Admin SDK
admin.initializeApp();
const firestoreClient = new firestore_1.v1.FirestoreAdminClient();
exports.search = functions.https.onCall(async (data, context) => {
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
        const searchPromises = [];
        if (sources.includes('contacts')) {
            const contactsPromise = admin.firestore()
                .collection('contacts')
                .where('userId', '==', userId)
                .where('keywords', 'array-contains', searchTerm)
                .get()
                .then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), resultType: 'Contact' })));
            searchPromises.push(contactsPromise);
        }
        if (sources.includes('files')) {
            const filesPromise = admin.firestore()
                .collection('files')
                .where('userId', '==', userId)
                .where('keywords', 'array-contains', searchTerm)
                .get()
                .then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), resultType: 'File' })));
            searchPromises.push(filesPromise);
        }
        const resultsArrays = await Promise.all(searchPromises);
        const results = resultsArrays.flat();
        return { results };
    }
    catch (error) {
        console.error("[Search Function Error]", error);
        throw new functions.https.HttpsError('internal', error.message || 'An unexpected server error occurred.');
    }
});
//# sourceMappingURL=index.js.map
