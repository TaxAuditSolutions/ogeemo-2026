import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canSeeWorkspaceTime,
  entryFromTask,
  entryFromTimeLog,
  isMine,
  summarizeTime,
} from '../src/lib/ai-time-summary';

const H = 3600;
const at = (iso: string) => new Date(iso);

const log = (over: Record<string, any> = {}) =>
  entryFromTimeLog({ workerId: 'u1', userId: 'u1', contactId: 'c1', startTime: at('2026-11-10T15:00:00Z'), durationSeconds: 2 * H, isBillable: true, billableRate: 100, ...over });
const task = (over: Record<string, any> = {}) =>
  entryFromTask({ userId: 'u1', contactId: 'c1', start: at('2026-11-10T15:00:00Z'), duration: 1 * H, isBillable: true, billableRate: 100, durationSource: 'sessions', sessions: [{ startTime: at('2026-11-10T15:00:00Z'), durationSeconds: H }], ...over });

test('billable, worked time with a client and no invoice is unbilled, with its value', () => {
  const totals = summarizeTime([log(), task()]);
  assert.equal(totals.workedHours, 3);
  assert.equal(totals.billableHours, 3);
  assert.equal(totals.unbilledHours, 3);
  assert.equal(totals.unbilledAmount, 300);
  assert.equal(totals.invoicedHours, 0);
  assert.equal(totals.entryCount, 2);
});

test('already-invoiced time is counted as invoiced, never as unbilled', () => {
  const totals = summarizeTime([log({ billedInvoiceId: 'inv1' }), log()]);
  assert.equal(totals.invoicedHours, 2);
  assert.equal(totals.unbilledHours, 2);
  assert.equal(totals.billableHours, 4);
});

test('scheduled-but-not-worked time is reported on its own and never counted as worked or billable', () => {
  const planned = task({ durationSource: 'scheduled', isScheduled: true, sessions: [], duration: 1 * H });
  const totals = summarizeTime([planned, log()]);
  assert.equal(totals.scheduledOnlyHours, 1);
  assert.equal(totals.workedHours, 2);
  assert.equal(totals.billableHours, 2);
  assert.equal(totals.unbilledHours, 2);
});

test('a legacy scheduled task with no durationSource and no session is also a placeholder', () => {
  const legacy = entryFromTask({ userId: 'u1', contactId: 'c1', isScheduled: true, start: at('2026-11-10T15:00:00Z'), duration: H, isBillable: true, billableRate: 50 });
  assert.equal(legacy.scheduledOnly, true);
  assert.equal(summarizeTime([legacy]).unbilledHours, 0);
});

test('billable time with no client cannot be invoiced, so it is reported separately', () => {
  const totals = summarizeTime([log({ contactId: null }), log()]);
  assert.equal(totals.billableNoClientHours, 2);
  assert.equal(totals.unbilledHours, 2);
  assert.equal(totals.billableHours, 4);
});

test('non-billable time is worked but not billable', () => {
  const totals = summarizeTime([log({ isBillable: false })]);

test('a date range keeps entries from the start of from up to, not including, to', () => {
  const entries = [
    log({ startTime: at('2026-11-09T23:59:59Z') }),
    log({ startTime: at('2026-11-10T00:00:00Z') }),
    log({ startTime: at('2026-11-10T23:59:59Z') }),
    log({ startTime: at('2026-11-11T00:00:00Z') }),
  ];
  const totals = summarizeTime(entries, { from: at('2026-11-10T00:00:00Z'), to: at('2026-11-11T00:00:00Z') });
  assert.equal(totals.entryCount, 2);
  assert.equal(totals.workedHours, 4);
});

test('an entry with no date is left out of a dated range but counted in all dates', () => {
  const undated = log({ startTime: undefined });
  assert.equal(summarizeTime([undated], { from: at('2026-01-01T00:00:00Z') }).entryCount, 0);
  assert.equal(summarizeTime([undated]).entryCount, 1);
});

test('a task with no scheduled start is dated by its first session, as the Time Log Report does', () => {
  const noStart = entryFromTask({ userId: 'u1', contactId: 'c1', duration: H, isBillable: true, billableRate: 80, durationSource: 'sessions', sessions: [{ startTime: at('2026-11-05T14:00:00Z'), durationSeconds: H }] });
  assert.equal(noStart.start?.toISOString(), '2026-11-05T14:00:00.000Z');
  assert.equal(summarizeTime([noStart], { from: at('2026-11-01T00:00:00Z'), to: at('2026-11-30T00:00:00Z') }).unbilledHours, 1);
});

test('one client can be picked out, and unbilled time is grouped by client, biggest first', () => {
  const entries = [log({ contactId: 'c1' }), log({ contactId: 'c2', durationSeconds: 5 * H, billableRate: 10 }), log({ contactId: 'c1', durationSeconds: H })];
  const all = summarizeTime(entries);
  assert.deepEqual(all.unbilledByClient, [
    { contactId: 'c2', hours: 5, amount: 50 },
    { contactId: 'c1', hours: 3, amount: 300 },
  ]);
  const one = summarizeTime(entries, { contactId: 'c1' });
  assert.equal(one.unbilledHours, 3);
  assert.equal(one.entryCount, 2);
});

test('hours are rounded to two decimals and money to cents', () => {
  const totals = summarizeTime([log({ durationSeconds: 1000, billableRate: 33.33 })]);
  assert.equal(totals.workedHours, 0.28);
  assert.equal(totals.unbilledAmount, 9.26);
});

test('"mine" is the person it is assigned to by sign-in id or contact id, else the person who made it', () => {
  const owner = { userId: 'u1', contactId: 'cMe' };
  assert.equal(isMine(log({ workerId: 'u1' }), owner), true);
  assert.equal(isMine(log({ workerId: 'cMe', userId: 'boss' }), owner), true);
  assert.equal(isMine(log({ workerId: 'u2', userId: 'u1' }), owner), false, 'assigned to someone else');
  assert.equal(isMine(log({ workerId: null, userId: 'u1' }), owner), true);
  assert.equal(isMine(log({ workerId: null, userId: 'u2' }), owner), false);
});

test('only an administrator may see the whole workspace', () => {
  for (const level of ['super_admin', 'org_admin']) assert.equal(canSeeWorkspaceTime(level), true, level);
  for (const level of ['editor', 'viewer', '', undefined, 'root']) assert.equal(canSeeWorkspaceTime(level), false, String(level));
});

test('Firestore Timestamps and date strings are read as dates', () => {
  const stamp = { toDate: () => at('2026-11-10T15:00:00Z') };
  const fromStamp = entryFromTimeLog({ workerId: 'u1', contactId: 'c1', startTime: stamp, durationSeconds: H, isBillable: true, billableRate: 10 });
  assert.equal(fromStamp.start?.toISOString(), '2026-11-10T15:00:00.000Z');
  const fromString = entryFromTimeLog({ workerId: 'u1', contactId: 'c1', startTime: '2026-11-10T15:00:00Z', durationSeconds: H });
  assert.equal(fromString.start?.toISOString(), '2026-11-10T15:00:00.000Z');
});

  assert.equal(totals.workedHours, 2);
  assert.equal(totals.billableHours, 0);
  assert.equal(totals.unbilledAmount, 0);
});

test('zero-length and negative entries are ignored', () => {
  const totals = summarizeTime([log({ durationSeconds: 0 }), log({ durationSeconds: -5 }), log({ durationSeconds: 'x' })]);
  assert.equal(totals.entryCount, 0);
  assert.equal(totals.workedHours, 0);
});
