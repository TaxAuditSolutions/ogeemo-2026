"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDownloadUrl = exports.restoreFirestoreBackup = exports.listBackups = exports.triggerAuthBackup = exports.getBackupStatus = exports.triggerFirestoreBackup = exports.updateUserAuth = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const storage_1 = require("firebase-admin/storage");
const backup_utils_1 = require("./backup-utils");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const PROJECT_ID = (_b = (_a = process.env.GOOGLE_CLOUD_PROJECT) !== null && _a !== void 0 ? _a : process.env.GCLOUD_PROJECT) !== null && _b !== void 0 ? _b : "ogeemo-firebase";
const REGION = "us-central1";
/** Backups bucket; must live in the Firestore database region (northamerica-northeast2). */
const BACKUP_BUCKET = `${PROJECT_ID}-backups`;
exports.updateUserAuth = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    const auth = (0, auth_1.getAuth)();
    const uid = typeof ((_a = request.data) === null || _a === void 0 ? void 0 : _a.uid) === "string" ? request.data.uid : undefined;
    const password = typeof ((_b = request.data) === null || _b === void 0 ? void 0 : _b.password) === "string" ? request.data.password : undefined;
    if (!uid) {
        throw new https_1.HttpsError("invalid-argument", "A valid user id is required.");
    }
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to change a password.");
    }
    const callerUid = request.auth.uid;
    const callerClaims = (_c = request.auth.token) !== null && _c !== void 0 ? _c : {};
    const isCallerSelf = callerUid === uid;
    const isAdmin = callerClaims.accessLevel === "super_admin" || callerClaims.accessLevel === "org_admin";
    if (!isCallerSelf && !isAdmin) {
        throw new https_1.HttpsError("permission-denied", "You are not allowed to change this password.");
    }
    const isStrongPassword = !!password &&
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9\s]/.test(password);
    if (!isStrongPassword) {
        throw new https_1.HttpsError("invalid-argument", "Password must be at least 8 characters and include uppercase, lowercase, numeric, and special characters.");
    }
    await auth.updateUser(uid, { password });
    return { success: true, uid };
});
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Access token of the function's own runtime service account (metadata server).
 * Used for direct Firestore Admin REST calls (exportDocuments + operation polling).
 */
async function getRuntimeAccessToken() {
    var _a, _b;
    const res = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", { headers: { "Metadata-Flavor": "Google" } });
    if (!res.ok) {
        throw new Error(`Metadata token request failed (${res.status})`);
    }
    const json = (await res.json());
    if (!json.access_token) {
        throw new Error("Metadata token response did not include an access token.");
    }
    // Log which identity the export will run as (token payload is not secret).
    try {
        const payload = JSON.parse(Buffer.from(json.access_token.split(".")[1], "base64url").toString("utf8"));
        console.info("Runtime token identity:", (_a = payload.email) !== null && _a !== void 0 ? _a : "(none)", "aud:", (_b = payload.aud) !== null && _b !== void 0 ? _b : "(none)");
    }
    catch (_c) {
        console.info("Runtime token identity: (could not decode token payload)");
    }
    return json.access_token;
}
async function firestoreRest(pathname, init) {
    var _a;
    const token = await getRuntimeAccessToken();
    const url = `https://firestore.googleapis.com/v1/${pathname}`;
    const res = await fetch(url, Object.assign(Object.assign({}, init), { headers: Object.assign({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ((_a = init === null || init === void 0 ? void 0 : init.headers) !== null && _a !== void 0 ? _a : {})) }));
    const text = await res.text();
    if (!res.ok) {
        console.error("Firestore REST call failed:", url, res.status, text.slice(0, 400));
    }
    let json = {};
    try {
        json = JSON.parse(text);
    }
    catch (_b) {
        // non-JSON error body
    }
    return { ok: res.ok, status: res.status, json };
}
async function getExportOperation(operationName) {
    var _a, _b;
    const { ok, status, json } = await firestoreRest(operationName);
    if (!ok) {
        console.error("Export operation poll failed:", status, JSON.stringify(json).slice(0, 400));
        throw new https_1.HttpsError("internal", "Could not read the export status. Please retry in a moment.");
    }
    const done = json.done === true;
    const state = typeof ((_a = json.metadata) === null || _a === void 0 ? void 0 : _a.state) === "string" ? json.metadata.state : null;
    const failed = done && (!!json.error || state === "FAILED" || state === "CANCELLED");
    return {
        done,
        state,
        failed,
        outputUriPrefix: typeof ((_b = json.response) === null || _b === void 0 ? void 0 : _b.outputUriPrefix) === "string" ? json.response.outputUriPrefix : null,
        errorMessage: json.error ? (0, backup_utils_1.messageFromError)(json.error, "The export failed.") : null,
    };
}
function requireFullExportAccess(request) {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to start a backup.");
    }
    const claims = request.auth.token;
    if (!(0, backup_utils_1.isFullExportAuthorized)(claims)) {
        throw new https_1.HttpsError("permission-denied", "A full-database backup includes every workspace's data, so it is limited to Ogeemo platform administrators.");
    }
    return claims;
}
/**
 * Starts a point-in-time export of the entire Firestore database into the
 * project's backups bucket. Returns quickly for small databases (completed)
 * or the operation name so the client can poll getBackupStatus.
 */
exports.triggerFirestoreBackup = (0, https_1.onCall)({ region: REGION, timeoutSeconds: 300, memory: "512MiB" }, async (request) => {
    var _a, _b;
    requireFullExportAccess(request);
    const objectPrefix = (0, backup_utils_1.firestoreExportPrefix)();
    const outputUriPrefix = `gs://${BACKUP_BUCKET}/${objectPrefix}`;
    const start = await firestoreRest(`projects/${PROJECT_ID}/databases/(default):exportDocuments`, {
        method: "POST",
        body: JSON.stringify({ outputUriPrefix }),
    });
    if (!start.ok) {
        console.error("Firestore export start failed:", start.status, JSON.stringify(start.json).slice(0, 500));
        throw new https_1.HttpsError("internal", "The database export could not be started. This usually means a backup service permission is missing - ask an administrator to check the backup function logs.");
    }
    const operationName = typeof start.json.name === "string" ? start.json.name : "";
    if (!operationName) {
        throw new https_1.HttpsError("internal", "The database export did not return a valid operation.");
    }
    // Wait briefly so small databases report completion immediately.
    for (let i = 0; i < 8; i += 1) {
        await sleep(2000);
        const status = await getExportOperation(operationName);
        if (status.done) {
            if (status.failed) {
                throw new https_1.HttpsError("internal", `The database export failed: ${(_a = status.errorMessage) !== null && _a !== void 0 ? _a : "unknown error"}`);
            }
            return {
                message: "Database export completed. Your files are in the backups bucket.",
                outputUriPrefix: (_b = status.outputUriPrefix) !== null && _b !== void 0 ? _b : outputUriPrefix,
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
exports.getBackupStatus = (0, https_1.onCall)({ region: REGION, timeoutSeconds: 60 }, async (request) => {
    var _a, _b;
    requireFullExportAccess(request);
    const operationName = typeof ((_a = request.data) === null || _a === void 0 ? void 0 : _a.operationName) === "string" ? request.data.operationName : "";
    if (!operationName.startsWith(`projects/${PROJECT_ID}/databases/`)) {
        throw new https_1.HttpsError("invalid-argument", "A valid export operation is required.");
    }
    const status = await getExportOperation(operationName);
    return {
        status: status.failed ? "failed" : status.done ? "completed" : "running",
        state: status.state,
        outputUriPrefix: status.outputUriPrefix,
        message: (_b = status.errorMessage) !== null && _b !== void 0 ? _b : (status.done ? "Export completed." : "Export in progress."),
    };
});
/**
 * Exports the member directory (Firebase Auth users) to a CSV file in the
 * backups bucket. Platform administrators receive the full directory;
 * workspace (org) admins receive only users belonging to their workspace,
 * based on the orgId custom claim.
 */
exports.triggerAuthBackup = (0, https_1.onCall)({ region: REGION, timeoutSeconds: 300, memory: "512MiB" }, async (request) => {
    var _a, _b, _c, _d;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to start a backup.");
    }
    const claims = request.auth.token;
    if (!(0, backup_utils_1.isAuthExportAuthorized)(claims)) {
        throw new https_1.HttpsError("permission-denied", "Exporting a member directory requires a workspace administrator (their own workspace) or a platform administrator (full directory).");
    }
    const scope = (0, backup_utils_1.authExportScope)(claims);
    const orgId = typeof claims.orgId === "string" ? claims.orgId : null;
    if (scope === "org" && !orgId) {
        throw new https_1.HttpsError("permission-denied", "Your account is not attached to a workspace, so there is nothing to export.");
    }
    const users = [];
    let pageToken;
    do {
        const page = await (0, auth_1.getAuth)().listUsers(1000, pageToken);
        for (const user of page.users) {
            users.push({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                disabled: user.disabled,
                emailVerified: user.emailVerified,
                createdAt: ((_a = user.metadata) === null || _a === void 0 ? void 0 : _a.creationTime) ? new Date(user.metadata.creationTime).toISOString() : undefined,
                lastSignInAt: ((_b = user.metadata) === null || _b === void 0 ? void 0 : _b.lastSignInTime) ? new Date(user.metadata.lastSignInTime).toISOString() : undefined,
                accessLevel: typeof ((_c = user.customClaims) === null || _c === void 0 ? void 0 : _c.accessLevel) === "string" ? user.customClaims.accessLevel : undefined,
                orgId: typeof ((_d = user.customClaims) === null || _d === void 0 ? void 0 : _d.orgId) === "string" ? user.customClaims.orgId : undefined,
            });
        }
        pageToken = page.pageToken;
    } while (pageToken);
    const selected = (0, backup_utils_1.filterUsersForExport)(users, scope, orgId);
    const csv = (0, backup_utils_1.buildAuthExportCsv)(selected);
    const objectName = (0, backup_utils_1.authExportObjectName)(scope, orgId);
    await (0, storage_1.getStorage)()
        .bucket(BACKUP_BUCKET)
        .file(objectName)
        .save(csv, {
        contentType: "text/csv",
        resumable: false,
        metadata: { cacheControl: "private, max-age=0" },
    });
    return {
        message: scope === "all"
            ? `Member directory exported (${selected.length} users).`
            : `Member directory exported for your workspace (${selected.length} users).`,
        destination: `gs://${BACKUP_BUCKET}/${objectName}`,
        userCount: selected.length,
        scope,
    };
});
function requireSignedIn(request) {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    }
    return request.auth.token;
}
/**
 * Lists stored database backups (export folders) and member-directory CSVs.
 * Platform administrators see everything; workspace administrators only see
 * their own member-directory exports.
 */
exports.listBackups = (0, https_1.onCall)({ region: REGION, timeoutSeconds: 120, memory: "256MiB" }, async (request) => {
    const claims = requireSignedIn(request);
    const fullAccess = (0, backup_utils_1.isFullExportAuthorized)(claims);
    const orgId = typeof claims.orgId === "string" ? claims.orgId : null;
    if (!fullAccess && !((0, backup_utils_1.isAuthExportAuthorized)(claims) && orgId)) {
        throw new https_1.HttpsError("permission-denied", "Listing backups requires a platform administrator, or a workspace administrator for their own member-directory exports.");
    }
    const bucket = (0, storage_1.getStorage)().bucket(BACKUP_BUCKET);
    const databaseBackups = [];
    if (fullAccess) {
        const [files] = await bucket.getFiles({ prefix: backup_utils_1.DATABASE_EXPORT_FOLDER_PREFIX });
        const inputs = files.map((file) => {
            var _a, _b, _c;
            return ({
                path: file.name,
                size: Number((_b = (_a = file.metadata) === null || _a === void 0 ? void 0 : _a.size) !== null && _b !== void 0 ? _b : 0),
                updated: typeof ((_c = file.metadata) === null || _c === void 0 ? void 0 : _c.updated) === "string" ? file.metadata.updated : null,
            });
        });
        databaseBackups.push(...(0, backup_utils_1.groupDatabaseExportFiles)(inputs));
    }
    const [authFiles] = await bucket.getFiles({ prefix: backup_utils_1.AUTH_EXPORT_FOLDER_PREFIX });
    const authExports = authFiles
        .filter((file) => file.name.endsWith(".csv"))
        .filter((file) => fullAccess || (0, backup_utils_1.authExportFileMatchesOrg)(file.name, orgId !== null && orgId !== void 0 ? orgId : ""))
        .map((file) => {
        var _a, _b, _c;
        return ({
            path: file.name,
            size: Number((_b = (_a = file.metadata) === null || _a === void 0 ? void 0 : _a.size) !== null && _b !== void 0 ? _b : 0),
            updatedAt: typeof ((_c = file.metadata) === null || _c === void 0 ? void 0 : _c.updated) === "string" ? file.metadata.updated : null,
        });
    })
        .sort((a, b) => { var _a, _b; return ((_a = b.updatedAt) !== null && _a !== void 0 ? _a : "").localeCompare((_b = a.updatedAt) !== null && _b !== void 0 ? _b : ""); });
    return { databaseBackups, authExports, scope: fullAccess ? "full" : "org" };
});
/**
 * Restores the database from a stored backup by importing the export folder
 * back into the database (documents with the same IDs are overwritten from
 * the backup; everything else is left untouched). Requires an explicit
 * confirmation flag from the UI.
 */
exports.restoreFirestoreBackup = (0, https_1.onCall)({ region: REGION, timeoutSeconds: 300, memory: "512MiB" }, async (request) => {
    var _a, _b, _c;
    requireFullExportAccess(request);
    const prefix = typeof ((_a = request.data) === null || _a === void 0 ? void 0 : _a.prefix) === "string" ? request.data.prefix : "";
    const confirmed = ((_b = request.data) === null || _b === void 0 ? void 0 : _b.confirm) === true;
    if (!confirmed) {
        throw new https_1.HttpsError("invalid-argument", "Restoring a backup requires an explicit confirmation.");
    }
    if (!(0, backup_utils_1.isRestorablePrefix)(prefix, BACKUP_BUCKET)) {
        throw new https_1.HttpsError("invalid-argument", "That backup location is not a valid Ogeemo backup.");
    }
    const start = await firestoreRest(`projects/${PROJECT_ID}/databases/(default):importDocuments`, {
        method: "POST",
        body: JSON.stringify({ inputUriPrefix: prefix }),
    });
    if (!start.ok) {
        console.error("Firestore import start failed:", start.status, JSON.stringify(start.json).slice(0, 500));
        throw new https_1.HttpsError("internal", "The restore could not be started. This usually means a backup service permission is missing - ask an administrator to check the backup function logs.");
    }
    const operationName = typeof start.json.name === "string" ? start.json.name : "";
    if (!operationName) {
        throw new https_1.HttpsError("internal", "The restore did not return a valid operation.");
    }
    // Wait briefly so small restores report completion immediately.
    for (let i = 0; i < 8; i += 1) {
        await sleep(2000);
        const status = await getExportOperation(operationName);
        if (status.done) {
            if (status.failed) {
                throw new https_1.HttpsError("internal", `The restore failed: ${(_c = status.errorMessage) !== null && _c !== void 0 ? _c : "unknown error"}`);
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
exports.getDownloadUrl = (0, https_1.onCall)({ region: REGION, timeoutSeconds: 60, memory: "256MiB" }, async (request) => {
    var _a;
    const claims = requireSignedIn(request);
    const objectPath = typeof ((_a = request.data) === null || _a === void 0 ? void 0 : _a.objectPath) === "string" ? request.data.objectPath : "";
    if (!(0, backup_utils_1.isAllowedBackupObjectPath)(objectPath)) {
        throw new https_1.HttpsError("invalid-argument", "That file is not inside the backups folder.");
    }
    const fullAccess = (0, backup_utils_1.isFullExportAuthorized)(claims);
    if (objectPath.startsWith(backup_utils_1.DATABASE_EXPORT_FOLDER_PREFIX) && !fullAccess) {
        throw new https_1.HttpsError("permission-denied", "Database backup files are limited to platform administrators because they contain every workspace's data.");
    }
    if (objectPath.startsWith(backup_utils_1.AUTH_EXPORT_FOLDER_PREFIX)) {
        const orgId = typeof claims.orgId === "string" ? claims.orgId : null;
        const ownsFile = orgId ? (0, backup_utils_1.authExportFileMatchesOrg)(objectPath, orgId) : false;
        if (!fullAccess && !ownsFile) {
            throw new https_1.HttpsError("permission-denied", "You can only download member-directory exports for your own workspace.");
        }
    }
    const [url] = await (0, storage_1.getStorage)()
        .bucket(BACKUP_BUCKET)
        .file(objectPath)
        .getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000,
        responseDisposition: "attachment",
    });
    return { url, expiresInSeconds: 15 * 60 };
});
//# sourceMappingURL=index.js.map