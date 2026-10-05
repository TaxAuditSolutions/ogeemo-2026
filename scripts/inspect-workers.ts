import dotenv from "dotenv";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

dotenv.config({ path: ".env.local" });

/**
 * READ-ONLY diagnostic: why is the worker list empty?
 *
 * getWorkers() (src/services/payroll-service.ts) shows a contact only when ALL
 * hold: (1) a system contactFolder named employees/contractors/workers exists
 * for the contact's orgId, (2) contact.folderId is in that set, (3) contact
 * orgId matches the caller's claim, (4) contact.workerType is set.
 * This script evaluates every gate across the database and reports which one
 * filters the existing workers out. No writes are performed.
 */

const WORKER_FOLDER_NAMES = ["employees", "contractors", "workers"];

async function main() {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local");
        process.exit(1);
    }
    let cleanKey = serviceAccountKey.trim();
    if ((cleanKey.startsWith("'") && cleanKey.endsWith("'")) || (cleanKey.startsWith('"') && cleanKey.endsWith('"'))) {
        cleanKey = cleanKey.slice(1, -1);
    }
    const serviceAccount = JSON.parse(cleanKey);
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }

    let app: App;
    if (getApps().length === 0) {
        app = initializeApp({ credential: cert(serviceAccount) });
    } else {
        app = getApps()[0];
    }
    const db = getFirestore(app);
    const auth = getAuth(app);

    // 1. The caller's org claim (defaults to the git identity)
    const email = process.argv[2] || "dan.white@taxauditsolutions.com";
    let userOrg: string | undefined;
    try {
        const user = await auth.getUserByEmail(email);
        userOrg = (user.customClaims as any)?.orgId;
    } catch {
        console.warn(`No auth user for ${email}`);
    }
    console.log(`=== Caller: ${email}`);
    console.log(`=== orgId claim: ${userOrg || "(NONE - getWorkers would throw)"}\n`);

    // 2. Folders: the worker system folders getWorkers looks for, PLUS any
    //    folder that merely *looks* like a worker folder (renamed / not isSystem)
    const foldersSnap = await db.collection("contactFolders").get();
    const allFolders = foldersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const workerFoldersByOrg: Record<string, { id: string; name: string; isSystem: boolean }[]> = {};
    for (const f of allFolders) {
        const name = String(f.name || "").toLowerCase();
        if (WORKER_FOLDER_NAMES.includes(name)) {
            const key = f.orgId || "(no orgId)";
            (workerFoldersByOrg[key] ||= []).push({ id: f.id, name: f.name, isSystem: !!f.isSystem });
        }
    }
    console.log(`=== contactFolders: ${allFolders.length} total`);
    console.log("=== Folders named employees/contractors/workers (per org):");
    console.log(JSON.stringify(workerFoldersByOrg, null, 2));

    const nearMisses = allFolders.filter((f) => /work|employ|contract|staff|team|crew/i.test(String(f.name || "")) && !WORKER_FOLDER_NAMES.includes(String(f.name || "").toLowerCase()));
    if (nearMisses.length) {
        console.log("=== NEAR-MISS folders (name suggests workers but getWorkers ignores them):");
        nearMisses.forEach((f) => console.log(`   org=${f.orgId || "(none)"} isSystem=${!!f.isSystem} name="${f.name}" id=${f.id}`));
    }

    // 3. Contacts: evaluate each gate
    const contactsSnap = await db.collection("contacts").get();
    const stats: Record<string, { total: number; missingOrgId: number; withFolderId: number; folderIdOrphaned: number; inWorkerFolder: number; withWorkerType: number; passesGetWorkers: number }> = {};
    const orphanFolderIds: Record<string, number> = {};
    const folderIdIndex = new Set(allFolders.map((f) => f.id));
    const workerIdsByOrg: Record<string, Set<string>> = {};
    for (const [org, list] of Object.entries(workerFoldersByOrg)) {
        workerIdsByOrg[org] = new Set(list.filter((f) => f.isSystem).map((f) => f.id));
    }

    const almostWorkers: any[] = [];
    for (const doc of contactsSnap.docs) {
        const c = doc.data() as any;
        const org = c.orgId || "(no orgId)";
        const s = (stats[org] ||= { total: 0, missingOrgId: 0, withFolderId: 0, folderIdOrphaned: 0, inWorkerFolder: 0, withWorkerType: 0, passesGetWorkers: 0 });
        s.total++;
        if (!c.orgId) s.missingOrgId++;
        if (c.folderId) {
            s.withFolderId++;
            if (!folderIdIndex.has(c.folderId)) {
                s.folderIdOrphaned++;
                orphanFolderIds[c.folderId] = (orphanFolderIds[c.folderId] || 0) + 1;
            }
        }
        const workerIds = workerIdsByOrg[org] || new Set<string>();
        const inWorkerFolder = c.folderId ? workerIds.has(c.folderId) : false;
        if (inWorkerFolder) s.inWorkerFolder++;
        if (c.workerType != null) s.withWorkerType++;
        const passes = inWorkerFolder && c.workerType != null;
        if (passes) s.passesGetWorkers++;

        const looksLikeWorker = c.workerType != null || inWorkerFolder || /worker|employee|contractor/i.test(String(c.occupation || c.category || c.role || ""));
        if (looksLikeWorker && !passes && almostWorkers.length < 40) {
            almostWorkers.push({ id: doc.id, name: c.name, orgId: c.orgId || null, folderId: c.folderId || null, workerType: c.workerType ?? null, payType: c.payType ?? null });
        }
    }

    console.log(`\n=== contacts: ${contactsSnap.docs.length} total`);
    console.log("=== Per-org gate results:");
    console.log(JSON.stringify(stats, null, 2));
    if (Object.keys(orphanFolderIds).length) {
        console.log("\n=== ORPHANED folderIds on contacts (point at deleted/renamed folders):");
        console.log(JSON.stringify(orphanFolderIds, null, 2));
    }
    console.log(`\n=== Lost-worker candidates (fail getWorkers but show worker signals): ${almostWorkers.length}`);
    almostWorkers.forEach((w) => console.log(`   ${JSON.stringify(w)}`));

    console.log("\n=== VERDICT HINTS ===");
    if (!userOrg) console.log("- Caller has NO orgId claim: getWorkers throws; the app would show an error, not an empty list.");
    const orgFolders = userOrg ? workerFoldersByOrg[userOrg] : undefined;
    if (!orgFolders || orgFolders.length === 0) console.log("- No system worker folders for the caller's org => getWorkers returns [] (silent empty list).");
    const orgStats = userOrg ? stats[userOrg] : undefined;
    if (orgStats && orgStats.withWorkerType > 0 && orgStats.inWorkerFolder === 0) console.log("- Contacts HAVE workerType but NONE sit in a worker folder => folder assignment is the missing link.");
    if (orgStats && orgStats.inWorkerFolder > 0 && orgStats.passesGetWorkers < orgStats.inWorkerFolder) console.log("- Foldered contacts lack workerType => the defensive filter hides them.");
    if (orgStats && orgStats.folderIdOrphaned > 0) console.log("- Contacts reference folder IDs that no longer exist => folders were rebuilt; re-point folderId.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
