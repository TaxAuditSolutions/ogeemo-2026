/**
 * Deletes help_guides documents for guides that no longer exist in dev/guides.
 *
 * The remote assistant (src/app/api/ogeemo-assistant/route.ts) answers from the
 * `help_guides` collection, which scripts/ingest-guides.ts seeds from dev/guides.
 * Renaming or retiring a guide leaves its chunks behind, and the assistant keeps
 * quoting the old wording, so this script removes them by guideId.
 *
 * Credentials come from .env.local, resolved exactly like the app does
 * (FIREBASE_SERVICE_ACCOUNT_KEY inline JSON, otherwise application default).
 *
 * Usage - always dry run first, it only reports:
 *   node --import tsx scripts/purge-retired-guides.ts
 *   node --import tsx scripts/purge-retired-guides.ts --apply
 *   node --import tsx scripts/purge-retired-guides.ts --list --prefix calendar--
 *   node --import tsx scripts/purge-retired-guides.ts --apply --id some--guide-id
 *
 * After purging a renamed guide, re-ingest it so the assistant picks up the new
 * name: move the JSON from dev/guides/archive back into dev/guides and run
 *   node --import tsx scripts/ingest-guides.ts
 */
import dotenv from 'dotenv';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { resolveAdminCredential } from './admin-credentials';

dotenv.config({ path: '.env.local' });

const GUIDES_COLLECTION = 'help_guides';

/** Guide ids retired by the Events Manager rename. */
const RETIRED_GUIDE_IDS = [
    // renamed to calendar--open-calendar (see the Events Manager naming cleanup)
    'calendar--open-command-centre-calendar',
];

/** Modules removed entirely, so every guide under them is stale. */
const RETIRED_GUIDE_PREFIXES = [
    'email-hub--', // the Email Hub module was retired
];

async function main() {
    const args = process.argv.slice(2);
    const apply = args.includes('--apply');
    const listOnly = args.includes('--list');
    const ids = new Set(RETIRED_GUIDE_IDS);
    const prefixes = new Set(RETIRED_GUIDE_PREFIXES);

    for (let index = 0; index < args.length; index += 1) {
        if (args[index] === '--id' && args[index + 1]) ids.add(args[index + 1]);
        if (args[index] === '--prefix' && args[index + 1]) prefixes.add(args[index + 1]);
    }

    if (getApps().length === 0) {
        initializeApp({ credential: resolveAdminCredential() });
    }

    const db = getFirestore();
    const collection = db.collection(GUIDES_COLLECTION);
    const targets = new Map<string, number>();

    for (const guideId of ids) {
        const snapshot = await collection.where('guideId', '==', guideId).get();
        if (!snapshot.empty) targets.set(guideId, snapshot.size);
    }

    for (const prefix of prefixes) {
        const snapshot = await collection
            .where('guideId', '>=', prefix)
            .where('guideId', '<', `${prefix}\uf8ff`)
            .get();

        for (const doc of snapshot.docs) {
            const guideId = String(doc.data().guideId ?? '');
            if (!guideId) continue;
            targets.set(guideId, (targets.get(guideId) ?? 0) + 1);
        }
    }

    const rows = [...targets.entries()]
        .map(([guideId, docs]) => ({ guideId, docs }))
        .sort((a, b) => a.guideId.localeCompare(b.guideId));

    if (rows.length === 0) {
        console.log('No help_guides documents match the requested ids/prefixes.');
        return;
    }

    if (listOnly) {
        console.log(`${rows.length} guide(s) in ${GUIDES_COLLECTION}:`);
    } else if (!apply) {
        console.log(`Found ${rows.length} retired guide(s) in ${GUIDES_COLLECTION}:`);
    } else {
        console.log(`Purging ${rows.length} retired guide(s) from ${GUIDES_COLLECTION}:`);
    }
    for (const row of rows) {
        console.log(`- ${row.guideId} (${row.docs} chunk(s))`);
    }

    if (listOnly) {
        console.log('\n--list: nothing deleted.');
        return;
    }

    if (!apply) {
        console.log('\nDry run: nothing deleted. Re-run with --apply to delete these documents.');
        return;
    }

    let deleted = 0;
    let batch = db.batch();
    let operations = 0;

    for (const row of rows) {
        const snapshot = await collection.where('guideId', '==', row.guideId).get();
        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
            operations += 1;
            deleted += 1;
            if (operations === 450) {
                await batch.commit();
                batch = db.batch();
                operations = 0;
            }
        }
    }

    if (operations > 0) await batch.commit();
    console.log(`\nDeleted ${deleted} document(s) across ${rows.length} retired guide(s).`);
    console.log('Next: re-ingest so renamed guides return - node --import tsx scripts/ingest-guides.ts');
}

main().catch((error) => {
    console.error('Purge failed:', error);
    process.exitCode = 1;
});
