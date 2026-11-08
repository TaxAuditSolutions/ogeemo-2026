export const KNOWLEDGE_AUDIENCES = ['all', 'super_admin', 'org_admin', 'editor', 'viewer'] as const;
export type KnowledgeAudience = (typeof KNOWLEDGE_AUDIENCES)[number];

/** A reviewed, version-controlled instruction unit for the read-only Knowledge Base. */
export interface KnowledgeDocument {
  id: string;
  module: string;
  title: string;
  routes: string[];
  intents: string[];
  keywords: string[];
  audiences: KnowledgeAudience[];
  content: string;
  sourceFiles: string[];
}

export interface KnowledgeChunk extends KnowledgeDocument {
  published: boolean;
  contentHash?: string;
  /**
   * Single-word terms derived from keywords, title and module at publish time.
   * Firestore's array-contains-any matches whole array elements, so phrase
   * keywords ("delete project") need their individual words indexed too.
   */
  searchTerms?: string[];
}

export interface RankedKnowledgeChunk extends KnowledgeChunk {
  score: number;
}

export interface KnowledgeCitation {
  id: string;
  title: string;
  module: string;
  route?: string;
}

export interface KnowledgeRetrievalInput {
  query: string;
  currentPath?: string;
  accessLevel?: KnowledgeAudience;
  limit?: number;
}

export interface KnowledgeRetrievalResult {
  chunks: RankedKnowledgeChunk[];
  store: 'firestore' | 'source-fallback';
  candidateCount: number;
}
