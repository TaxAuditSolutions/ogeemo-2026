"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserAuth = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
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
    if (!password || password.length < 6) {
        throw new https_1.HttpsError("invalid-argument", "Password must be at least 6 characters long.");
    }
    await auth.updateUser(uid, { password });
    return { success: true, uid };
});
//# sourceMappingURL=index.js.map