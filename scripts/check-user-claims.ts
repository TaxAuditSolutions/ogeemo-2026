import dotenv from "dotenv";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

dotenv.config({ path: ".env.local" });

async function main() {
    const email = process.argv[2];

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

    const auth = getAuth(app);

    if (email) {
        // Check specific user
        try {
            const userRecord = await auth.getUserByEmail(email);
            const customClaims = userRecord.customClaims || {};
            console.log(`\n=== User: ${email} ===`);
            console.log(`UID: ${userRecord.uid}`);
            console.log(`Display Name: ${userRecord.displayName || '(none)'}`);
            console.log(`Custom Claims:`, JSON.stringify(customClaims, null, 2));
            console.log(`accessLevel: ${customClaims?.accessLevel || '(not set)'}`);
            console.log(`isMasterTenant: ${customClaims?.isMasterTenant ?? '(not set)'}`);
            console.log(`orgId: ${customClaims?.orgId || '(not set)'}`);
        } catch {
            console.error(`No Firebase Auth user found for email: ${email}`);
            process.exit(1);
        }
    } else {
        // List all users and their claims
        console.log("=== All Firebase Auth Users ===\n");
        const listUsers = await auth.listUsers(1000);
        for (const user of listUsers.users) {
            const claims = user.customClaims || {};
            console.log(`Email: ${user.email}`);
            console.log(`  UID: ${user.uid}`);
            console.log(`  accessLevel: ${claims.accessLevel || '(not set)'}`);
            console.log(`  isMasterTenant: ${claims.isMasterTenant ?? '(not set)'}`);
            console.log(`  orgId: ${claims.orgId || '(not set)'}`);
            console.log('');
        }
        console.log(`Total users: ${listUsers.users.length}`);
    }
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
});