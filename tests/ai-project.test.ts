import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAiProject, canCreateProjects, projectNameKey } from '../src/lib/ai-project';

const NOW = new Date('2026-11-11T15:00:00Z');
const ctx = { userId: 'u1', orgId: 'orgA', now: NOW };

test('a project is built with every field the New Project screen saves', () => {
  const built = buildAiProject({ name: '  Website   Redesign ', description: ' New site ', contactId: 'c1' }, ctx);
  assert.equal(built.ok, true);
  const project = (built as any).project;
  assert.equal(project.name, 'Website Redesign');
  assert.equal(project.description, 'New site');
  assert.equal(project.status, 'planning');
  assert.equal(project.contactId, 'c1');
  assert.deepEqual(project.steps, []);
  assert.equal(project.orgId, 'orgA');
  assert.equal(project.userId, 'u1');
  assert.equal(project.createdBy, 'u1');
  assert.equal(project.updatedBy, 'u1');
  assert.equal(project.createdAt, NOW);
  assert.equal(project.importance, 'B');
  assert.equal(project.urgency, 'important');
});

test('only the name is required; no client means null, not an empty string', () => {
  const built = buildAiProject({ name: 'Audit prep' }, ctx);
  assert.equal(built.ok, true);
  assert.equal((built as any).project.contactId, null);
  assert.equal((built as any).project.description, '');
});

test('a missing or blank name is refused with a message the model can act on', () => {
  for (const input of [{}, { name: '' }, { name: '   ' }, { name: '\n\t' }]) {
    const built = buildAiProject(input, ctx);
    assert.equal(built.ok, false);
    assert.match((built as any).error, /needs a name/);
  }
});

test('a contact id that is not a plausible id is refused', () => {
  const built = buildAiProject({ name: 'x', contactId: '../other/doc' }, ctx);
  assert.equal(built.ok, false);
  assert.match((built as any).error, /contact id is not valid/);
});

test('a long name and description are cut, and line breaks in a name become spaces', () => {
  const built = buildAiProject({ name: `A\nB${'x'.repeat(300)}`, description: 'd'.repeat(9000) }, ctx) as any;
  assert.equal(built.project.name.length, 200);
  assert.ok(!built.project.name.includes('\n'));
  assert.equal(built.project.description.length, 5000);
});

test('the duplicate key ignores case and spacing', () => {
  assert.equal(projectNameKey('  Website   REDESIGN '), projectNameKey('website redesign'));
  assert.equal(projectNameKey(undefined), '');
});

test('only an editor or above may create a project', () => {
  for (const level of ['super_admin', 'org_admin', 'editor']) assert.equal(canCreateProjects(level), true, level);
  for (const level of ['viewer', '', undefined, 'none']) assert.equal(canCreateProjects(level), false, String(level));
});
