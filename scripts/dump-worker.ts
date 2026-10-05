import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

/** READ-ONLY: full dump of one contact doc (to clone a worker faithfully). */
async function main() {
    const orgId = process.argv[2];
    const contactId = process.argv[3];
    if (!orgId || !contactId) { console.error("usage: dump-worker.ts <orgId> <contactId>"); process.exit(1); }
    const key = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "").trim();
    let clean = key;
    if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) clean = clean.slice(1, -1);
    const sa = JSON.parse(clean);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    const db = getFirestore(getApps().length ? getApps()[0] : initializeApp({ credential: cert(sa) }));
    const snap = await db.collection("contacts").doc(contactId).get();
    if (!snap.exists) { console.log("contact not found"); return; }
    console.log(JSON.stringify(snap.data(), null, 2));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
