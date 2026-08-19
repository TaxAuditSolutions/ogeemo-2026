import dotenv from "dotenv";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

const MASTER_TENANT_NAME = "Ogeemo";
const MASTER_TENANT_ORG_ID = "ogeemo-master";

async function main() {
    const email = process.env.SEED_SUPER_ADMIN_EMAIL;
    const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
    const name = process.env.SEED_SUPER_ADMIN_NAME ?? "Ogeemo Super Admin";

    if (!email) {
        throw new Error("Missing SEED_SUPER_ADMIN_EMAIL env var.");
    }
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = "keys/ogeemo-firebase-firebase-adminsdk-fbsvc-ef0acfe30c.json";
    }

    if (getApps().length === 0) {
        initializeApp({ credential: applicationDefault() });
    }

    const db = getFirestore();
    const auth = getAuth();

    // 1. Idempotently create/upgrade the master tenant organization.
    const orgRef = db.collection("organizations").doc(MASTER_TENANT_ORG_ID);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
        await orgRef.set({
            id: MASTER_TENANT_ORG_ID,
            name: MASTER_TENANT_NAME,
            createdAt: FieldValue.serverTimestamp(),
            ownerUid: null,
            isMasterTenant: true,
        });
        console.log(`Created master tenant organization: ${MASTER_TENANT_ORG_ID}`);
    } else if (orgSnap.data()?.isMasterTenant !== true) {
        await orgRef.update({ isMasterTenant: true, updatedAt: FieldValue.serverTimestamp() });
        console.log(`Upgraded existing organization to master tenant: ${MASTER_TENANT_ORG_ID}`);
    } else {
        console.log(`Master tenant organization already exists: ${MASTER_TENANT_ORG_ID}`);
    }

    // 2. Idempotently provision/promote the first super_admin user.
    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(email);
        console.log(`Found existing auth user for ${email} (${userRecord.uid}).`);
    } catch {
        userRecord = await auth.createUser({ email, password, displayName: name });
        console.log(`Created new auth user for ${email} (${userRecord.uid}).`);
    }

    const uid = userRecord.uid;
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
        await userRef.set({
            id: uid,
            email,
            displayName: name,
            orgId: MASTER_TENANT_ORG_ID,
            accessLevel: "super_admin",
            mentorshipRole: "Apprentice",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    } else {
        await userRef.update({
            orgId: MASTER_TENANT_ORG_ID,
            accessLevel: "super_admin",
            updatedAt: FieldValue.serverTimestamp(),
        });
    }

    await auth.setCustomUserClaims(uid, {
        orgId: MASTER_TENANT_ORG_ID,
        accessLevel: "super_admin",
        isMasterTenant: true,
    });

    console.log(`Provisioned ${email} as super_admin of the master tenant.`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
