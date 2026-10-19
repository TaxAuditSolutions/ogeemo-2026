import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import {
  AUTH_EXPORT_FOLDER_PREFIX,
  AuthExportSummary,
  AuthExportUser,
  BackupFileInput,
  CallerClaims,
  DATABASE_EXPORT_FOLDER_PREFIX,
  DatabaseBackupSummary,
  authExportFileMatchesOrg,
  authExportObjectName,
  authExportScope,
  buildAuthExportCsv,
  filterUsersForExport,
  firestoreExportPrefix,
  groupDatabaseExportFiles,
  isAllowedBackupObjectPath,
  isAuthExportAuthorized,
  isFullExportAuthorized,
  isRestorablePrefix,
  messageFromError,
} from "./backup-utils";

if (!getApps().length) {
  initializeApp();
}

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? "ogeemo-firebase";
const REGION = "us-central1";
/** Backups bucket; must live in the Firestore database region (northamerica-northeast2). */
const BACKUP_BUCKET = `${PROJECT_ID}-backups`;

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

  const isStrongPassword =
    !!password &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password);

  if (!isStrongPassword) {
    throw new HttpsError(
      "invalid-argument",
      "Password must be at least 8 characters and include uppercase, lowercase, numeric, and special characters."
    );
  }

  await auth.updateUser(uid, { password });

  return { success: true, uid };
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Access token of the function's own runtime service account (metadata server).
 * Used for direct Firestore Admin REST calls (exportDocuments + operation polling).
 */
async function getRuntimeAccessToken(): Promise<string> {
  const res = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } }
  );
  if (!res.ok) {
    throw new Error(`Metadata token request failed (${res.status})`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("Metadata token response did not include an access token.");
  }
  // Log which identity the export will run as (token payload is not secret).
  try {
    const payload = JSON.parse(Buffer.from(json.access_token.split(".")[1], "base64url").toString("utf8"));
    console.info("Runtime token identity:", payload.email ?? "(none)", "aud:", payload.aud ?? "(none)");
  } catch {
    console.info("Runtime token identity: (could not decode token payload)");
  }
  return json.access_token;
}

async function firestoreRest(pathname: string, init?: RequestInit): Promise<{ ok: boolean; status: number; json: any }> {
  const token = await getRuntimeAccessToken();
  const url = `https://firestore.googleapis.com/v1/${pathname}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("Firestore REST call failed:", url, res.status, text.slice(0, 400));
  }
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON error body
  }
  return { ok: res.ok, status: res.status, json };
}

interface ExportOperationStatus {
  done: boolean;
  state: string | null;
  failed: boolean;
  outputUriPrefix: string | null;
  errorMessage: string | null;
}

async function getExportOperation(operationName: string): Promise<ExportOperationStatus> {
  const { ok, status, json } = await firestoreRest(operationName);
  if (!ok) {
    console.error("Export operation poll failed:", status, JSON.stringify(json).slice(0, 400));
    throw new HttpsError("internal", "Could not read the export status. Please retry in a moment.");
  }
  const done = json.done === true;
  const state = typeof json.metadata?.state === "string" ? json.metadata.state : null;
  const failed = done && (!!json.error || state === "FAILED" || state === "CANCELLED");
  return {
    done,
    state,
    failed,
    outputUriPrefix: typeof json.response?.outputUriPrefix === "string" ? json.response.outputUriPrefix : null,
    errorMessage: json.error ? messageFromError(json.error, "The export failed.") : null,
  };
}

function requireFullExportAccess(request: CallableRequest): CallerClaims {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to start a backup.");
  }
  const claims = request.auth.token as CallerClaims;
  if (!isFullExportAuthorized(claims)) {
    throw new HttpsError(
      "permission-denied",
      "A full-database backup includes every workspace's data, so it is limited to Ogeemo platform administrators."
    );
  }
  return claims;
}

/**
 * Starts a point-in-time export of the entire Firestore database into the
 * project's backups bucket. Returns quickly for small databases (completed)
 * or the operation name so the client can poll getBackupStatus.
 */
export const triggerFirestoreBackup = onCall({ region: REGION, timeoutSeconds: 300, memory: "512MiB" }, async (request) => {
  requireFullExportAccess(request);

  const objectPrefix = firestoreExportPrefix();
  const outputUriPrefix = `gs://${BACKUP_BUCKET}/${objectPrefix}`;

  const start = await firestoreRest(`projects/${PROJECT_ID}/databases/(default):exportDocuments`, {
    method: "POST",
    body: JSON.stringify({ outputUriPrefix }),
  });
  if (!start.ok) {
    console.error("Firestore export start failed:", start.status, JSON.stringify(start.json).slice(0, 500));
    throw new HttpsError(
      "internal",
      "The database export could not be started. This usually means a backup service permission is missing - ask an administrator to check the backup function logs."
    );
  }

  const operationName = typeof start.json.name === "string" ? start.json.name : "";
  if (!operationName) {
    throw new HttpsError("internal", "The database export did not return a valid operation.");
  }

  // Wait briefly so small databases report completion immediately.
  for (let i = 0; i < 8; i += 1) {
    await sleep(2000);
    const status = await getExportOperation(operationName);
    if (status.done) {
      if (status.failed) {
        throw new HttpsError("internal", `The database export failed: ${status.errorMessage ?? "unknown error"}`);
      }
      return {
        message: "Database export completed. Your files are in the backups bucket.",
        outputUriPrefix: status.outputUriPrefix ?? outputUriPrefix,
        operationName,
        status: "completed",
      };
    }
  }

  return {
    message: "Database export started. Large databases can take a few minutes to finish.",
    outputUriPrefix,
    operationName,
    status: "running",
  };
});

/** Polls a Firestore export operation started by triggerFirestoreBackup. */
export const getBackupStatus = onCall({ region: REGION, timeoutSeconds: 60 }, async (request) => {
  requireFullExportAccess(request);

  const operationName = typeof request.data?.operationName === "string" ? request.data.operationName : "";
  if (!operationName.startsWith(`projects/${PROJECT_ID}/databases/`)) {
    throw new HttpsError("invalid-argument", "A valid export operation is required.");
  }

  const status = await getExportOperation(operationName);
  return {
    status: status.failed ? "failed" : status.done ? "completed" : "running",
    state: status.state,
    outputUriPrefix: status.outputUriPrefix,
    message: status.errorMessage ?? (status.done ? "Export completed." : "Export in progress."),
  };
});

/**
 * Exports the member directory (Firebase Auth users) to a CSV file in the
 * backups bucket. Platform administrators receive the full directory;
 * workspace (org) admins receive only users belonging to their workspace,
 * based on the orgId custom claim.
 */
export const triggerAuthBackup = onCall({ region: REGION, timeoutSeconds: 300, memory: "512MiB" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to start a backup.");
  }
  const claims = request.auth.token as CallerClaims;
  if (!isAuthExportAuthorized(claims)) {
    throw new HttpsError(
      "permission-denied",
      "Exporting a member directory requires a workspace administrator (their own workspace) or a platform administrator (full directory)."
    );
  }

  const scope = authExportScope(claims);
  const orgId = typeof claims.orgId === "string" ? claims.orgId : null;
  if (scope === "org" && !orgId) {
    throw new HttpsError("permission-denied", "Your account is not attached to a workspace, so there is nothing to export.");
  }

  const users: AuthExportUser[] = [];
  let pageToken: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    for (const user of page.users) {
      users.push({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        disabled: user.disabled,
        emailVerified: user.emailVerified,
        createdAt: user.metadata?.creationTime ? new Date(user.metadata.creationTime).toISOString() : undefined,
        lastSignInAt: user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toISOString() : undefined,
        accessLevel: typeof user.customClaims?.accessLevel === "string" ? user.customClaims.accessLevel : undefined,
        orgId: typeof user.customClaims?.orgId === "string" ? user.customClaims.orgId : undefined,
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);

  const selected = filterUsersForExport(users, scope, orgId);
  const csv = buildAuthExportCsv(selected);
  const objectName = authExportObjectName(scope, orgId);

  await getStorage()
    .bucket(BACKUP_BUCKET)
    .file(objectName)
    .save(csv, {
      contentType: "text/csv",
      resumable: false,
      metadata: { cacheControl: "private, max-age=0" },
    });

  return {
    message:
      scope === "all"
        ? `Member directory exported (${selected.length} users).`
        : `Member directory exported for your workspace (${selected.length} users).`,
    destination: `gs://${BACKUP_BUCKET}/${objectName}`,
    userCount: selected.length,
    scope,
  };
});

function requireSignedIn(request: CallableRequest): CallerClaims {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  return request.auth.token as CallerClaims;
}

/**
 * Lists stored database backups (export folders) and member-directory CSVs.
 * Platform administrators see everything; workspace administrators only see
 * their own member-directory exports.
 */
export const listBackups = onCall({ region: REGION, timeoutSeconds: 120, memory: "256MiB" }, async (request) => {
  const claims = requireSignedIn(request);
  const fullAccess = isFullExportAuthorized(claims);
  const orgId = typeof claims.orgId === "string" ? claims.orgId : null;
  if (!fullAccess && !(isAuthExportAuthorized(claims) && orgId)) {
    throw new HttpsError(
      "permission-denied",
      "Listing backups requires a platform administrator, or a workspace administrator for their own member-directory exports."
    );
  }

  const bucket = getStorage().bucket(BACKUP_BUCKET);
  const databaseBackups: DatabaseBackupSummary[] = [];
  if (fullAccess) {
    const [files] = await bucket.getFiles({ prefix: DATABASE_EXPORT_FOLDER_PREFIX });
    const inputs: BackupFileInput[] = files.map((file) => ({
      path: file.name,
      size: Number(file.metadata?.size ?? 0),
      updated: typeof file.metadata?.updated === "string" ? file.metadata.updated : null,
    }));
    databaseBackups.push(...groupDatabaseExportFiles(inputs));
  }

  const [authFiles] = await bucket.getFiles({ prefix: AUTH_EXPORT_FOLDER_PREFIX });
  const authExports: AuthExportSummary[] = authFiles
    .filter((file) => file.name.endsWith(".csv"))
    .filter((file) => fullAccess || authExportFileMatchesOrg(file.name, orgId ?? ""))
    .map((file) => ({
      path: file.name,
      size: Number(file.metadata?.size ?? 0),
      updatedAt: typeof file.metadata?.updated === "string" ? file.metadata.updated : null,
    }))
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

  return { databaseBackups, authExports, scope: fullAccess ? ("full" as const) : ("org" as const) };
});

/**
 * Restores the database from a stored backup by importing the export folder
 * back into the database (documents with the same IDs are overwritten from
 * the backup; everything else is left untouched). Requires an explicit
 * confirmation flag from the UI.
 */
export const restoreFirestoreBackup = onCall({ region: REGION, timeoutSeconds: 300, memory: "512MiB" }, async (request) => {
  requireFullExportAccess(request);

  const prefix = typeof request.data?.prefix === "string" ? request.data.prefix : "";
  const confirmed = request.data?.confirm === true;
  if (!confirmed) {
    throw new HttpsError("invalid-argument", "Restoring a backup requires an explicit confirmation.");
  }
  if (!isRestorablePrefix(prefix, BACKUP_BUCKET)) {
    throw new HttpsError("invalid-argument", "That backup location is not a valid Ogeemo backup.");
  }

  const start = await firestoreRest(`projects/${PROJECT_ID}/databases/(default):importDocuments`, {
    method: "POST",
    body: JSON.stringify({ inputUriPrefix: prefix }),
  });
  if (!start.ok) {
    console.error("Firestore import start failed:", start.status, JSON.stringify(start.json).slice(0, 500));
    throw new HttpsError(
      "internal",
      "The restore could not be started. This usually means a backup service permission is missing - ask an administrator to check the backup function logs."
    );
  }

  const operationName = typeof start.json.name === "string" ? start.json.name : "";
  if (!operationName) {
    throw new HttpsError("internal", "The restore did not return a valid operation.");
  }

  // Wait briefly so small restores report completion immediately.
  for (let i = 0; i < 8; i += 1) {
    await sleep(2000);
    const status = await getExportOperation(operationName);
    if (status.done) {
      if (status.failed) {
        throw new HttpsError("internal", `The restore failed: ${status.errorMessage ?? "unknown error"}`);
      }
      return {
        message: "Restore completed. Your database now contains the data from that backup.",
        operationName,
        status: "completed",
      };
    }
  }

  return {
    message: "Restore started. Large backups can take a few minutes to finish.",
    operationName,
    status: "running",
  };
});

/** Returns a short-lived signed download URL for a file inside the backups bucket. */
export const getDownloadUrl = onCall({ region: REGION, timeoutSeconds: 60, memory: "256MiB" }, async (request) => {
  const claims = requireSignedIn(request);
  const objectPath = typeof request.data?.objectPath === "string" ? request.data.objectPath : "";
  if (!isAllowedBackupObjectPath(objectPath)) {
    throw new HttpsError("invalid-argument", "That file is not inside the backups folder.");
  }

  const fullAccess = isFullExportAuthorized(claims);
  if (objectPath.startsWith(DATABASE_EXPORT_FOLDER_PREFIX) && !fullAccess) {
    throw new HttpsError(
      "permission-denied",
      "Database backup files are limited to platform administrators because they contain every workspace's data."
    );
  }
  if (objectPath.startsWith(AUTH_EXPORT_FOLDER_PREFIX)) {
    const orgId = typeof claims.orgId === "string" ? claims.orgId : null;
    const ownsFile = orgId ? authExportFileMatchesOrg(objectPath, orgId) : false;
    if (!fullAccess && !ownsFile) {
      throw new HttpsError("permission-denied", "You can only download member-directory exports for your own workspace.");
    }
  }

  const [url] = await getStorage()
    .bucket(BACKUP_BUCKET)
    .file(objectPath)
    .getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
      responseDisposition: "attachment",
    });

  return { url, expiresInSeconds: 15 * 60 };
});
