import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  initializeApp();
}

export const updateUserAuth = onCall(async (request) => {
  const auth = getAuth();
  const uid = typeof request.data?.uid === "string" ? request.data.uid : undefined;
  const password = typeof request.data?.password === "string" ? request.data.password : undefined;

  if (!uid) {
    throw new HttpsError("invalid-argument", "A valid user id is required.");
  }

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to change a password.");
  }

  const callerUid = request.auth.uid;
  const callerClaims = request.auth.token ?? {} as any;
  const isCallerSelf = callerUid === uid;
  const isAdmin = callerClaims.accessLevel === "super_admin" || callerClaims.accessLevel === "org_admin";

  if (!isCallerSelf && !isAdmin) {
    throw new HttpsError("permission-denied", "You are not allowed to change this password.");
  }

  if (!password || password.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters long.");
  }

  await auth.updateUser(uid, { password });

  return { success: true, uid };
});
