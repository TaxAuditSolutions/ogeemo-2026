import assert from 'node:assert/strict';
import test from 'node:test';

import { ARCHIVE_MARKER, archiveFileName, buildIdeaArchive, buildTaskArchive } from '../src/lib/task-archive';
import { ideaFromSnapshot, isArchiveFileName, parseArchive, taskFromSnapshot, type TaskSnapshot } from '../src/lib/task-restore';

const task = {
  id: 't1',
  title: 'Site visit: Acme / phase 2',
  description: 'Bring the ladder.\nCheck the roof.',
  status: 'inProgress' as const,
  start: new Date('2026-10-01T09:00:00Z'),
  end: new Date('2026-10-01T11:00:00Z'),
  isScheduled: true,
  projectId: 'p1',
  contactId: 'c1',
  workerId: 'w1',
  duration: 5400,
  durationSource: 'sessions' as const,
  sessions: [{ id: 's1', startTime: new Date('2026-10-01T09:00:00Z'), endTime: new Date('2026-10-01T10:30:00Z'), durationSeconds: 5400, notes: 'main work' }],
  isBillable: true,
  billableRate: 95,
  position: 0,
  userId: 'u1',
};

test('an archive is a readable summary plus an exact copy, never empty', () => {
  const file = buildTaskArchive(task as any, new Date('2026-11-08T12:00:00Z'));
  assert.match(file.content, /^ARCHIVED TASK/);
  assert.match(file.content, /Title: Site visit: Acme \/ phase 2/);
  assert.match(file.content, /Time recorded: 1h 30m in 1 session/);
  assert.match(file.content, /Billable: yes, at \$95.00 per hour/);
  assert.match(file.content, /Bring the ladder\./);
  assert.ok(file.content.includes(ARCHIVE_MARKER));
  assert.ok(file.content.length > 300);
});

test('the file name keeps the Archived Task - title pattern and is safe for any file system', () => {
  assert.equal(archiveFileName('task', 'Site visit: Acme / phase 2'), 'Archived Task - Site visit- Acme - phase 2.txt');
  assert.equal(archiveFileName('idea', '   '), 'Archived Idea - Untitled.txt');
  assert.equal(archiveFileName('task', 'x'.repeat(200)).length, 'Archived Task - '.length + 80 + '.txt'.length);
  assert.equal(isArchiveFileName('Archived Task - Something.txt'), true);
  assert.equal(isArchiveFileName('Archived Idea - Something.txt'), true);
  assert.equal(isArchiveFileName('Invoice 12.pdf'), false);
  assert.equal(isArchiveFileName(undefined), false);
});

test('an archived task is restored with its notes, schedule, client, rate and time sessions', () => {
  const parsed = parseArchive(buildTaskArchive(task as any).content);
  assert.equal(parsed.ok, true);
  const restored = taskFromSnapshot((parsed as any).archive as TaskSnapshot, { project: true, contact: true });
  assert.deepEqual(restored.notes, []);
  const t = restored.task as any;
  assert.equal(t.title, task.title);
  assert.equal(t.description, task.description);
  assert.equal(t.status, 'inProgress');
  assert.equal(t.contactId, 'c1');
  assert.equal(t.projectId, 'p1');
  assert.equal(t.billableRate, 95);
  assert.equal(t.duration, 5400);
  assert.equal(t.sessions.length, 1);
  assert.equal(t.sessions[0].durationSeconds, 5400);
  assert.equal(t.start.toISOString(), '2026-10-01T09:00:00.000Z');
});

test('a restored task is never marked as billed', () => {
  const parsed = parseArchive(buildTaskArchive({ ...task, billedInvoiceId: 'inv9' } as any).content);
  const restored = taskFromSnapshot((parsed as any).archive, { project: true, contact: true }).task as any;
  assert.equal(restored.billedInvoiceId, null);
  assert.equal(restored.billedAt, null);
});

test('a project or client that no longer exists is dropped and the user is told', () => {
  const parsed = parseArchive(buildTaskArchive(task as any).content);
  const restored = taskFromSnapshot((parsed as any).archive, { project: false, contact: false });
  assert.equal((restored.task as any).projectId, null);
  assert.equal((restored.task as any).contactId, null);
  assert.equal(restored.notes.length, 2);
  assert.match(restored.notes[0], /project no longer exists/);
  assert.match(restored.notes[1], /client no longer exists/);
});
