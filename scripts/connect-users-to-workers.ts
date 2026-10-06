import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

dotenv.config({ path: ".env.local" });

/**
 * CONNECT existing login users to Worker records (OG-058: users created
 * before the "Add to Workers" toggle existed are not assignable in the
 * Activity Manager).
 *
 * For each email: creates a Worker contact (employee -> Employees folder,
 * matching getWorkers' contract) in the target org, unless a worker with the
 * same email already exists there. Additive and idempotent.
 *
 * Usage: npx tsx scripts/connect-users-to-workers.ts <orgId> <email> [email...]
 */
const CREATOR_UID = "p7Qt5BayrsbSoQMSsGoZ651nLzp2"; // running admin (matches shipped flows)

async function main() {
    const [orgId, ...emails] = process.argv.slice(2);
    if (!orgId || emails.length === 0) {
        console.error("usage: connect-users-to-workers.ts <orgId> <email> [email...]");
        process.exit(1);
    }
    const key = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "").trim();
    let clean = key;
    if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) clean = clean.slice(1, -1);
    const sa = JSON.parse(clean);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(sa) });
    const db = getFirestore(app);
    const auth = getAuth(app);

    // Taxonomy must already exist (getWorkers' contract); abort rather than guess shapes.
    const foldersSnap = await db.collection("contactFolders").where("orgId", "==", orgId).get();
    const workerFolders = foldersSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((f) => f.isSystem && ["employees", "contractors", "workers"].includes(String(f.name || "").toLowerCase()));
    if (workerFolders.length === 0) {
        console.error(`ABORT: org ${orgId} has no system worker folders.`);
        process.exit(1);
    }
    const pickFolder = () =>
        workerFolders.find((f) => String(f.name).toLowerCase() === "employees")?.id ||
        workerFolders.find((f) => String(f.name).toLowerCase() === "workers")?.id;

    for (const email of emails) {
        const norm = email.trim().toLowerCase();
        const existing = await db.collection("contacts").where("orgId", "==", orgId).get();
        const already = existing.docs.find((d) => {
            const c = d.data() as any;
            return c.workerType != null && String(c.email || "").toLowerCase() === norm;
        });
        if (already) {
            console.log(`SKIP ${norm}: worker already exists (${already.id})`);
            continue;
        }
        let person;
        try {
            person = await auth.getUserByEmail(norm);
        } catch {
            console.log(`SKIP ${norm}: no auth user`);
            continue;
        }
        const name = person.displayName || norm;
        const now = Timestamp.now();
        const ref = await db.collection("contacts").add({
            name,
            email: norm,
            orgId,
            folderId: pickFolder(),
            workerType: "employee",
            payType: "salary",
            payRate: 0,
            employeeNumber: "",
            userId: CREATOR_UID,
            createdBy: CREATOR_UID,
            updatedBy: CREATOR_UID,
            createdAt: now,
            updatedAt: now,
            keywords: [...name.toLowerCase().split(/\s+/), ...norm.split(/[@._-]+/)].filter(Boolean),
        });
        console.log(`CONNECTED ${name} <${norm}> -> worker ${ref.id} in ${orgId}`);
    }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
