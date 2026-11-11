import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { TOOL_ACCESS, toolNamesForRole } from '../src/ai/tool-access';

const ALL = Object.keys(TOOL_ACCESS);
const WRITES = ['createTask', 'createProject', 'createContact', 'createAppointment'];
const MONEY_READS = ['getInvoices', 'getQuotes'];

test('an editor, an admin and a super admin are offered every tool', () => {
  for (const role of ['editor', 'org_admin', 'super_admin']) assert.deepEqual(toolNamesForRole(role, ALL), ALL, role);
});

test('a viewer is offered no write tool and no invoice or quote tool, but can still look things up', () => {
  const offered = toolNamesForRole('viewer', ALL);
  for (const name of [...WRITES, ...MONEY_READS]) assert.ok(!offered.includes(name), `${name} offered to a viewer`);
  for (const name of ['searchGlobal', 'searchContacts', 'getCalendar', 'getTimeSummary', 'searchKnowledge', 'syncReceipts']) {
    assert.ok(offered.includes(name), `${name} not offered to a viewer`);
  }
});

test('a missing, empty or unknown role gets what a viewer gets', () => {
  const viewer = toolNamesForRole('viewer', ALL);
  for (const role of [undefined, null, '', 'none', 'root', 'EDITOR', 42]) assert.deepEqual(toolNamesForRole(role, ALL), viewer, String(role));
});

test('the order of the tools given is kept, and an unlisted tool is offered to nobody', () => {
  assert.deepEqual(toolNamesForRole('editor', ['getInvoices', 'searchGlobal', 'createTask']), ['getInvoices', 'searchGlobal', 'createTask']);
  assert.deepEqual(toolNamesForRole('editor', ['brandNewTool']), []);
  assert.deepEqual(toolNamesForRole('super_admin', ['brandNewTool', 'searchGlobal']), ['searchGlobal']);
});

test('every tool the agent defines is classified here, and nothing is classified that does not exist', () => {
  const source = fs.readFileSync('src/ai/flows/ogeemo-chat.ts', 'utf8');
  const defined = [...source.matchAll(/defineTool\(\s*\{\s*name:\s*'([^']+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual([...ALL].sort(), defined, 'src/ai/tool-access.ts is out of step with the tools in ogeemo-chat.ts');
});

test('every write tool and money read the handlers refuse a viewer for is marked editor-only', () => {
  for (const name of [...WRITES, ...MONEY_READS]) assert.equal(TOOL_ACCESS[name], 'editor', name);
});

test('the agent offers tools through this filter, not a fixed list', () => {
  const source = fs.readFileSync('src/ai/flows/ogeemo-chat.ts', 'utf8');
  assert.match(source, /toolNamesForRole\(\s*runtimeContext\?\.accessLevel/);
  assert.ok(!/tools:\s*\[searchGlobalTool/.test(source), 'a fixed tools list is back in the agent');
});
