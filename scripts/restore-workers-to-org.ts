import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

/**
 * RESTORE: copy the intact worker profiles from "Dan White Consulting"
 * (w8ey0uW0cns7VwBd8kr4) into the active "Ogeemo" workspace (ogeemo-master).
 *
 * Additive and idempotent: creates at most two contacts; skips any worker
 * whose employeeNumber already exists in the target org, and verifies the
 * target Workers folder before writing.
 */
const SOURCE_ORG = "w8ey0uW0cns7VwBd8kr4";
const TARGET_ORG = "ogeemo-master";
const TARGET_WORKER_FOLDER = "cbgNiru297tA27Cs9JCl"; // Workers (system) in ogeemo-master
const SOURCE_WORKERS = ["dQvsEZZgaKhgnH7mccKY", "idOlNHNLtY87rxcrKznj"]; // Dan #1000, Julie #1001
const OWNER_UID = "p7Qt5BayrsbSoQMSsGoZ651nLzp2";

async function main() {
    const key = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "").trim();
    let clean = key;
    if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) clean = clean.slice(1, -1);
    const sa = JSON.parse(clean);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    const db = getFirestore(getApps().length ? getApps()[0] : initializeApp({ credential: cert(sa) }));

    // 1. Verify the destination folder really is ogeemo-master's Workers folder
    const folderSnap = await db.collection("contactFolders").doc(TARGET_WORKER_FOLDER).get();
    const folder = folderSnap.exists ? (folderSnap.data() as any) : null;
    if (!folder || folder.orgId !== TARGET_ORG || String(folder.name).toLowerCase() !== "workers" || !folder.isSystem) {
        console.error("ABORT: target folder verification failed."); process.exit(1);
    }
    console.log(`Destination verified: ${TARGET_ORG} / Workers (${TARGET_WORKER_FOLDER})`);

    // 2. Idempotence: employeeNumbers already present in the target org
    const existing = await db.collection("contacts").where("orgId", "==", TARGET_ORG).get();
    const have = new Set(existing.docs.map((d) => String((d.data() as any).employeeNumber ?? "")));
    console.log(`Target org has ${existing.size} contacts`);

    const now = Timestamp.now();
    for (const id of SOURCE_WORKERS) {
        const src = await db.collection("contacts").doc(id).get();
        if (!src.exists) { console.log(`SKIP ${id}: source record missing`); continue; }
        const w = src.data() as any;
        if (have.has(String(w.employeeNumber))) {
            console.log(`SKIP ${w.name} (#${w.employeeNumber}): already present in ${TARGET_ORG}`);
            continue;
        }
        const clone = {
            ...w,
            orgId: TARGET_ORG,
            folderId: TARGET_WORKER_FOLDER,
            userId: OWNER_UID,
            createdBy: OWNER_UID,
            updatedBy: OWNER_UID,
            createdAt: now,
            updatedAt: now,
        };
        const ref = await db.collection("contacts").add(clone);
        console.log(`RESTORED ${w.name} (#${w.employeeNumber}, ${w.workerType}/${w.payType} ${w.payRate}) -> ${ref.id}`);
    }
    console.log("Done.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
