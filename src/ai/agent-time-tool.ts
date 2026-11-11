/**
 * The getTimeSummary tool of the Co-Pilot agent (see tests/agent-time-tool.test.ts).
 *
 * Read-only: it adds up worked, billable and unbilled hours from the two places time is kept (`timeLogs` and the
 * Activity Manager's `tasks`), using the same billing rules as the Time Log Report. Who is asking, their workspace and
 * their role come from the server session. The figures carry billing rates and money, so a person sees only their OWN
 * time by default; the whole workspace is for an administrator who asks for it.
 */
import { oneLine } from '@/lib/ai-input';
import type { ToolContext } from '@/lib/ai-runtime';
import { localDateOf } from '@/lib/ai-calendar';
import { readDayRange } from '@/lib/ai-range';
import {
  canSeeWorkspaceTime,
  entryFromTask,
  entryFromTimeLog,
  isMine,
  summarizeTime,
  type TimeEntry,
  type TimeTotals,
} from '@/lib/ai-time-summary';
import type { DbLike } from '@/ai/agent-tools';

const MAX_CLIENTS = 10;
const FIRESTORE_ID = /^[A-Za-z0-9_-]{1,128}$/;


export interface TimeSummaryInput {
  /** First day, YYYY-MM-DD in the user's time zone. All dates when omitted. */
  from?: string;
  /** Last day, inclusive. Today when only `from` is given. */
  to?: string;
  /** Only this client's time, from searchContacts. */
  contactId?: string;
  /** 'workspace' is honoured for administrators only; everyone else always gets their own time. */
  scope?: 'mine' | 'workspace';
}

export interface TimeSummaryClient {
  client: string;
  hours: number;
  amount: number;
}

const fail = (message: string) => ({
  success: false as const,
  scope: 'mine' as 'mine' | 'workspace',
  totals: null as TimeTotals | null,
  clients: [] as TimeSummaryClient[],
  message,
});

const hoursText = (value: number) => `${value.toFixed(2)} h`;
const dollars = (value: number) => `$${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function describeTotals(totals: TimeTotals, whose: string, span: string): string {
  if (totals.entryCount === 0) return `There is no recorded or scheduled time for ${whose} ${span}.`;
  const parts = [
    `${whose} ${span}: worked ${hoursText(totals.workedHours)}, of which billable ${hoursText(totals.billableHours)}.`,
    `Unbilled (ready to invoice): ${hoursText(totals.unbilledHours)}, ${dollars(totals.unbilledAmount)}.`,
    `Already invoiced: ${hoursText(totals.invoicedHours)}.`,
  ];
  if (totals.billableNoClientHours > 0) {
    parts.push(`Billable but with no client, so it cannot be invoiced yet: ${hoursText(totals.billableNoClientHours)}.`);
  }
  if (totals.scheduledOnlyHours > 0) {
    parts.push(`Scheduled but not yet worked (not counted): ${hoursText(totals.scheduledOnlyHours)}.`);
  }
  return parts.join(' ');
}

export async function getTimeSummaryHandler(db: DbLike | null, ctx: ToolContext, input: TimeSummaryInput, now: Date = new Date()) {
  if (!ctx.userId || !ctx.orgId) return fail('User or workspace not authenticated.');
  if (!db) return fail('The database is not available, so time could not be read.');

  const admin = canSeeWorkspaceTime(ctx.accessLevel);
  const wholeWorkspace = admin && input.scope === 'workspace';

  const fromText = oneLine(input.from, 20);
  const toText = oneLine(input.to, 20);
  const range = readDayRange(fromText, toText, ctx.timeZone, now);
  if (typeof range === 'string') return fail(range);

  const contactId = oneLine(input.contactId, 128);
  if (contactId && !FIRESTORE_ID.test(contactId)) return fail('That contact id is not valid. Search for the contact first and use its id.');

  try {
    let clientName = '';
    if (contactId) {
      const contact = await db.collection('contacts').doc(contactId).get();
      if (!(contact.exists && contact.data()?.orgId === ctx.orgId)) {
        return fail('That contact was not found in this workspace. Search for the contact first and use the id it returns.');
      }
      clientName = oneLine(contact.data()?.name, 80);
    }

    const [logs, tasks] = await Promise.all([
      db.collection('timeLogs').where('orgId', '==', ctx.orgId).get(),
      db.collection('tasks').where('orgId', '==', ctx.orgId).get(),
    ]);
    let entries: TimeEntry[] = [
      ...logs.docs.map((doc: any) => entryFromTimeLog(doc.data() ?? {})),
      ...tasks.docs.map((doc: any) => entryFromTask(doc.data() ?? {})),
    ];

    if (!wholeWorkspace) {
      let ownContactId: string | null = null;
      try {
        const profile = await db.collection('users').doc(ctx.userId).get();
        const linked = profile.data()?.contactId;
        if (typeof linked === 'string' && linked) ownContactId = linked;
      } catch {
        // Without the profile only entries assigned to the sign-in id are found, which is the common case.
      }
      entries = entries.filter((entry) => isMine(entry, { userId: ctx.userId as string, contactId: ownContactId }));
    }

    const totals = summarizeTime(entries, { from: range.from, to: range.to, contactId: contactId || null });

    const clients: TimeSummaryClient[] = [];
    if (!contactId) {
      for (const row of totals.unbilledByClient.slice(0, MAX_CLIENTS)) {
        let name = '';
        try {
          const contact = await db.collection('contacts').doc(row.contactId).get();
          if (contact.exists && contact.data()?.orgId === ctx.orgId) name = oneLine(contact.data()?.name, 80);
        } catch {
          // A client we cannot read is listed as unknown rather than dropped, so the totals still add up.
        }
        clients.push({ client: name || 'Unknown client', hours: row.hours, amount: row.amount });
      }
    }

    const who = wholeWorkspace ? 'the whole workspace' : 'you';
    const whose = clientName ? `${who} for ${clientName}` : who;
    const span = fromText ? `from ${fromText} to ${toText || localDateOf(now, ctx.timeZone)}` : toText ? `up to ${toText}` : 'across all dates';
    const note = input.scope === 'workspace' && !admin ? ' Only an administrator can see the whole workspace, so this is your own time.' : '';
    return {
      success: true as const,
      scope: (wholeWorkspace ? 'workspace' : 'mine') as 'mine' | 'workspace',
      totals: totals as TimeTotals | null,
      clients,
      message: `${describeTotals(totals, whose, span)}${note}`,
    };
  } catch (error: any) {
    return fail(`Time could not be read: ${oneLine(error?.message, 160)}`);
  }
}
