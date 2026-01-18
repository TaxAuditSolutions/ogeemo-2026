
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { v1 as firestore_v1 } from "@google-cloud/firestore";
import { getStorage } from "firebase-admin/storage";

// This environment variable is crucial for the gRPC client used by Firestore Admin SDK
// to work correctly in modern Node.js environments. It specifies a set of supported
// SSL cipher suites to avoid low-level DECODER errors.
process.env.GRPC_SSL_CIPHER_SUITES = process.env.GRPC_SSL_CIPHER_SUITES ?? 'HIGH+ECDSA';

// Initialize the Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}

const firestoreClient = new firestore_v1.FirestoreAdminClient();
const storage = getStorage();

// The search function has been removed to be replaced with a client-side implementation.

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

export const onFeedbackCreated = functions.firestore
  .document('feedback/{feedbackId}')
  .onCreate(async (snap, context) => {
    const feedbackData = snap.data();

    if (!feedbackData) {
      console.log('No data associated with the feedback submission event.');
      return;
    }

    const { userId, topic, reporterName, type, feedback } = feedbackData;

    if (!userId) {
      console.log('Feedback was submitted without a user ID. No notification sent.');
      return;
    }

    try {
      // Fetch the user's profile to get their email address.
      const userRecord = await admin.auth().getUser(userId);
      const recipientEmail = userRecord.email;

      if (!recipientEmail) {
        console.log(`User ${userId} does not have an email address. Cannot send notification.`);
        return;
      }
      
      const emailSubject = `New Ogeemo Feedback Received: [${type}] ${topic}`;
      const emailBody = `
        <h2>New Feedback Submission</h2>
        <p>A new piece of feedback has been submitted on the Ogeemo platform.</p>
        <hr>
        <p><strong>From:</strong> ${reporterName}</p>
        <p><strong>Topic:</strong> ${topic}</p>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Feedback:</strong></p>
        <p style="border-left: 2px solid #ccc; padding-left: 1em; font-style: italic;">${feedback}</p>
        <hr>
        <p>You can view all feedback on your <a href="https://[YOUR_APP_URL]/reports/feedback">Feedback Report page</a>.</p>
      `;

      // In a real application, you would use a service like the "Trigger Email" Firebase Extension.
      // This function adds a document to the 'mail' collection, which that extension would then process.
      await admin.firestore().collection('mail').add({
        to: recipientEmail,
        message: {
          subject: emailSubject,
          html: emailBody,
        },
      });

      console.log(`Email notification queued for ${recipientEmail}.`);

    } catch (error) {
      console.error('Error in onFeedbackCreated function:', error);
    }
  });
