// This environment variable MUST be set before any other Firebase modules are loaded.
// It is crucial for the gRPC client used by the Admin SDK to work correctly in
// modern Node.js environments, avoiding low-level SSL DECODER errors.
process.env.GRPC_SSL_CIPHER_SUITES = process.env.GRPC_SSL_CIPHER_SUITES ?? 'HIGH+ECDSA';

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// Initialize the Firebase Admin SDK.
if (!admin.apps.length) {
    admin.initializeApp();
}

export const updateUserAuth = functions.https.onCall(async (data, context) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to update a user.");
    }

    const { uid, email, password } = data;

    // 3. Input Validation
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "uid" for the user to be updated.');
    }
    
    const updatePayload: { email?: string; password?: string } = {};
    if (email) updatePayload.email = email;
    if (password) updatePayload.password = password;

    if (Object.keys(updatePayload).length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Either "email" or "password" must be provided for the update.');
    }

    // 4. Core Logic with Error Handling
    try {
        await admin.auth().updateUser(uid, updatePayload);
        console.log(`Successfully updated user: ${uid}`);
        return { success: true, message: `User ${uid} updated successfully.` };
    } catch (error: any) {
        console.error(`Failed to update user ${uid}:`, error);
        
        const isPermissionError = (error.code === 'auth/insufficient-permission' || (error.message && error.message.toLowerCase().includes('permission denied')));

        if (error.code === 'auth/user-not-found') {
             throw new functions.https.HttpsError('not-found', `The user with UID "${uid}" does not exist.`);
        }
        
        if (isPermissionError) {
             throw new functions.https.HttpsError(
                'permission-denied',
                "The backend service account does not have permission to update user accounts. Please grant the 'Firebase Authentication Admin' role to your function's service account. Refer to DEBUGGING_BACKUP_FEATURE.md for detailed instructions."
            );
        }

        // 6. Generic Fallback Error
        throw new functions.https.HttpsError('internal', error.message || 'An unexpected error occurred while updating the user.');
    }
});
