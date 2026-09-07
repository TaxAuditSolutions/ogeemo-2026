import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { initializeApp as initClient, getApps as getClientApps } from "firebase/app";
import { getAuth as getClientAuth, signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, getFirestore, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";

dotenv.config({ path: ".env.local" });

const RESULTS_FILE = path.join(process.env.TEMP || ".", "data-layer-results.log");
fs.writeFileSync(RESULTS_FILE, `=== verify-notes-data-layer started ${new Date().toISOString()} ===\n`);

// Mirrors src/services/user-notes-service.ts exactly — this proves the data
// layer + security rules work for a real authenticated client BEFORE any UI.
const USER_NOTES_COLLECTION = "userNoteSessions";

function toDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value?.toDate === "function") return value.toDate();
    return undefined;
}

function deriveNoteTitle(content: string): string {
    const firstLine = content.split("\n").map((l) => l.trim()).find((l) => l.length > 0);
    const derived = firstLine || "Untitled Note";
    return derived.length > 60 ? `${derived.slice(0, 57)}...` : derived;
}

const results: Array<{ step: string; pass: boolean; detail?: string }> = [];
function assert(step: string, pass: boolean, detail = "") {
    results.push({ step, pass, detail });
    const line = `${pass ? "PASS" : "FAIL"} — ${step}${detail ? ` (${detail})` : ""}`;
    console.log(line);
    fs.appendFileSync(RESULTS_FILE, line + "\n");
}

async function main() {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local");
        process.exit(1);
    }
    let cleanKey = serviceAccountKey.trim();
    if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) cleanKey = cleanKey.slice(1, -1);
    else if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) cleanKey = cleanKey.slice(1, -1);
    const serviceAccount = JSON.parse(cleanKey);
    if (serviceAccount.private_key) serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

    const uid = process.argv[2] || "PL3SyJ7IUkVjqOPBAEiJD2BVNdJ2";

    let adminApp: App;
    if (getApps().length === 0) {
        adminApp = initializeApp({ credential: cert(serviceAccount), storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET });
    } else {
        adminApp = getApps()[0];
    }
    const customToken = await getAuth(adminApp).createCustomToken(uid);

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ogeemo-2026";
    const clientApp = getClientApps().length === 0
        ? initClient({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
            projectId,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        })
        : getClientApps()[0];
    const clientAuth = getClientAuth(clientApp);
    await signInWithCustomToken(clientAuth, customToken);
    console.log(`Signed in as ${clientAuth.currentUser?.uid} on project ${projectId}\n`);

    const db = getFirestore(clientApp);
    const sessionRef = doc(db, USER_NOTES_COLLECTION, uid);

    async function readNotesFromServer(): Promise<Array<any>> {
        const snap = await getDoc(sessionRef);
        if (!snap.exists()) return [];
        const data = snap.data();
        return Array.isArray(data?.notes) ? data.notes : [];
    }
    async function upsert(note: any) {
        const notes = await readNotesFromServer();
        const normalized = {
            ...note,
            userId: uid,
            title: note.title?.trim() || deriveNoteTitle(note.content),
            content: typeof note.content === "string" ? note.content : "",
            updatedAt: new Date(),
        };
        const exists = notes.some((item: any) => item.id === normalized.id);
        const nextNotes = exists ? notes.map((item: any) => (item.id === normalized.id ? normalized : item)) : [normalized, ...notes];
        await setDoc(sessionRef, { userId: uid, notes: nextNotes, updatedAt: serverTimestamp() }, { merge: true });
    }

    const noteId = `verify-${Date.now()}`;

    // 1) CREATE
    await upsert({ id: noteId, title: "", content: "", createdAt: new Date() });
    let created = false;
    let serverNote: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise((r) => setTimeout(r, 400));
        const notes = await readNotesFromServer();
        serverNote = notes.find((n: any) => n.id === noteId);
        if (serverNote) { created = true; break; }
    }
    assert("CREATE persists to server", created);

    // 2) SAVE (content)
    await upsert({ id: noteId, title: "", content: "Hello from the data-layer verification.", createdAt: serverNote?.createdAt ?? new Date() });
    await new Promise((r) => setTimeout(r, 800));
    const notesAfterSave = await readNotesFromServer();
    const savedNote = notesAfterSave.find((n: any) => n.id === noteId);
    assert("SAVE persists content", savedNote?.content === "Hello from the data-layer verification.");

    // 3) DERIVED TITLE
    assert("Title derives from content", savedNote?.title === "Hello from the data-layer verification.", `title: "${savedNote?.title}"`);

    // 4) RENAME
    await upsert({ id: noteId, title: "Renamed Verification Note", content: "Hello from the data-layer verification.", createdAt: serverNote?.createdAt ?? new Date() });
    await new Promise((r) => setTimeout(r, 800));
    const notesAfterRename = await readNotesFromServer();
    const renamedNote = notesAfterRename.find((n: any) => n.id === noteId);
    assert("RENAME persists", renamedNote?.title === "Renamed Verification Note");

    // 5) LIST (presence)
    const listContains = notesAfterRename.some((n: any) => n.id === noteId);
    assert("LIST contains note", listContains);

    // 6) DELETE
    const remaining = notesAfterRename.filter((n: any) => n.id !== noteId);
    await setDoc(sessionRef, { userId: uid, notes: remaining, updatedAt: serverTimestamp() }, { merge: true });
    await new Promise((r) => setTimeout(r, 800));
    const notesAfterDelete = await readNotesFromServer();
    assert("DELETE removes note", !notesAfterDelete.some((n: any) => n.id === noteId), `notes remaining: ${notesAfterDelete.length}`);

    const failed = results.filter((r) => !r.pass);
    console.log(`\n=== DATA LAYER: ${results.length - failed.length}/${results.length} PASSED ===`);
    // Let stdout flush before exiting (process.exit truncates piped output).
    process.exitCode = failed.length > 0 ? 1 : 0;
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exitCode = 1;
});