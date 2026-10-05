import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

/** READ-ONLY: print every organization doc (id -> display name). */
async function main() {
    const key = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "").trim();
    let clean = key;
    if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) clean = clean.slice(1, -1);
    const sa = JSON.parse(clean);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    const db = getFirestore(getApps().length ? getApps()[0] : initializeApp({ credential: cert(sa) }));
    const snap = await db.collection("organizations").get();
    console.log(`organizations: ${snap.size}`);
    snap.docs.forEach((d) => {
        const x = d.data() as any;
        const name = x.name || x.companyName || x.orgName || x.displayName || "(no name field)";
        console.log(`  ${d.id} -> "${name}"`);
    });
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
