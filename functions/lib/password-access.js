"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asRole = asRole;
exports.mayChangePassword = mayChangePassword;
exports.isStrongPassword = isStrongPassword;
const WEIGHT = { super_admin: 4, org_admin: 3, editor: 2, viewer: 1 };
function asRole(value) {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(WEIGHT, value) ? value : undefined;
}
function mayChangePassword(actor, target) {
    var _a;
    if (actor.uid === target.uid)
        return { ok: true };
    if (actor.role !== "org_admin" && actor.role !== "super_admin") {
        return { ok: false, message: "You are not allowed to change this password." };
    }
    if (actor.isPlatformAdmin)
        return { ok: true };
    if (!actor.orgId || !target.orgId || actor.orgId !== target.orgId) {
        return { ok: false, message: "You can only change passwords for people in your own workspace." };
    }
    if (actor.role !== "super_admin" && WEIGHT[actor.role] <= WEIGHT[(_a = target.role) !== null && _a !== void 0 ? _a : "viewer"]) {
        return { ok: false, message: "You can only change passwords for people with a lower role than yours." };
    }
    return { ok: true };
}
/** True when the password has 8+ characters with upper and lower case, a number and a symbol. */
function isStrongPassword(password) {
    return (typeof password === "string" &&
        password.length >= 8 &&
        password.length <= 128 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9\s]/.test(password));
}
//# sourceMappingURL=password-access.js.map