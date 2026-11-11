import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { TOOL_ACCESS, describeToolLimits, toolNamesForRole, unofferedToolReply } from '../src/ai/tool-access';

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

test('a viewer is told in the prompt what their role cannot do, and an editor is told nothing', () => {
  const limits = describeToolLimits('viewer', ALL);
  for (const phrase of ['make a to-do or task', 'add a project', 'add a contact', 'book an appointment', 'read invoices', 'read quotes']) assert.match(limits, new RegExp(phrase));
  assert.match(limits, /editor or administrator/);
  for (const role of ['editor', 'org_admin', 'super_admin']) assert.equal(describeToolLimits(role, ALL), '', role);
  assert.match(describeToolLimits(undefined, ALL), /make a to-do or task/, 'an unknown role is limited like a viewer');
  assert.equal(describeToolLimits('viewer', ['searchGlobal', 'getCalendar']), '', 'nothing withheld, nothing said');
});

test('a request for a tool the role was not offered is answered as a role limit, never as an outage', () => {
  const thrown = { originalMessage: 'Tool getInvoices not found', status: 'NOT_FOUND', code: 404 };
  const reply = unofferedToolReply(thrown);
  assert.equal(reply?.tool, 'getInvoices');
  assert.match(reply?.reply ?? '', /cannot read invoices/);
  assert.ok(!/unresponsive|service/i.test(reply?.reply ?? ''), 'must not blame the AI service');
  assert.equal(unofferedToolReply({ message: 'Tool createTask not found' })?.tool, 'createTask', 'the message field works too');
  assert.match(unofferedToolReply(new Error('Tool createContact not found'))?.reply ?? '', /cannot add a contact/);
});

test('any other error is left alone, including a not-found for something that is not one of our tools', () => {
  for (const other of [new Error('429 resource exhausted'), new Error('Tool exploitTool not found'), { originalMessage: 'Tool  not found' }, { originalMessage: 'The Tool getInvoices not found' }, null, undefined, 'Tool getInvoices not found', 42]) {
    assert.equal(unofferedToolReply(other), null, String(JSON.stringify(other)));
  }
});

test('the agent passes the role limits to the model and catches a request for an unoffered tool', () => {
  const source = fs.readFileSync('src/ai/flows/ogeemo-chat.ts', 'utf8');
  assert.match(source, /describeToolLimits\(runtimeContext\?\.accessLevel/);
  assert.match(source, /unofferedToolReply\(error\)/);
});
