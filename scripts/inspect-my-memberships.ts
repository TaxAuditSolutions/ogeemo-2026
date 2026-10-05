import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

dotenv.config({ path: ".env.local" });

/** READ-ONLY: list one user's workspace memberships (what the switcher shows). */
async function main() {
    const email = process.argv[2] || "dan.white@taxauditsolutions.com";
    const key = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "").trim();
    let clean = key;
    if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) clean = clean.slice(1, -1);
    const sa = JSON.parse(clean);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(sa) });
    const db = getFirestore(app);
    const auth = getAuth(app);

    const user = await auth.getUserByEmail(email);
    const claims = (user.customClaims || {}) as any;
    console.log(`user uid: ${user.uid}`);
    console.log(`active orgId claim: ${claims.orgId || "(none)"}`);

    const snap = await db.collection("users").doc(user.uid).collection("orgMemberships").get();
    console.log(`orgMemberships: ${snap.size}`);
    for (const m of snap.docs) {
        const org = await db.collection("organizations").doc(m.id).get();
        const name = org.exists ? ((org.data() as any).name || "(no name)") : "(NO ORG DOC - switcher hides this)";
        const d = m.data() as any;
        console.log(`  ${m.id} -> "${name}" access=${d.accessLevel || "?"} active=${m.id === claims.orgId}`);
    }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
