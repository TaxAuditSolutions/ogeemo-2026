import assert from 'node:assert/strict';
import test from 'node:test';

import { getTimeSummaryHandler } from '../src/ai/agent-time-tool';
import { readToolContext } from '../src/lib/ai-runtime';
import { fakeDb } from './fake-db';

// Wednesday 11 Nov 2026, 10:00 in Toronto (15:00 UTC).
const NOW = new Date('2026-11-11T15:00:00Z');
const H = 3600;

const seed = () => ({
  users: { u1: { contactId: 'cMe' } },
  contacts: {
    cDana: { orgId: 'orgA', name: 'Dana Whitfield' },
    cAcme: { orgId: 'orgA', name: 'Acme Ltd' },
    cOther: { orgId: 'orgB', name: 'Elsewhere' },
  },
  timeLogs: {
    l1: { orgId: 'orgA', workerId: 'u1', userId: 'u1', contactId: 'cDana', startTime: new Date('2026-11-10T15:00:00Z'), durationSeconds: 2 * H, isBillable: true, billableRate: 100 },
    l2: { orgId: 'orgA', workerId: 'u2', userId: 'u2', contactId: 'cAcme', startTime: new Date('2026-11-10T15:00:00Z'), durationSeconds: 4 * H, isBillable: true, billableRate: 50 },
    l3: { orgId: 'orgB', workerId: 'u1', userId: 'u1', contactId: 'cOther', startTime: new Date('2026-11-10T15:00:00Z'), durationSeconds: 9 * H, isBillable: true, billableRate: 500 },
    l4: { orgId: 'orgA', workerId: 'cMe', userId: 'boss', contactId: 'cDana', startTime: new Date('2026-10-01T15:00:00Z'), durationSeconds: 1 * H, isBillable: true, billableRate: 100, billedInvoiceId: 'inv1' },
  },
  tasks: {
    t1: { orgId: 'orgA', userId: 'u1', contactId: 'cDana', start: new Date('2026-11-09T15:00:00Z'), duration: 1 * H, isBillable: true, billableRate: 100, durationSource: 'sessions', sessions: [{ startTime: new Date('2026-11-09T15:00:00Z'), durationSeconds: H }] },
    t2: { orgId: 'orgA', userId: 'u1', contactId: 'cDana', isScheduled: true, start: new Date('2026-11-12T15:00:00Z'), duration: 3 * H, isBillable: true, billableRate: 100, durationSource: 'scheduled', sessions: [] },
  },
});

const editor = readToolContext({ userId: 'u1', orgId: 'orgA', accessLevel: 'editor', timeZone: 'America/Toronto' });
const admin = readToolContext({ userId: 'boss', orgId: 'orgA', accessLevel: 'org_admin', timeZone: 'America/Toronto' });
const viewer = readToolContext({ userId: 'u1', orgId: 'orgA', accessLevel: 'viewer', timeZone: 'America/Toronto' });

test('a person gets their own time by default, from both collections, and the answer says so', async () => {
  const result = await getTimeSummaryHandler(fakeDb(seed()), editor, {}, NOW);
  assert.equal(result.success, true);
  assert.equal(result.scope, 'mine');
  // l1 (2h) + l4 (1h, assigned by contact id, invoiced) + t1 (1h) + the 3h scheduled placeholder, which is not worked.
  assert.equal(result.totals?.workedHours, 4);
  assert.equal(result.totals?.unbilledHours, 3);
  assert.equal(result.totals?.unbilledAmount, 300);
  assert.equal(result.totals?.invoicedHours, 1);
  assert.equal(result.totals?.scheduledOnlyHours, 3);
  assert.match(result.message, /^you across all dates/);
  assert.match(result.message, /Unbilled \(ready to invoice\): 3\.00 h, \$300\.00/);
  assert.match(result.message, /Scheduled but not yet worked \(not counted\): 3\.00 h/);
});

test("another person's time and another workspace's time are never included for a non-administrator", async () => {
  const result = await getTimeSummaryHandler(fakeDb(seed()), editor, {}, NOW);
  assert.equal(result.totals?.workedHours, 4, "u2's 4h and orgB's 9h must not be in it");
  const asked = await getTimeSummaryHandler(fakeDb(seed()), editor, { scope: 'workspace' }, NOW);
  assert.equal(asked.scope, 'mine');
  assert.equal(asked.totals?.workedHours, 4);
  assert.match(asked.message, /Only an administrator can see the whole workspace, so this is your own time/);
  const view = await getTimeSummaryHandler(fakeDb(seed()), viewer, { scope: 'workspace' }, NOW);
  assert.equal(view.scope, 'mine');
});

test('an administrator gets their own time by default and the whole workspace only when asked', async () => {
  const own = await getTimeSummaryHandler(fakeDb(seed()), admin, {}, NOW);
  assert.equal(own.scope, 'mine');
  const all = await getTimeSummaryHandler(fakeDb(seed()), admin, { scope: 'workspace' }, NOW);
  assert.equal(all.scope, 'workspace');

test('a date range is read in the user zone: from the start of the first day to the end of the last', async () => {
  const week = await getTimeSummaryHandler(fakeDb(seed()), editor, { from: '2026-11-09', to: '2026-11-11' }, NOW);
  assert.equal(week.totals?.workedHours, 3, 'l1 and t1 only; l4 is in October');
  assert.match(week.message, /from 2026-11-09 to 2026-11-11/);
  const fromOnly = await getTimeSummaryHandler(fakeDb(seed()), editor, { from: '2026-11-10' }, NOW);
  assert.equal(fromOnly.totals?.workedHours, 2, 'to defaults to today; t1 is the 9th');
  const upTo = await getTimeSummaryHandler(fakeDb(seed()), editor, { to: '2026-10-31' }, NOW);
  assert.equal(upTo.totals?.workedHours, 1);
  const lateNight = fakeDb(seed());
  lateNight.store.timeLogs.l1.startTime = new Date('2026-11-11T04:30:00Z'); // 23:30 on the 10th in Toronto
  const day = await getTimeSummaryHandler(lateNight, editor, { from: '2026-11-10', to: '2026-11-10' }, NOW);
  assert.equal(day.totals?.workedHours, 2, 'a late-evening entry belongs to the local day, not the UTC day');
});

test('one client can be asked about, and it must be a contact of this workspace', async () => {
  const dana = await getTimeSummaryHandler(fakeDb(seed()), editor, { contactId: 'cDana' }, NOW);
  assert.equal(dana.totals?.unbilledHours, 3);
  assert.match(dana.message, /you for Dana Whitfield/);
  assert.deepEqual(dana.clients, []);
  for (const contactId of ['cOther', 'missing']) {
    const result = await getTimeSummaryHandler(fakeDb(seed()), editor, { contactId }, NOW);
    assert.equal(result.success, false);
    assert.match(result.message, /contact was not found in this workspace/);
  }
  const odd = await getTimeSummaryHandler(fakeDb(seed()), editor, { contactId: '../x' }, NOW);
  assert.match(odd.message, /contact id is not valid/);
});

test('bad dates are refused with a message the model can act on', async () => {
  const db = fakeDb(seed());
  assert.match((await getTimeSummaryHandler(db, editor, { from: 'last week' }, NOW)).message, /YYYY-MM-DD/);
  assert.match((await getTimeSummaryHandler(db, editor, { from: '2026-11-10', to: 'today' }, NOW)).message, /YYYY-MM-DD/);
  assert.match((await getTimeSummaryHandler(db, editor, { from: '2026-11-10', to: '2026-11-01' }, NOW)).message, /must not be before/);
});

test('no time at all gives a plain answer, not zeros dressed up as figures', async () => {
  const empty = fakeDb({ timeLogs: {}, tasks: {}, contacts: {}, users: {} });
  const result = await getTimeSummaryHandler(empty, editor, {}, NOW);
  assert.equal(result.success, true);
  assert.match(result.message, /There is no recorded or scheduled time for you across all dates/);
});

test('a guest, a missing workspace and a missing database fail safely, reading nothing', async () => {
  const db = fakeDb(seed());
  for (const ctx of [readToolContext(undefined), readToolContext({ userId: 'u1' }), readToolContext({ orgId: 'orgA' })]) {
    const result = await getTimeSummaryHandler(db, ctx, {}, NOW);
    assert.equal(result.success, false);
    assert.match(result.message, /not authenticated/);
  }
  const noDb = await getTimeSummaryHandler(null, editor, {}, NOW);
  assert.equal(noDb.success, false);
  assert.match(noDb.message, /not available/);
});

test('a read that fails is reported as a failure with no figures', async () => {
  const db = fakeDb(seed()) as any;
  const original = db.collection.bind(db);
  db.collection = (name: string) => {
    if (name === 'timeLogs') throw new Error('read refused');
    return original(name);
  };
  const result = await getTimeSummaryHandler(db, editor, {}, NOW);
  assert.equal(result.success, false);
  assert.equal(result.totals, null);
  assert.match(result.message, /could not be read/);
});

  assert.equal(all.totals?.workedHours, 2 + 4 + 1 + 1, 'every orgA entry, none of orgB');
  assert.equal(all.totals?.unbilledHours, 2 + 4 + 1);
  assert.match(all.message, /the whole workspace/);
  const names = all.clients.map((c) => c.client).sort();
  assert.deepEqual(names, ['Acme Ltd', 'Dana Whitfield']);
  assert.equal(all.clients[0].client, 'Acme Ltd', 'biggest unbilled client first');
});
