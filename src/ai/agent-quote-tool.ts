/**
 * The getQuotes tool of the Co-Pilot agent (see tests/agent-quote-tool.test.ts).
 *
 * Read-only. It lists and totals what the Quote Manager shows, with the same statuses and "needs attention" rules.
 * Same guards as getInvoices: the workspace comes from the server session, a viewer is refused, and a person whose
 * menu access hides the Quote Manager is refused. Only totals and a short list leave here.
 */
import { oneLine } from '@/lib/ai-input';
import type { ToolContext } from '@/lib/ai-runtime';
import { filterQuotes, rowFromQuote, summarizeQuotes, QUOTE_STATUSES, type QuoteFilterStatus, type QuoteRow, type QuoteTotals } from '@/lib/ai-quotes';
import { screenAccessProblem, workspaceClient } from '@/ai/agent-access';
import { canReadMoneyRecords, dollars, plural } from '@/ai/agent-invoice-tool';
import type { DbLike } from '@/ai/agent-tools';

const MAX_LISTED = 15;

export interface QuotesInput {
  status?: string;
  contactId?: string;
  number?: string;
  needsAttention?: boolean;
}

const fail = (message: string) => ({ success: false as const, totals: null as QuoteTotals | null, quotes: [] as QuoteRow[], message });

export async function getQuotesHandler(db: DbLike | null, ctx: ToolContext, input: QuotesInput, now: Date = new Date()) {
  if (!ctx.userId || !ctx.orgId) return fail('User or workspace not authenticated.');
  if (!canReadMoneyRecords(ctx.accessLevel)) return fail('Your role can view this workspace but not its quotes. Ask an editor or administrator.');
  if (!db) return fail('The database is not available, so quotes could not be read.');

  const status = oneLine(input.status, 20).toLowerCase() || 'open';
  if (status !== 'open' && status !== 'all' && !(QUOTE_STATUSES as readonly string[]).includes(status)) {
    return fail(`The status must be open, all, or one of ${QUOTE_STATUSES.join(', ')}.`);
  }

  try {
    const denied = await screenAccessProblem(db, ctx, '/accounting/quotes', 'the Quote Manager');
    if (denied) return fail(denied);

    const contactId = oneLine(input.contactId, 128);
    let clientName = '';
    if (contactId) {
      const client = await workspaceClient(db, ctx.orgId, contactId);
      if ('error' in client) return fail(client.error);
      clientName = client.name;
    }

    const snap = await db.collection('quotes').where('orgId', '==', ctx.orgId).get();
    const rows = snap.docs.map((doc: any) => rowFromQuote(doc.data() ?? {}, ctx.timeZone, now));
    const matched = filterQuotes(rows, {
      status: status as QuoteFilterStatus,
      contactId: contactId || null,
      number: oneLine(input.number, 40) || null,
      needsAttention: input.needsAttention === true,
    });
    const totals = summarizeQuotes(matched);
    const quotes = matched.slice(0, MAX_LISTED);

    const forWho = clientName ? ` for ${clientName}` : '';
    const label = input.needsAttention === true ? 'quotes needing attention' : status === 'all' ? 'quotes' : `${status.replace('_', ' ')} quotes`;
    if (matched.length === 0) {
      return { success: true as const, totals: totals as QuoteTotals | null, quotes, message: `There are no ${label}${forWho} matching that.` };
    }
    const parts = [`${plural(totals.count, 'quote')}${forWho} (${label}), worth ${dollars(totals.total)} in all.`];
    if (totals.needsAttention > 0 && input.needsAttention !== true) parts.push(`${totals.needsAttention} need attention.`);
    if (matched.length > quotes.length) parts.push(`Showing the first ${quotes.length}.`);
    return { success: true as const, totals: totals as QuoteTotals | null, quotes, message: parts.join(' ') };
  } catch (error: any) {
    return fail(`Quotes could not be read: ${oneLine(error?.message, 160)}`);
  }
}
