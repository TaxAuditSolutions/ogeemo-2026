import type {
  KnowledgeChunk,
  KnowledgeCitation,
  KnowledgeDocument,
  KnowledgeRetrievalInput,
  RankedKnowledgeChunk,
} from './types';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'could', 'do', 'does', 'for', 'how', 'i', 'in', 'is', 'it',
  'me', 'my', 'of', 'on', 'or', 'please', 'the', 'to', 'use', 'what', 'when', 'where', 'why', 'you',
  'ogeemo', 'change', 'changing',
]);

const TOKEN_ALIASES: Record<string, string[]> = {
  appointment: ['action', 'calendar'],
  appointments: ['action', 'calendar'],
  // 'available' / 'availability' are ambiguous ("templates available" vs "my
  // availability"); they expand to scheduling terms only in a scheduling
  // context (see SCHEDULING_CONTEXT below).
  complete: ['done', 'completed'],
  favourites: ['favorites'],
  reschedule: ['move', 'schedule'],
  schedule: ['time', 'slot'],
  scheduled: ['time', 'slot'],
  scheduling: ['time', 'slot'],
  task: ['action'],
  tasks: ['action'],
  timer: ['session'],
  unscheduled: ['no', 'set', 'time'],
};

const AVAILABILITY_WORDS = new Set(['available', 'availability']);
const SCHEDULING_CONTEXT = new Set([
  'appointment', 'appointments', 'calendar', 'schedule', 'scheduled', 'scheduling', 'time', 'slot',
  'meeting', 'event', 'events', 'assignee', 'busy', 'booked', 'free',
]);

const MIN_SCORE = 5;
/** A chunk must score at least this fraction of the best chunk to be returned. */
const RELATIVE_CUTOFF = 0.4;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function knowledgeSearchTerms(query: string): string[] {
  const raw = normalize(query).split(' ').filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  const isScheduling = raw.some((token) => SCHEDULING_CONTEXT.has(token));
  const expanded = raw.flatMap((token) => [
    token,
    ...(TOKEN_ALIASES[token] ?? []),
    ...(AVAILABILITY_WORDS.has(token) && isScheduling ? ['free', 'slot'] : []),
  ]);
  return [...new Set(expanded)].slice(0, 12);
}

/**
 * Word-level index terms for a document (keywords, title, module). Published to
 * Firestore as `searchTerms` so the candidate query can match single words.
 * Plural/singular and alias forms are included so they line up with the query terms.
 */
export function buildSearchTerms(document: Pick<KnowledgeDocument, 'keywords' | 'title' | 'module'>): string[] {
  const words = [...document.keywords, document.title, document.module]
    .flatMap((value) => normalize(value).split(' '))
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  const withAliases = words.flatMap((word) => [word, ...(TOKEN_ALIASES[word] ?? [])]);
  return [...new Set(withAliases)].sort();
}

/** True when Firestore's `array-contains-any(searchTerms, queryTerms)` would select this document. */
export function matchesCandidateQuery(searchTerms: readonly string[], queryTerms: readonly string[]): boolean {
  return queryTerms.some((term) => searchTerms.includes(term));
}

function canRead(chunk: KnowledgeChunk, accessLevel: KnowledgeRetrievalInput['accessLevel']): boolean {
  return chunk.audiences.includes('all') || Boolean(accessLevel && chunk.audiences.includes(accessLevel));
}

function scoreChunk(chunk: KnowledgeChunk, input: KnowledgeRetrievalInput, terms: string[]): number {
  const query = normalize(input.query);
  const title = normalize(chunk.title);
  const module = normalize(chunk.module);
  const content = normalize(chunk.content);
  const keywords = chunk.keywords.map(normalize);
  let score = 0;

  if (query && title.includes(query)) score += 20;
  if (/^(?:what is|about|tell me about) ogeemo$/.test(query) && chunk.id === 'platform.identity.overview') score += 30;
  for (const keyword of chunk.keywords) {
    const normalizedKeyword = normalize(keyword);
    if (normalizedKeyword.includes(' ') && query.includes(normalizedKeyword)) score += 12;
  }
  for (const term of terms) {
    if (keywords.some((keyword) => keyword.split(' ').includes(term))) score += 7;
    if (title.split(' ').includes(term)) score += 5;
    if (module.split(' ').includes(term)) score += 3;
    if (content.includes(term)) score += 1;
  }
  if (input.currentPath && chunk.routes.includes(input.currentPath)) score += 8;
  return score;
}

/** Pure lexical ranking, deliberately bounded before anything reaches the model. */
export function rankKnowledgeChunks(
  chunks: KnowledgeChunk[],
  input: KnowledgeRetrievalInput,
): RankedKnowledgeChunk[] {
  const terms = knowledgeSearchTerms(input.query);
  const scored = chunks
    .filter((chunk) => chunk.published && canRead(chunk, input.accessLevel))
    .map((chunk) => ({ ...chunk, score: scoreChunk(chunk, input, terms) }))
    .filter((chunk) => chunk.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  // Relative cutoff: a weak incidental match must not ride along (and be cited)
  // beside a strong one.
  const cutoff = scored.length > 0 ? Math.max(MIN_SCORE, scored[0].score * RELATIVE_CUTOFF) : MIN_SCORE;
  return scored.filter((chunk) => chunk.score >= cutoff).slice(0, input.limit ?? 4);
}

export function knowledgeCitations(chunks: RankedKnowledgeChunk[]): KnowledgeCitation[] {
  return chunks.map((chunk) => ({
    id: chunk.id,
    title: chunk.title,
    module: chunk.module,
    route: chunk.routes[0],
  }));
}
