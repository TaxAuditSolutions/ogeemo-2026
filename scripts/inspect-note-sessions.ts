import dotenv from "dotenv";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

async function main() {
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

    console.log(`Service account project: ${serviceAccount.project_id}`);

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

    const snapshot = await db.collection("userNoteSessions").get();
    console.log(`\n=== userNoteSessions docs: ${snapshot.size} ===`);
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const notes = Array.isArray(data.notes) ? data.notes : [];
        console.log(`\nDoc userId: ${doc.id}`);
        console.log(`  notes count: ${notes.length}`);
        for (const note of notes) {
            console.log(`    - id: ${note.id} | title: "${note.title}" | content length: ${(note.content || "").length} | updatedAt: ${note.updatedAt?.toDate?.().toISOString?.() || note.updatedAt}`);
        }
    }

    // Also check the chat sessions collection for comparison (does the co-pilot pattern persist?).
    const chatSnapshot = await db.collection("userAssistantChatSessions").get();
    console.log(`\n=== userAssistantChatSessions docs (comparison): ${chatSnapshot.size} ===`);
    for (const doc of chatSnapshot.docs) {
        const data = doc.data();
        const threads = Array.isArray(data.threads) ? data.threads : [];
        console.log(`Doc userId: ${doc.id} | threads: ${threads.length}`);
    }
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
});