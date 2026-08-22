import crypto from "crypto";
import dotenv from "dotenv";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

dotenv.config({ path: ".env.local" });

function generateTempPassword(): string {
    // 16 random bytes -> base64url, trimmed to a manageable length.
    return crypto.randomBytes(16).toString("base64url");
}

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.error("Usage: npx tsx scripts/reset-user-password.ts <email@example.com>");
        process.exit(1);
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local");
        process.exit(1);
    }

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

    let app: App;
    if (getApps().length === 0) {
        app = initializeApp({ credential: cert(serviceAccount) });
    } else {
        app = getApps()[0];
    }

    const auth = getAuth(app);
    const userRecord = await auth.getUserByEmail(email);
    const tempPassword = generateTempPassword();

    await auth.updateUser(userRecord.uid, { password: tempPassword });

    console.log(`Password reset for ${email} (uid: ${userRecord.uid}).`);
    console.log(`Temporary password: ${tempPassword}`);
    console.log("Log in with this password, then change it immediately from /change-password.");
}

main().catch((error) => {
    console.error("Failed to reset password:", error);
    process.exit(1);
});
