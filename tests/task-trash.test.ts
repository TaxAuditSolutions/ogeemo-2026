import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { NO_LINKS, type TaskLinks } from '../src/lib/task-links';
import { buildTrashRecord, sortTrash, taskFromTrash, trashProblem, trashedMessage, UNTITLED_TASK } from '../src/lib/task-trash';

const links = (extra: Partial<TaskLinks>): TaskLinks => ({ ...NO_LINKS, ...extra });
const NOW = new Date('2026-11-13T15:00:00Z');

const todo = {
  id: 't1',
  title: '  Call the bank  ',
  description: 'Ask about the loan.',
  status: 'inProgress' as const,
  projectId: 'p1',
  contactId: 'c1',
  isTodoItem: true,
  isScheduled: false,
  position: 0,
  userId: 'u1',
};

test('an ordinary task can go in the trash', () => {
  assert.equal(trashProblem(NO_LINKS), null);
});

test('a task on an invoice, a quote or an open work order cannot, and the message says why', () => {
  assert.match(trashProblem(links({ invoiceLines: 1 }))!, /in use by an invoice.*cannot be moved to the trash/);
  assert.match(trashProblem(links({ billed: true }))!, /an invoice/);
  assert.match(trashProblem(links({ quoteLines: 2 }))!, /2 quote lines/);
  assert.match(trashProblem(links({ workOrder: { number: 'WO-1', status: 'scheduled' } }))!, /work order WO-1 \(scheduled\)/);
  assert.equal(trashProblem(links({ workOrder: { number: 'WO-2', status: 'completed' } })), null, 'a finished work order does not block');
});

test('a task with recorded time cannot, because emptying the trash would erase time that feeds payroll', () => {
  const message = trashProblem(links({ workedSeconds: 5400 }))!;
  assert.match(message, /1h 30m of recorded time/);
  assert.match(message, /Archive it instead/);
});

test('the stored record keeps what the list needs, and an exact copy', () => {
  const record = buildTrashRecord(todo, NOW);
  assert.equal(record.title, 'Call the bank');
  assert.equal(record.status, 'inProgress');
  assert.equal(record.projectId, 'p1');
  assert.equal(record.contactId, 'c1');
  assert.equal(record.isTodoItem, true);
  assert.match(record.content, /^ARCHIVED TASK/);
  assert.match(record.content, /Ask about the loan\./);
});

test('a task with no title is still stored, as Untitled task, so it can be read back', () => {
  for (const title of ['', '   ', undefined]) {
    const record = buildTrashRecord({ ...todo, title } as any, NOW);
    assert.equal(record.title, UNTITLED_TASK);
    assert.equal(taskFromTrash(record, { project: true, contact: true }).ok, true);
  }
});

test('an odd status becomes To Do and the inbox pseudo-project is not kept', () => {
  const record = buildTrashRecord({ ...todo, status: 'weird', projectId: 'inbox' } as any, NOW);
  assert.equal(record.status, 'todo');
  assert.equal(record.projectId, null);
});

test('restore brings the task back with its notes, client and project, and a plain to-do goes back on the To-Do List', () => {
  const restored = taskFromTrash(buildTrashRecord(todo, NOW), { project: true, contact: true });
  assert.equal(restored.ok, true);
  const task = (restored as any).task;
  assert.equal(task.title, 'Call the bank');
  assert.equal(task.description, 'Ask about the loan.');
  assert.equal(task.status, 'inProgress');
  assert.equal(task.projectId, 'p1');
  assert.equal(task.contactId, 'c1');
  assert.equal(task.isTodoItem, true);
  assert.deepEqual((restored as any).notes, []);
  const plain = taskFromTrash({ ...buildTrashRecord(todo, NOW), isTodoItem: false }, { project: true, contact: true });
  assert.equal((plain as any).task.isTodoItem, false);
});

test('a project or client that was deleted meanwhile is dropped, and the person is told', () => {
  const restored: any = taskFromTrash(buildTrashRecord(todo, NOW), { project: false, contact: false });
  assert.equal(restored.ok, true);
  assert.equal(restored.task.projectId, null);
  assert.equal(restored.task.contactId, null);
  assert.equal(restored.notes.length, 2);
});

test('a restored task is never billed', () => {
  const restored: any = taskFromTrash(buildTrashRecord({ ...todo, billedInvoiceId: 'inv9' } as any, NOW), { project: true, contact: true });
  assert.equal(restored.task.billedInvoiceId, null);
  assert.equal(restored.task.billedAt, null);
});

test('a damaged or foreign record is refused with a plain message, never restored half-way', () => {
  assert.match((taskFromTrash({ content: '' }, { project: true, contact: true }) as any).error, /empty/);
  assert.match((taskFromTrash({ content: 'hello' }, { project: true, contact: true }) as any).error, /not an Ogeemo archive/);
  assert.equal(taskFromTrash({}, { project: true, contact: true }).ok, false);
  const idea = '--- ogeemo-archive-v1 ---\n{"kind":"idea","title":"x","description":"","status":"Maybe"}';
  assert.match((taskFromTrash({ content: idea }, { project: true, contact: true }) as any).error, /not a task/);
});

test('the trash lists the newest first, and an item with no date last', () => {
  const items = [
    { id: 'a', trashedAt: new Date('2026-11-10T10:00:00Z') },
    { id: 'b', trashedAt: null },
    { id: 'c', trashedAt: new Date('2026-11-12T10:00:00Z') },
  ];
  assert.deepEqual(sortTrash(items).map((i) => i.id), ['c', 'a', 'b']);
  assert.deepEqual(items.map((i) => i.id), ['a', 'b', 'c'], 'the input is not changed');
});

test('the message after trashing is one plain sentence', () => {
  assert.equal(trashedMessage([]), '');
  assert.equal(trashedMessage(['Call the bank']), '"Call the bank" is in the trash.');
  assert.equal(trashedMessage(['a', 'b', 'c']), '3 items are in the trash.');
});

test('the wiring: the page, the card menu, the service and the security rules agree', () => {
  const view = fs.readFileSync('src/components/tasks/tasks-view.tsx', 'utf8');
  assert.match(view, /<TrashBin count=\{trashCount\} onDropTask=\{handleTrashTask\}/, 'the bin is on the page');
  assert.equal((view.match(/onTrash=\{handleTrashTask\}/g) ?? []).length, 3, 'all three columns offer Move to Trash');
  assert.match(view, /<TrashDialog/, 'the trash window is on the page');
  assert.match(view, /loadData\(true\)/, 'the page reloads quietly, so the open trash window is not closed');
  assert.match(fs.readFileSync('src/components/tasks/TaskCard.tsx', 'utf8'), /Move to Trash/);
  assert.match(fs.readFileSync('src/components/tasks/TaskColumn.tsx', 'utf8'), /onTrash=\{onTrash\}/);

  const service = fs.readFileSync('src/services/trash-service.ts', 'utf8');
  assert.match(service, /TRASHED_TASKS_COLLECTION = 'trashedTasks'/);
  assert.match(service, /trashProblem\(await getTaskLinks\(/, 'a task in use is refused');
  assert.match(service, /billedDeleteProblem\(data, 'activity'\)/, 'an invoiced task is refused');
  assert.match(service, /batch\.set\(trashRef[\s\S]*queueStepRemoval\(batch[\s\S]*batch\.delete\(doc\(db, TASKS_COLLECTION, id\)\)[\s\S]*batch\.commit\(\)/, 'the trash record is written and the original removed in one batch');
  assert.ok(service.indexOf('await addTask(') < service.indexOf('await deleteDoc(ref)'), 'restore creates the task before it empties the trash record');

  const rules = fs.readFileSync('firestore.rules', 'utf8');
  assert.match(rules, /match \/trashedTasks\/\{trashId\} \{ allow read: if canReadOrgDoc\(\); allow create: if canCreateOrgDoc\(\); allow update: if canUpdateOrgDoc\(\); allow delete: if canDeleteOrgDoc\(\); \}/, 'only the same workspace and editors');
});

test('the trash is part of the backup of Projects & Operations', () => {
  assert.match(fs.readFileSync('src/lib/backup-utils.ts', 'utf8'), /'tasks',\s*\n\s*'trashedTasks',/);
  assert.match(fs.readFileSync('functions/src/backup-utils.ts', 'utf8'), /'tasks',\s*\n\s*'trashedTasks',/);
});
