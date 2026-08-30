import dotenv from "dotenv";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

const MASTER_TENANT_ORG_ID = process.env.MASTER_TENANT_ORG_ID ?? "ogeemo-master";
const MASTER_TENANT_NAME = process.env.MASTER_TENANT_NAME ?? "Ogeemo";

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.error("Usage: npx tsx scripts/promote-to-super-admin.ts <your-email@example.com>");
        process.exit(1);
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
        console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local");
        process.exit(1);
    }

    // Parse the service account JSON (handle quoted strings from .env)
    let cleanKey = serviceAccountKey.trim();
    if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
        cleanKey = cleanKey.slice(1, -1);
    } else if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
        cleanKey = cleanKey.slice(1, -1);
    }
    const serviceAccount = JSON.parse(cleanKey);
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    // Initialize Firebase Admin
    let app: App;
    if (getApps().length === 0) {
        app = initializeApp({
            credential: cert(serviceAccount),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
    } else {
        app = getApps()[0];
    }

    const db = getFirestore(app);
    const auth = getAuth(app);

    // 1. Ensure the master tenant organization exists
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

    // 2. Find the user by email
    let userRecord;
    try {
        userRecord = await auth.getUserByEmail(email);
        console.log(`Found existing auth user for ${email} (${userRecord.uid}).`);
    } catch {
        console.error(`No Firebase Auth user found for email: ${email}`);
        console.error("Please sign up at the app first, then re-run this script.");
        process.exit(1);
    }

    const uid = userRecord.uid;
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    // 3. Update Firestore profile
    if (!userSnap.exists) {
        await userRef.set({
            id: uid,
            email,
            displayName: userRecord.displayName || "Super Admin",
            orgId: MASTER_TENANT_ORG_ID,
            accessLevel: "super_admin",
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
    console.log(`Updated Firestore profile for ${email}.`);

    // 4. Set custom claims
    await auth.setCustomUserClaims(uid, {
        orgId: MASTER_TENANT_ORG_ID,
        accessLevel: "super_admin",
        isMasterTenant: true,
    });

    console.log(`\n✅ Success! ${email} is now a super_admin on the master tenant.`);
    console.log(`\nNext steps:`);
    console.log(`  1. Log out of the app`);
    console.log(`  2. Log back in (this refreshes your auth token with the new claims)`);
    console.log(`  3. Navigate to /owner to access the Owner Console`);
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
});