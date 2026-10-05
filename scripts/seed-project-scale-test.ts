import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

/**
 * SCALE-TEST SEED (read-mostly; additive): gives the beta assessment the data
 * it asked for — "multiple Projects across multiple Contacts and statuses".
 *
 * Creates 6 marked test contacts plus ~80 marked projects in ogeemo-master:
 * all four statuses, duplicate project names ACROSS clients, multiple projects
 * per client, staggered dates. Everything is removable via
 * wipe-project-scale-test.ts (marker: description === "[scale-test]",
 * contacts: name prefix "Scale Test - ").
 */
const ORG = "ogeemo-master";
const OWNER = "p7Qt5BayrsbSoQMSsGoZ651nLzp2";
const CLIENTS_FOLDER = "AmtuXpihnfoNWsCTHYaR"; // Clients (system) in ogeemo-master
const MARKER = "[scale-test]";
const CONTACT_PREFIX = "Scale Test - ";
const EXISTING_CONTACTS = ["tC5wuRxinKqB7uRMyG2P", "KzyaMKIUea5WNNt5iQI6", "tTf5EwGdvdD2UbatthTY"]; // Rodney, Julie( worker), Bugs

const BASE_NAMES = [
    "Website Refresh", "Quarterly Bookkeeping", "Tax Filing", "Brand Redesign",
    "Office Renovation", "Payroll Setup", "CRM Migration", "Audit Prep",
    "Newsletter Campaign", "Inventory Audit", "Software Upgrade", "Client Onboarding",
];
// Roughly: 40% active, 25% planning, 25% completed, 10% on-hold
const STATUS_CYCLE: Array<"active" | "planning" | "completed" | "on-hold"> = [
    "active", "active", "planning", "completed", "active", "planning",
    "completed", "active", "on-hold", "completed", "planning", "active",
];

async function main() {
    const key = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "").trim();
    let clean = key;
    if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) clean = clean.slice(1, -1);
    const sa = JSON.parse(clean);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    const db = getFirestore(getApps().length ? getApps()[0] : initializeApp({ credential: cert(sa) }));

    // Idempotence
    const existing = await db.collection("projects").where("orgId", "==", ORG).where("description", "==", MARKER).get();
    if (!existing.empty) {
        console.log(`ABORT: ${existing.size} scale-test projects already exist. Run wipe-project-scale-test.ts first.`);
        process.exit(0);
    }

    // 1. Test contacts
    const now = Timestamp.now();
    const contactIds: string[] = [];
    for (let i = 1; i <= 6; i++) {
        const name = `${CONTACT_PREFIX}Client ${String(i).padStart(2, "0")}`;
        const ref = await db.collection("contacts").add({
            name,
            orgId: ORG,
            folderId: CLIENTS_FOLDER,
            userId: OWNER,
            createdBy: OWNER,
            updatedBy: OWNER,
            createdAt: now,
            updatedAt: now,
            keywords: name.toLowerCase().split(/\s+/),
        });
        contactIds.push(ref.id);
        console.log(`contact ${name} -> ${ref.id}`);
    }
    const allClientIds = [...contactIds, ...EXISTING_CONTACTS]; // 9 clients

    // 2. ~80 projects with duplicate names across clients
    const batch = db.batch();
    const usedNamePerClient = new Map<string, Set<string>>();
    const baseNow = Date.now();
    for (let i = 0; i < 80; i++) {
        const clientId = allClientIds[i % allClientIds.length];
        const base = BASE_NAMES[(i * 5) % BASE_NAMES.length];
        const used = usedNamePerClient.get(clientId) ?? new Set<string>();
        let name = base;
        if (used.has(name)) {
            let phase = 2;
            while (used.has(`${base} - Phase ${phase}`)) phase++;
            name = `${base} - Phase ${phase}`;
        }
        used.add(name);
        usedNamePerClient.set(clientId, used);

        const ref = db.collection("projects").doc();
        batch.set(ref, {
            name,
            description: MARKER,
            orgId: ORG,
            userId: OWNER,
            contactId: clientId,
            status: STATUS_CYCLE[i % STATUS_CYCLE.length],
            importance: (["A", "B", "C"] as const)[i % 3],
            urgency: (["urgent", "important", "optional"] as const)[i % 3],
            createdBy: OWNER,
            updatedBy: OWNER,
            createdAt: Timestamp.fromMillis(baseNow - i * 86_400_000),
            updatedAt: now,
        });
    }
    await batch.commit();
    console.log(`Seeded 80 scale-test projects across ${allClientIds.length} clients in ${ORG}.`);
    console.log("Remove with: npx tsx scripts/wipe-project-scale-test.ts");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
