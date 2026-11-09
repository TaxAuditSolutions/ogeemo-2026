import assert from 'node:assert/strict';
import test from 'node:test';

import { ARCHIVE_MARKER, buildIdeaArchive, buildTaskArchive } from '../src/lib/task-archive';
import { ideaFromSnapshot, parseArchive, taskFromSnapshot } from '../src/lib/task-restore';

test('an unscheduled task stays unscheduled and an odd status becomes to do', () => {
  const parsed = parseArchive(buildTaskArchive({ title: 'Plain', status: 'weird' } as any).content);
  const t = taskFromSnapshot((parsed as any).archive, { project: true, contact: true }).task as any;
  assert.equal(t.isScheduled, false);
  assert.equal(t.status, 'todo');
  assert.equal(t.start, undefined);
});

test('an archived idea keeps its description and decision, and restores them', () => {
  const file = buildIdeaArchive({ title: 'New offer', description: 'Sell it by the hour', status: 'Yes' });
  assert.match(file.content, /^ARCHIVED IDEA/);
  const parsed = parseArchive(file.content);
  assert.equal(parsed.ok, true);
  assert.deepEqual(ideaFromSnapshot((parsed as any).archive), { title: 'New offer', description: 'Sell it by the hour', status: 'Yes' });
  assert.equal(ideaFromSnapshot({ kind: 'idea', title: 'x', description: '', status: 'bogus' as any }).status, 'Maybe');
});

test('empty archives, other files and damaged archives are refused with a plain message', () => {
  assert.match((parseArchive('') as any).error, /empty/);
  assert.match((parseArchive(undefined) as any).error, /empty/);
  assert.match((parseArchive('just some text') as any).error, /not an Ogeemo archive/);
  assert.match((parseArchive(`${ARCHIVE_MARKER}\n{not json`) as any).error, /damaged/);
  assert.match((parseArchive(`${ARCHIVE_MARKER}\n{"kind":"task","title":""}`) as any).error, /no title/);
  assert.match((parseArchive(`${ARCHIVE_MARKER}\n{"kind":"mystery","title":"x"}`) as any).error, /unknown kind/);
});

test('very long notes are cut instead of overflowing the record', () => {
  const file = buildTaskArchive({ title: 'Big', description: 'x'.repeat(250_000) } as any);
  assert.match(file.content, /the original was longer/);
  assert.ok(file.content.length < 230_000);
  assert.equal(parseArchive(file.content).ok, true);
});

test('text that looks like the marker inside the notes is refused rather than misread', () => {
  const file = buildTaskArchive({ title: 'Tricky', description: `before ${ARCHIVE_MARKER} after` } as any);
  assert.equal(parseArchive(file.content).ok, false);
});
