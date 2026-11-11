/**
 * The getInvoices tool of the Co-Pilot agent (see tests/agent-invoice-tool.test.ts).
 *
 * Read-only. It lists and totals what Accounts Receivable shows, with the same balance, paid and overdue rules. Who is
 * asking and their workspace come from the server session. Invoices carry money, so an editor or above reads them, a
 * viewer is refused, and a person whose menu access hides Accounts Receivable is refused too (Firestore would allow it;
 * the app does not). Only totals and a short list leave here: no notes, addresses, business numbers or line items.
 */
import { oneLine } from '@/lib/ai-input';
import type { ToolContext } from '@/lib/ai-runtime';
import { readDayStrings } from '@/lib/ai-range';
import { canCreateTasks } from '@/lib/ai-task';
import { filterInvoices, rowFromInvoice, summarizeInvoices, type InvoiceFilterStatus, type InvoiceRow, type InvoiceTotals } from '@/lib/ai-invoices';
import { screenAccessProblem, workspaceClient } from '@/ai/agent-access';
import type { DbLike } from '@/ai/agent-tools';

const MAX_LISTED = 15;
const INVOICE_STATUSES = new Set<string>(['outstanding', 'overdue', 'paid', 'draft', 'all']);

/** Roles that may read invoices and quotes. A viewer can read records in general, but not the money. */
export const canReadMoneyRecords = canCreateTasks;

export const dollars = (value: number) => `$${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export interface InvoicesInput {
  status?: string;
  contactId?: string;
  number?: string;
  from?: string;
  to?: string;
}

const fail = (message: string) => ({ success: false as const, totals: null as InvoiceTotals | null, invoices: [] as InvoiceRow[], message });

export async function getInvoicesHandler(db: DbLike | null, ctx: ToolContext, input: InvoicesInput, now: Date = new Date()) {
  if (!ctx.userId || !ctx.orgId) return fail('User or workspace not authenticated.');
  if (!canReadMoneyRecords(ctx.accessLevel)) return fail('Your role can view this workspace but not its invoices. Ask an editor or administrator.');
  if (!db) return fail('The database is not available, so invoices could not be read.');

  const status = oneLine(input.status, 20).toLowerCase() || 'outstanding';
  if (!INVOICE_STATUSES.has(status)) return fail('The status must be outstanding, overdue, paid, draft or all.');
  const range = readDayStrings(oneLine(input.from, 20), oneLine(input.to, 20), ctx.timeZone, now);
  if (typeof range === 'string') return fail(range);

  try {
    const denied = await screenAccessProblem(db, ctx, '/accounting/accounts-receivable', 'Accounts Receivable');
    if (denied) return fail(denied);

    const contactId = oneLine(input.contactId, 128);
    let clientName = '';
    if (contactId) {
      const client = await workspaceClient(db, ctx.orgId, contactId);
      if ('error' in client) return fail(client.error);
      clientName = client.name;
    }

    const snap = await db.collection('invoices').where('orgId', '==', ctx.orgId).get();
    const rows = snap.docs.map((doc: any) => rowFromInvoice(doc.data() ?? {}, ctx.timeZone, now));
    const matched = filterInvoices(rows, {
      status: status as InvoiceFilterStatus,
      contactId: contactId || null,
      number: oneLine(input.number, 40) || null,
      fromDay: range.from,
      toDay: range.to,
    });
    const totals = summarizeInvoices(matched);
    const invoices = matched.slice(0, MAX_LISTED);

    const label = status === 'all' ? 'invoices' : `${status} invoices`;
    const forWho = clientName ? ` for ${clientName}` : '';
    if (matched.length === 0) {
      return { success: true as const, totals: totals as InvoiceTotals | null, invoices, message: `There are no ${label}${forWho} matching that.` };
    }
    const parts = [`${plural(totals.count, 'invoice')}${forWho} (${label}): balance due ${dollars(totals.balance)} of ${dollars(totals.total)} invoiced.`];
    if (totals.overdueCount > 0 && status !== 'overdue') parts.push(`${totals.overdueCount} overdue, ${dollars(totals.overdueBalance)}.`);
    if (matched.length > invoices.length) parts.push(`Showing the first ${invoices.length}.`);
    return { success: true as const, totals: totals as InvoiceTotals | null, invoices, message: parts.join(' ') };
  } catch (error: any) {
    return fail(`Invoices could not be read: ${oneLine(error?.message, 160)}`);
  }
}
