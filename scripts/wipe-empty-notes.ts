import dotenv from "dotenv";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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
    console.log(`Docs found: ${snapshot.size}`);

    let totalRemoved = 0;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const notes = Array.isArray(data.notes) ? data.notes : [];

        // Only remove notes that are truly phantom: no content AND no custom title.
        const kept = notes.filter((note: any) => {
            const hasContent = typeof note.content === "string" && note.content.trim().length > 0;
            const title = typeof note.title === "string" ? note.title.trim() : "";
            const hasCustomTitle = title.length > 0 && title !== "Untitled Note";
            return hasContent || hasCustomTitle;
        });
        const removed = notes.length - kept.length;

        if (removed > 0) {
            await doc.ref.update({ notes: kept, updatedAt: FieldValue.serverTimestamp() });
            totalRemoved += removed;
            console.log(`Doc ${doc.id}: removed ${removed} empty untitled note(s), kept ${kept.length}:`);
            for (const note of kept) {
                console.log(`  kept: "${note.title}" (content ${(note.content || "").length} chars)`);
            }
        } else {
            console.log(`Doc ${doc.id}: nothing to remove (${notes.length} notes).`);
        }
    }

    console.log(`\nWipe complete. Total removed: ${totalRemoved}`);
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
});