import dotenv from "dotenv";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

/**
 * READ-ONLY phase 2: locate the lost workers of one org.
 * Dumps the org's contacts with resolved folder names, plus every workerId
 * referenced by timeLogs/leaveRequests and whether the contact still exists.
 * Usage: npx tsx scripts/inspect-workers-detail.ts [orgId]
 */
const ORG = process.argv[2] || "ogeemo-master";

async function main() {
    const key = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.SERVICE_ACCOUNT_KEY || "").trim();
    if (!key) { console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY"); process.exit(1); }
    let clean = key;
    if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) clean = clean.slice(1, -1);
    const sa = JSON.parse(clean);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    const app: App = getApps().length ? getApps()[0] : initializeApp({ credential: cert(sa) });
    const db = getFirestore(app);

    // 1. Folder id -> name for this org
    const foldersSnap = await db.collection("contactFolders").where("orgId", "==", ORG).get();
    const folderNames = new Map<string, string>();
    foldersSnap.docs.forEach((d) => folderNames.set(d.id, `${d.data().name}${d.data().isSystem ? " (system)" : ""}`));
    console.log(`=== ${ORG} folders (${foldersSnap.size}):`);
    foldersSnap.docs.forEach((d) => console.log(`   ${d.id} -> ${d.data().name}${d.data().isSystem ? " (system)" : ""}`));

    // 2. Contacts of this org, with resolved folders + worker-ish fields
    const contactsSnap = await db.collection("contacts").where("orgId", "==", ORG).get();
    console.log(`\n=== ${ORG} contacts (${contactsSnap.size}):`);
    contactsSnap.docs.forEach((d) => {
        const c = d.data() as any;
        const keys = Object.keys(c).filter((k) => /worker|pay|employ|occupation|status|folder/i.test(k));
        const detail: any = { id: d.id, name: c.name, folder: c.folderId ? (folderNames.get(c.folderId) || `UNKNOWN:${c.folderId}`) : "(none)" };
        keys.forEach((k) => (detail[k] = c[k]));
        console.log(`   ${JSON.stringify(detail)}`);
    });

    // 3. Every workerId referenced by timeLogs / leaveRequests
    for (const coll of ["timeLogs", "leaveRequests"]) {
        const snap = await db.collection(coll).where("orgId", "==", ORG).get();
        const ids = new Set<string>();
        snap.docs.forEach((d) => { const w = (d.data() as any).workerId; if (w) ids.add(w); });
        console.log(`\n=== ${coll}: ${snap.size} docs, ${ids.size} distinct workerIds`);
        if (snap.size && snap.docs[0]) console.log(`   sample fields: ${Object.keys(snap.docs[0].data()).join(", ")}`);
        for (const id of ids) {
            const contact = await db.collection("contacts").doc(id).get();
            const firstLog = snap.docs.find((d) => (d.data() as any).workerId === id);
            const ld: any = firstLog?.data() as any;
            const label = ld?.workerName || ld?.employeeName || ld?.name || "(no name field on log)";
            console.log(`   workerId=${id} contactExists=${contact.exists} nameInLog="${label}"`);
        }
    }

    // 4. Payroll run employee names (may name workers even if records are gone)
    const runsSnap = await db.collection("payrollRuns").where("orgId", "==", ORG).get();
    console.log(`\n=== payrollRuns: ${runsSnap.size}`);
    for (const r of runsSnap.docs) {
        const details = (r.data() as any).details || [];
        details.forEach((dd: any) => console.log(`   employeeName="${dd.employeeName}" employeeId=${dd.employeeId}`));
    }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
