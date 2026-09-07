import dotenv from "dotenv";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { initializeApp as initializeClientApp, getApps as getClientApps } from "firebase/app";
import { getAuth as getClientAuth, signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, getDocFromCache, getFirestore, setDoc, serverTimestamp, deleteField } from "firebase/firestore";

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

    const targetUid = process.argv[2] || "PL3SyJ7IUkVjqOPBAEiJD2BVNdJ2";
    const targetNoteId = process.argv[3] || "3ad0c3d6-46b8-4f0c-98f5-4957b81ffdff";

    // 1) Admin: mint a custom token for the target user (bypasses password auth).
    let adminApp: App;
    if (getApps().length === 0) {
        adminApp = initializeApp({ credential: cert(serviceAccount), storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET });
    } else {
        adminApp = getApps()[0];
    }
    const customToken = await getAuth(adminApp).createCustomToken(targetUid);
    console.log(`Minted custom token for uid: ${targetUid}`);

    // 2) Client: exact same init the app uses (env-driven config).
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ogeemo-2026";
    const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
        projectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    console.log(`Client projectId: ${projectId}`);

    const clientApp = getClientApps().length === 0
        ? initializeClientApp(firebaseConfig)
        : getClientApps()[0];
    const clientAuth = getClientAuth(clientApp);
    await signInWithCustomToken(clientAuth, customToken);
    console.log(`Signed in as: ${clientAuth.currentUser?.uid}`);

    const db = getFirestore(clientApp);

    // 3) Reproduce the editor's lookup.
    const sessionRef = doc(db, "userNoteSessions", targetUid);
    let snapshot = await getDoc(sessionRef);
    console.log(`Server getDoc exists: ${snapshot.exists()}`);

    if (!snapshot.exists()) {
        try {
            snapshot = await getDocFromCache(sessionRef);
            console.log(`Cache getDoc exists: ${snapshot.exists()}`);
        } catch (error: any) {
            console.log(`Cache getDoc failed: ${error.message}`);
            return;
        }
    }

    const data = snapshot.data();
    const notes = Array.isArray(data?.notes) ? data.notes : [];
    console.log(`notes in doc: ${notes.length}`);
    const personal = notes.find((entry: any) => entry.id === targetNoteId);
    console.log(`Target note "${targetNoteId}" found: ${!!personal}`);
    if (personal) {
        console.log(`  title: "${personal.title}" | content length: ${(personal.content || "").length}`);
    } else {
        console.log(`  available ids: ${notes.map((n: any) => n.id).join(", ")}`);
    }

    // 4) Probe: verify a client-authenticated WRITE actually persists on the server.
    const probeRef = doc(db, "userNoteSessions", targetUid);
    await setDoc(probeRef, { writeProbeAt: serverTimestamp() }, { merge: true });
    console.log("Probe write committed locally");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const probeSnap = await getDoc(probeRef); // default source = server
    const probeData = probeSnap.data();
    console.log(`Probe write visible on SERVER: ${!!probeData?.writeProbeAt}`);
    if (!probeData?.writeProbeAt) {
        console.log(">>> WRITE WAS REJECTED — security rules on the server do not allow it!");
    }
    // cleanup the probe field (merge keeps the notes array intact)
    await setDoc(probeRef, { writeProbeAt: deleteField() }, { merge: true });
    console.log("Probe field cleaned up");
}

main().catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
});