/**
 * The read tools of the Co-Pilot agent (see tests/agent-tools.test.ts). They live here, not inside the Genkit
 * flow, so they can be tested without a model: each takes the database and the SERVER-supplied context.
 *
 * Every tool acts only on the workspace (orgId) the session belongs to. The tools used to get no context at all
 * (the flow never passed one), so they all answered "not authenticated", and searchGlobal searched by user id and
 * invented "Dan" and "Julie" contacts for any search containing those letters.
 */
import { contactMatchesQuery } from '@/lib/contact-search';
import { oneLine } from '@/lib/ai-input';
import type { ToolContext } from '@/lib/ai-runtime';

/** The little of Firestore the tools use, so a test can supply a fake. */
export interface DbLike {
  collection(name: string): any;
}

const MAX_RESULTS = 20;

export interface ContactHit {
  id: string;
  name: string;
  businessName?: string;
  email?: string;
  folderId?: string;
}

const toHit = (id: string, data: Record<string, any>): ContactHit => ({
  id,
  name: String(data.name ?? ''),
  ...(data.businessName ? { businessName: String(data.businessName) } : {}),
  ...(data.email ? { email: String(data.email) } : {}),
  ...(data.folderId ? { folderId: String(data.folderId) } : {}),
});

async function findContacts(db: DbLike, orgId: string, term: string): Promise<{ hits: ContactHit[]; total: number }> {
  const snapshot = await db.collection('contacts').where('orgId', '==', orgId).get();
  const matches: ContactHit[] = [];
  snapshot.docs.forEach((doc: any) => {
    const data = doc.data();
    if (data?.name && contactMatchesQuery(data, term)) matches.push(toHit(doc.id, data));
  });
  return { hits: matches.slice(0, MAX_RESULTS), total: matches.length };
}

export async function searchContactsHandler(db: DbLike | null, ctx: ToolContext, input: { searchTerm?: string }) {
  if (!ctx.userId || !ctx.orgId) return { success: false, contacts: [] as ContactHit[], message: 'User or workspace not authenticated.' };
  const term = oneLine(input.searchTerm, 100);
  if (!term) return { success: false, contacts: [] as ContactHit[], message: 'Give a name, company, email or phone number to search for.' };
  if (!db) return { success: false, contacts: [] as ContactHit[], message: 'Database not available.' };
  try {
    const { hits, total } = await findContacts(db, ctx.orgId, term);
    return {
      success: true,
      contacts: hits,
      message: total > hits.length ? `Found ${total} matching contacts; showing the first ${hits.length}. Ask for a more specific name.` : `Found ${total} matching contact${total === 1 ? '' : 's'}.`,
    };
  } catch (error: any) {
    return { success: false, contacts: [] as ContactHit[], message: `Search failed: ${oneLine(error?.message, 200)}` };
  }
}

export interface SearchResult {
  type: 'Page' | 'Contact' | 'Project';
  label: string;
  href: string;
  id?: string;
  details?: string;
}

export async function searchGlobalHandler(
  db: DbLike | null,
  ctx: ToolContext,
  pages: ReadonlyArray<{ label: string; href: string }>,
  input: { query?: string }
) {
  const term = oneLine(input.query, 100);
  if (!term) return { success: false, results: [] as SearchResult[], message: 'Give a name or keyword to search for.' };
  const lower = term.toLowerCase();
  const results: SearchResult[] = pages
    .filter((page) => page.label.toLowerCase().includes(lower))
    .slice(0, 8)
    .map((page) => ({ type: 'Page' as const, label: page.label, href: page.href }));

  // Records are only searched for a signed-in user inside a workspace; otherwise just the pages are returned.
  if (db && ctx.userId && ctx.orgId) {
    try {
      const [{ hits }, projects] = await Promise.all([
        findContacts(db, ctx.orgId, term),
        db.collection('projects').where('orgId', '==', ctx.orgId).get(),
      ]);
      hits.slice(0, 10).forEach((hit) =>
        results.push({ type: 'Contact', id: hit.id, label: hit.name, href: '/contacts', ...(hit.email ? { details: hit.email } : {}) })
      );
      let added = 0;
      projects.docs.forEach((doc: any) => {
        const name = doc.data()?.name;
        if (added < 10 && typeof name === 'string' && name.toLowerCase().includes(lower)) {
          results.push({ type: 'Project', id: doc.id, label: name, href: `/projects/${doc.id}/tasks` });
          added += 1;
        }
      });
    } catch (error: any) {
      return { success: true, results, message: `Found ${results.length} pages; the record search failed (${oneLine(error?.message, 120)}).` };
    }
  }
  return { success: true, results, message: `Search for "${term}" returned ${results.length} result${results.length === 1 ? '' : 's'}.` };
}

export async function syncReceiptsHandler(
  ctx: ToolContext,
  list: () => Promise<{ files: Array<{ id: string; name: string }>; error?: string }>
) {
  if (!ctx.userId) return { success: false, files: [] as any[], message: 'User not authenticated.' };
  try {
    const result = await list();
    if (result.error) return { success: false, files: [] as any[], message: result.error };
    if (result.files.length === 0) {
      return {
        success: true,
        files: [] as any[],
        message: 'Google Drive receipt sync is not connected yet, so there are no Drive files to list. Add receipts in Receipt Intake at /accounting/receipt-processor.',
      };
    }
    return { success: true, files: result.files, message: `Found ${result.files.length} PDF(s) in the Receipts folder. Receipt Intake at /accounting/receipt-processor is the place to review them.` };
  } catch (error: any) {
    return { success: false, files: [] as any[], message: oneLine(error?.message, 200) };
  }
}
