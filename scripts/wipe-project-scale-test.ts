import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

/**
 * Removes everything seed-project-scale-test.ts created:
 *  - projects with description === "[scale-test]"
 *  - contacts named "Scale Test - ..."
 * Real data is never touched (marker/prefix match only).
 */
const ORG = "ogeemo-master";
const MARKER = "[scale-test]";
const CONTACT_PREFIX = "Scale Test - ";

async function main() {
    const key = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "").trim();
    let clean = key;
    if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) clean = clean.slice(1, -1);
    const sa = JSON.parse(clean);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    const db = getFirestore(getApps().length ? getApps()[0] : initializeApp({ credential: cert(sa) }));

    const projects = await db.collection("projects").where("orgId", "==", ORG).where("description", "==", MARKER).get();
    const batch = db.batch();
    projects.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    console.log(`Deleted ${projects.size} scale-test projects.`);

    const contacts = await db.collection("contacts").where("orgId", "==", ORG).get();
    const testContacts = contacts.docs.filter((d) => String(d.data().name || "").startsWith(CONTACT_PREFIX));
    const batch2 = db.batch();
    testContacts.forEach((d) => batch2.delete(d.ref));
    await batch2.commit();
    console.log(`Deleted ${testContacts.length} scale-test contacts.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
