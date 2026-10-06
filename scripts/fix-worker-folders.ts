import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

/**
 * REPAIR (additive): worker contacts that sit outside the Workers taxonomy are
 * invisible to getWorkers. This re-files them into the Employees/Contractors/
 * Workers system folder of their own org (mirrors getWorkers' matching rules).
 * Contacts without workerType are never touched.
 */
const WORKER_NAMES = ["employees", "contractors", "workers"];

async function main() {
    const key = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "").trim();
    let clean = key;
    if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) clean = clean.slice(1, -1);
    const sa = JSON.parse(clean);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    const db = getFirestore(getApps().length ? getApps()[0] : initializeApp({ credential: cert(sa) }));

    const foldersSnap = await db.collection("contactFolders").get();
    const workerFoldersByOrg = new Map<string, { id: string; name: string }[]>();
    for (const d of foldersSnap.docs) {
        const f = d.data() as any;
        const name = String(f.name || "").toLowerCase();
        if (f.isSystem && WORKER_NAMES.includes(name)) {
            const org = f.orgId || "(none)";
            const list = workerFoldersByOrg.get(org) ?? [];
            list.push({ id: d.id, name });
            workerFoldersByOrg.set(org, list);
        }
    }

    const contactsSnap = await db.collection("contacts").get();
    let repaired = 0;
    let ok = 0;
    const skipped: string[] = [];
    const batch = db.batch();
    let pending = 0;

    for (const d of contactsSnap.docs) {
        const c = d.data() as any;
        if (c.workerType == null) continue;
        const org = c.orgId || "(none)";
        const workerFolders = workerFoldersByOrg.get(org) ?? [];
        if (c.folderId && workerFolders.some((f) => f.id === c.folderId)) {
            ok++;
            continue;
        }
        const wanted = c.workerType === "contractor" ? "contractors" : "employees";
        const target =
            workerFolders.find((f) => f.name === wanted) ||
            workerFolders.find((f) => f.name === "workers");
        if (!target) {
            skipped.push(`${d.id} "${c.name}" (org ${org}: no worker folders)`);
            continue;
        }
        batch.update(d.ref, { folderId: target.id });
        pending++;
        repaired++;
        if (pending >= 400) { await batch.commit(); pending = 0; }
    }
    if (pending > 0) await batch.commit();

    console.log(`Workers already filed correctly: ${ok}`);
    console.log(`Workers re-filed into the taxonomy: ${repaired}`);
    if (skipped.length) {
        console.log("Skipped (org lacks system worker folders - create them first):");
        skipped.forEach((s) => console.log(`  ${s}`));
    }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
