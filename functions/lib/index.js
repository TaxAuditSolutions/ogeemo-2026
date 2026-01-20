"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserAuth = void 0;
// This environment variable MUST be set before any other Firebase modules are loaded.
// It is crucial for the gRPC client used by the Admin SDK to work correctly in
// modern Node.js environments, avoiding low-level SSL DECODER errors.
process.env.GRPC_SSL_CIPHER_SUITES = (_a = process.env.GRPC_SSL_CIPHER_SUITES) !== null && _a !== void 0 ? _a : 'HIGH+ECDSA';
const admin = require("firebase-admin");
const functions = require("firebase-functions");
// Initialize the Firebase Admin SDK.
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.updateUserAuth = functions.https.onCall(async (data, context) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to update a user.");
    }
    const { uid, email, password } = data;
    // 2. Input Validation
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "uid" for the user to be updated.');
    }
    // Security Check: Ensure user is updating themselves
    if (context.auth.uid !== uid) {
        throw new functions.https.HttpsError("permission-denied", "You can only update your own account security settings.");
    }
    const updatePayload = {};
    if (email)
        updatePayload.email = email;
    if (password)
        updatePayload.password = password;
    if (Object.keys(updatePayload).length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Either "email" or "password" must be provided for the update.');
    }
    // 3. Core Logic with Error Handling
    try {
        console.log(`Attempting to update user ${uid} with payload keys: ${Object.keys(updatePayload).join(', ')}`);
        await admin.auth().updateUser(uid, updatePayload);
        console.log(`Successfully updated user: ${uid}`);
        return { success: true, message: `User ${uid} updated successfully.` };
    }
    catch (error) {
        console.error(`Failed to update user ${uid}:`, error);
        // Map common auth errors
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', `The user with UID "${uid}" does not exist.`);
        }
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'The email address is already in use by another account.');
        }
        if (error.code === 'auth/invalid-password') {
            throw new functions.https.HttpsError('invalid-argument', 'The password provided is invalid (must be at least 6 characters).');
        }
        const isPermissionError = (error.code === 'auth/insufficient-permission' || (error.message && error.message.toLowerCase().includes('permission denied')));
        if (isPermissionError) {
            throw new functions.https.HttpsError('permission-denied', "The backend service account does not have permission to update user accounts. Please grant the 'Firebase Authentication Admin' role to your function's service account.");
        }
        // Return the actual error message if safe, otherwise internal
        // In development/debugging, seeing the message is helpful.
        throw new functions.https.HttpsError('internal', error.message || 'An unexpected error occurred while updating the user.');
    }
});
//# sourceMappingURL=index.js.map