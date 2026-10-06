import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

dotenv.config({ path: ".env.local" });

/** READ-ONLY: users vs worker records — who is missing the Worker connection. */
async function main() {
    const key = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "").trim();
    let clean = key;
    if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) clean = clean.slice(1, -1);
    const sa = JSON.parse(clean);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(sa) });
    const db = getFirestore(app);
    const auth = getAuth(app);

    const users: any[] = [];
    let pageToken: string | undefined;
    do {
        const page = await auth.listUsers(100, pageToken);
        users.push(...page.users);
        pageToken = page.pageToken;
    } while (pageToken);

    const contactsSnap = await db.collection("contacts").get();
    const workerEmails = new Set<string>();
    const workerNames = new Set<string>();
    contactsSnap.docs.forEach((d) => {
        const c = d.data() as any;
        if (c.workerType != null) {
            if (c.email) workerEmails.add(String(c.email).toLowerCase());
            if (c.name) workerNames.add(String(c.name).toLowerCase());
        }
    });

    console.log(`auth users: ${users.length}`);
    for (const u of users) {
        const email = (u.email || "").toLowerCase();
        const name = (u.displayName || "(no name)").toLowerCase();
        const hasWorker = workerEmails.has(email) || workerNames.has(name);
        const claims: any = u.customClaims || {};
        console.log(`  ${u.displayName || "?"} <${u.email}> access=${claims.accessLevel || "?"} org=${claims.orgId || "?"} worker=${hasWorker ? "YES" : "MISSING"}`);
    }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
