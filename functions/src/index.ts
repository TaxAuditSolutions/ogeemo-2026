
// This environment variable MUST be set before any other Firebase modules are loaded.
// It is crucial for the gRPC client used by the Admin SDK to work correctly in
// modern Node.js environments, avoiding low-level SSL DECODER errors.
process.env.GRPC_SSL_CIPHER_SUITES = process.env.GRPC_SSL_CIPHER_SUITES ?? 'HIGH+ECDSA';

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { v1 as firestore_v1 } from "@google-cloud/firestore";
import { getStorage } from "firebase-admin/storage";
// import { google } from 'googleapis';

// Initialize the Firebase Admin SDK.
if (!admin.apps.length) {
    admin.initializeApp();
}

// Get service instances once and reuse them.
const db = admin.firestore();
const storage = getStorage();
const firestoreClient = new firestore_v1.FirestoreAdminClient();

// --- AUTH FUNCTIONS ---

export const updateUserAuth = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to update a user.");
    }
    const { uid, email, password } = data;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "uid" for the user to be updated.');
    }
    const updatePayload: { email?: string; password?: string } = {};
    if (email) updatePayload.email = email;
    if (password) updatePayload.password = password;
    if (Object.keys(updatePayload).length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Either "email" or "password" must be provided for the update.');
    }
    try {
        await admin.auth().updateUser(uid, updatePayload);
        console.log(`Successfully updated user ${uid}`);
        return { success: true, message: `User ${uid} updated successfully.` };
    } catch (error: any) {
        console.error(`Failed to update user ${uid}:`, error);
        const isPermissionError = (error.code === 'auth/insufficient-permission' || (error.message && error.message.toLowerCase().includes('permission denied')));
        if (isPermissionError) {
             throw new functions.https.HttpsError('permission-denied', "The backend service account does not have permission to update user accounts. Please grant the 'Firebase Authentication Admin' role. See DEBUGGING_BACKUP_FEATURE.md for instructions.");
        }
        throw new functions.https.HttpsError('internal', error.message || 'An unexpected error occurred.');
    }
});


// --- BACKUP FUNCTIONS ---

export const triggerFirestoreBackup = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    throw new functions.https.HttpsError('internal', 'GCLOUD_PROJECT environment variable not set.');
  }
  const databaseName = firestoreClient.databasePath(projectId, '(default)');
  const bucketName = `gs://${projectId}-backups`;
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const outputUriPrefix = `${bucketName}/firestore/${timestamp}`;
  try {
    const [response] = await firestoreClient.exportDocuments({
      name: databaseName,
      outputUriPrefix: outputUriPrefix,
      collectionIds: [],
    });
    return { message: "Firestore backup process initiated.", operationName: response.name };
  } catch (error: any) {
    console.error("Firestore backup failed:", error);
    throw new functions.https.HttpsError('internal', `Firestore backup failed. See DEBUGGING_BACKUP_FEATURE.md for potential permission fixes. Error: ${error.message}`);
  }
});

export const triggerAuthBackup = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const projectId = process.env.GCLOUD_PROJECT;
  if (!projectId) {
    throw new functions.https.HttpsError('internal', 'GCLOUD_PROJECT environment variable not set.');
  }
  const bucketName = `${projectId}-backups`;
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const destination = `auth/auth_export_${timestamp}.json`;
  try {
    const bucket = storage.bucket(bucketName);
    const [exists] = await bucket.exists();
    if (!exists) {
        await bucket.create();
    }
    const users: admin.auth.UserRecord[] = [];
    let nextPageToken;
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      listUsersResult.users.forEach(userRecord => users.push(userRecord));
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    const file = bucket.file(destination);
    await file.save(JSON.stringify(users.map(u => u.toJSON()), null, 2), { contentType: 'application/json' });
    return { message: `Successfully exported ${users.length} users.`, destination: `gs://${bucketName}/${destination}` };
  } catch (error: any) {
    console.error("Auth backup failed:", error);
    throw new functions.https.HttpsError('internal', `Auth backup failed. See DEBUGGING_BACKUP_FEATURE.md for potential permission fixes. Error: ${error.message}`);
  }
});


// --- IMAGE UPLOAD FUNCTIONS (NEW) ---

export const uploadSiteImage = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
    }

    const { fileDataUrl, imageId, hint, fileName } = data;

    if (!fileDataUrl || !imageId || !fileName) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required data.');
    }

    const userId = context.auth.uid;
    const bucket = storage.bucket();
    
    const mimeType = fileDataUrl.match(/data:(.*);base64,/)?.[1] || 'image/jpeg';
    const base64EncodedImageString = fileDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64EncodedImageString, 'base64');
    
    const storagePath = `siteimages/${imageId}/${fileName}`;
    const file = bucket.file(storagePath);
    
    try {
        await file.save(imageBuffer, {
            metadata: { contentType: mimeType },
        });

        const [downloadURL] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        });

        const docRef = db.collection('siteImages').doc(imageId);
        await docRef.set({
            url: downloadURL,
            storagePath: storagePath,
            hint: hint || '',
            updatedAt: new Date(),
            updatedBy: userId,
        }, { merge: true });

        return { success: true, message: 'Image uploaded successfully.' };
    } catch (error: any) {
        console.error(`[uploadSiteImage] Error for user ${userId}:`, JSON.stringify(error, null, 2));
        if (error.code === 403 || error.message?.includes('permission denied')) {
            throw new functions.https.HttpsError('permission-denied', "The service account lacks Storage permissions. Please see FIXING_IMAGE_UPLOAD.md for instructions.");
        }
        if (error.message?.includes('iam.serviceAccountTokenCreator')) {
             throw new functions.https.HttpsError('permission-denied', "The service account is missing the 'Service Account Token Creator' role, which is required to create public URLs for images. Please see FIXING_IMAGE_UPLOAD.md for instructions.");
        }
        throw new functions.https.HttpsError('internal', 'An unexpected server error occurred during upload. Check the function logs in the Google Cloud console for more details.');
    }
});

export const replaceSiteImage = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
    }

    const { fileDataUrl, imageId, fileName, storagePathToOverwrite } = data;
    if (!fileDataUrl || !imageId || !fileName || !storagePathToOverwrite) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required data.');
    }

    const bucket = storage.bucket();
    const file = bucket.file(storagePathToOverwrite);

    const mimeType = fileDataUrl.match(/data:(.*);base64,/)?.[1] || 'image/jpeg';
    const base64EncodedImageString = fileDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64EncodedImageString, 'base64');
    
    try {
        await file.save(imageBuffer, { metadata: { contentType: mimeType } });
        
        const [downloadURL] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });

        const docRef = db.collection('siteImages').doc(imageId);
        await docRef.update({
            url: downloadURL,
            updatedAt: new Date(),
            updatedBy: context.auth.uid,
        });

        return { success: true, message: 'Image replaced successfully.' };
    } catch (error: any) {
        console.error(`[replaceSiteImage] Error for user ${context.auth.uid}:`, JSON.stringify(error, null, 2));
        if (error.code === 403 || error.message?.includes('permission denied')) {
            throw new functions.https.HttpsError('permission-denied', "The service account lacks Storage permissions. Please see FIXING_IMAGE_UPLOAD.md for instructions.");
        }
         if (error.message?.includes('iam.serviceAccountTokenCreator')) {
             throw new functions.https.HttpsError('permission-denied', "The service account is missing the 'Service Account Token Creator' role, which is required to create public URLs for images. Please see FIXING_IMAGE_UPLOAD.md for instructions.");
        }
        throw new functions.https.HttpsError('internal', 'An unexpected server error occurred during replacement. Check the function logs in the Google Cloud console for more details.');
    }
});


export const deleteSiteImage = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
    }

    const { imageId, storagePath } = data;
    // Allow deletion even if storagePath is missing (cleans up broken records)
    if (!imageId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required data: imageId.');
    }

    if (storagePath) {
        try {
            const bucket = storage.bucket();
            await bucket.file(storagePath).delete();
        } catch (error: any) {
            if (error.code !== 404) { // Ignore 'Not Found' errors
                console.error(`Failed to delete from storage at ${storagePath}:`, error);
                // We continue to delete the document to unblock the user
            }
        }
    }

    await db.collection('siteImages').doc(imageId).delete();

    return { success: true, message: 'Image deleted successfully.' };
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

      await db.collection('mail').add({
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
