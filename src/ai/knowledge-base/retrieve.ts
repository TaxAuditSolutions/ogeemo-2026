import type { QuerySnapshot } from 'firebase-admin/firestore';
import { getAdminDb } from '@/core/firebase-admin';
import { asPublishedChunks, loadKnowledgeDocuments } from './source-documents';
import { knowledgeSearchTerms, rankKnowledgeChunks } from './retriever';
import type { KnowledgeChunk, KnowledgeRetrievalInput, KnowledgeRetrievalResult } from './types';

export const KNOWLEDGE_CHUNKS_COLLECTION = 'knowledgeBaseChunks';
export const KNOWLEDGE_METADATA_COLLECTION = 'knowledgeBaseMetadata';
const MAX_CANDIDATES_PER_QUERY = 30;

function sourceFallback(input: KnowledgeRetrievalInput, reason: string): KnowledgeRetrievalResult {
  console.warn(`[Knowledge Base] Using repository source fallback: ${reason}`);
  const chunks = asPublishedChunks(loadKnowledgeDocuments());
  return {
    chunks: rankKnowledgeChunks(chunks, input),
    store: 'source-fallback',
    candidateCount: chunks.length,
  };
}

/**
 * Select a bounded candidate set in Firestore, then rank it locally. Single-field
 * queries avoid requiring a composite index for the beta. No model-generated
 * collection names or arbitrary database queries are accepted.
 */
export async function retrieveKnowledge(input: KnowledgeRetrievalInput): Promise<KnowledgeRetrievalResult> {
  const db = getAdminDb();
  if (!db) return sourceFallback(input, 'Firebase Admin is unavailable');

  try {
    const collection = db.collection(KNOWLEDGE_CHUNKS_COLLECTION);
    const requests: Promise<QuerySnapshot>[] = [];
    const terms = knowledgeSearchTerms(input.query).slice(0, 10);
    if (terms.length > 0) {
      // `searchTerms` holds single words (published by knowledge:sync); the raw
      // `keywords` array contains phrases that a single word can never match.
      requests.push(collection.where('searchTerms', 'array-contains-any', terms).limit(MAX_CANDIDATES_PER_QUERY).get());
    }
    if (input.currentPath && input.currentPath !== '/') {
      requests.push(collection.where('routes', 'array-contains', input.currentPath).limit(MAX_CANDIDATES_PER_QUERY).get());
    }
    if (requests.length === 0) requests.push(collection.limit(MAX_CANDIDATES_PER_QUERY).get());
    if (/^(?:what is|about|tell me about) ogeemo\??$/i.test(input.query.trim())) {
      requests.push(collection.where('module', '==', 'Platform').limit(MAX_CANDIDATES_PER_QUERY).get());
    }

    const snapshots = await Promise.all(requests);
    const byId = new Map<string, KnowledgeChunk>();
    for (const snapshot of snapshots) {
      for (const doc of snapshot.docs) byId.set(doc.id, doc.data() as KnowledgeChunk);
    }

    // A small broad fallback catches synonyms not present in the indexed keywords.
    if (byId.size === 0) {
      const fallback = await collection.limit(100).get();
      for (const doc of fallback.docs) byId.set(doc.id, doc.data() as KnowledgeChunk);
    }
    if (byId.size === 0) return sourceFallback(input, 'Firestore has no published knowledge; run npm run knowledge:sync');

    const candidates = [...byId.values()];
    return {
      chunks: rankKnowledgeChunks(candidates, input),
      store: 'firestore',
      candidateCount: candidates.length,
    };
  } catch (error: any) {
    return sourceFallback(input, error?.message ?? 'Firestore retrieval failed');
  }
}
