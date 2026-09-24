/**
 * Read-only audit of the assistant's help_guides corpus.
 *
 * After a purge + re-ingest, this confirms no document still carries retired
 * wording. It exits non-zero when a match is found, so it can gate future renames.
 *
 * Credentials and the env come from .env.local, resolved exactly like the app
 * (src/core/firebase-admin.ts): an inline FIREBASE_SERVICE_ACCOUNT_KEY first.
 *
 * Usage:
 *   node --import tsx scripts/check-guide-corpus.ts
 *   node --import tsx scripts/check-guide-corpus.ts --pattern "old wording"
 */
import dotenv from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { resolveAdminCredential } from './admin-credentials';

dotenv.config({ path: '.env.local' });

const GUIDES_COLLECTION = 'help_guides';
const DEFAULT_PATTERN = 'master mind|command cent|master-mind';
const PAGE_SIZE = 300;

async function main() {
    const args = process.argv.slice(2);
    const patternIndex = args.indexOf('--pattern');
    const patternSource = patternIndex >= 0 ? args[patternIndex + 1] : DEFAULT_PATTERN;

    if (!patternSource) {
        throw new Error('Missing --pattern value.');
    }

    const pattern = new RegExp(patternSource, 'i');

    if (getApps().length === 0) {
        initializeApp({ credential: resolveAdminCredential() });
    }

    const db = getFirestore();
    const collection = db.collection(GUIDES_COLLECTION);
    const hits = new Map<string, number>();
    let scanned = 0;
    let cursor: FirebaseFirestore.DocumentSnapshot | null = null;

    for (;;) {
        let query = collection.orderBy('__name__').limit(PAGE_SIZE);
        if (cursor) query = query.startAfter(cursor);

        const snapshot = await query.get();
        if (snapshot.empty) break;

        for (const doc of snapshot.docs) {
            scanned += 1;
            const data = doc.data();
            const text = `${data.guideId ?? ''}\n${data.chunkText ?? ''}\n${data.embeddingText ?? ''}`;
            if (pattern.test(text)) {
                const guideId = String(data.guideId ?? '(no guideId)');
                hits.set(guideId, (hits.get(guideId) ?? 0) + 1);
            }
        }

        cursor = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.size < PAGE_SIZE) break;
    }

    console.log(`Scanned ${scanned} ${GUIDES_COLLECTION} document(s) for /${patternSource}/i.`);

    if (hits.size === 0) {
        console.log('Clean: no document matches.');
        return;
    }

    console.log(`${hits.size} guide(s) still match:`);
    for (const [guideId, count] of [...hits.entries()].sort()) {
        console.log(`- ${guideId} (${count} chunk(s))`);
    }

    process.exitCode = 1;
}

main().catch((error) => {
    console.error('Corpus audit failed:', error);
    process.exitCode = 1;
});
