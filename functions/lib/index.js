"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerBackup = void 0;
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const firestore_1 = require("@google-cloud/firestore");
// Initialize the Firebase Admin SDK
admin.initializeApp();
const firestoreClient = new firestore_1.v1.FirestoreAdminClient();
/**
 * Initiates a backup of the Firestore database.
 *
 * This function is callable from the client-side application and will
 * start an export of the entire Firestore database to a Google Cloud
 * Storage bucket.
 */
exports.triggerBackup = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated.
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    // Get the project ID from the FIREBASE_CONFIG environment variable.
    // This is a more reliable method than relying on GCP_PROJECT.
    const projectId = JSON.parse(process.env.FIREBASE_CONFIG).projectId;
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
    }
    catch (error) {
        console.error(error);
        throw new functions.https.HttpsError("internal", "An error occurred while initiating the backup.", error);
    }
});
//# sourceMappingURL=index.js.map