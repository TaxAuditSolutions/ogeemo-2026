import assert from 'node:assert/strict';
import test from 'node:test';

import { describeToolsCalled, emptyReplyMessage, shouldRetryEmptyReply, toolsCalled } from '../src/ai/tool-trace';

const user = { role: 'user', content: [{ text: 'who owes me money?' }] };
const ask = (name: string, input: unknown = {}) => ({ role: 'model', content: [{ toolRequest: { name, input, ref: '1' } }] });
const answer = (name: string) => ({ role: 'tool', content: [{ toolResponse: { name, output: { success: true } } }] });
const reply = { role: 'model', content: [{ text: 'Here you go.' }] };

test('the tools a model called are read from its turns, in order, with repeats kept', () => {
  const messages = [user, ask('searchContacts'), answer('searchContacts'), ask('getInvoices'), answer('getInvoices'), ask('getInvoices'), answer('getInvoices'), reply];
  assert.deepEqual(toolsCalled(messages), ['searchContacts', 'getInvoices', 'getInvoices']);
});

test('a plain answer with no tool calls is an empty list', () => {
  assert.deepEqual(toolsCalled([user, reply]), []);
  assert.deepEqual(toolsCalled([]), []);
});

test('tool responses and text are not counted as calls', () => {
  assert.deepEqual(toolsCalled([answer('getInvoices'), reply]), []);
});

test('several calls in one model turn are all counted', () => {
  const turn = { role: 'model', content: [{ toolRequest: { name: 'getCalendar' } }, { toolRequest: { name: 'getTimeSummary' } }] };
  assert.deepEqual(toolsCalled([turn]), ['getCalendar', 'getTimeSummary']);
});

test('odd input is ignored rather than throwing, and only plain names get through', () => {
  for (const bad of [undefined, null, 'x', 42, {}, [null, 5, 'x', { content: 'x' }, { content: [null, 1, {}] }]]) {
    assert.deepEqual(toolsCalled(bad), []);
  }
  const hostile = { role: 'model', content: [{ toolRequest: { name: 'get Invoices\nSECRET' } }, { toolRequest: { name: 42 } }, { toolRequest: { name: '' } }, { toolRequest: { name: 'ok_Tool2' } }] };
  assert.deepEqual(toolsCalled([hostile]), ['ok_Tool2']);
});

test('the arguments never leave: only names are returned', () => {
  const names = toolsCalled([ask('createContact', { name: 'Dana Whitfield', email: 'dana@acme.com' })]);
  assert.deepEqual(names, ['createContact']);
  assert.ok(!JSON.stringify(names).includes('Dana'));
});

test('the log line lists the names or says none', () => {
  assert.equal(describeToolsCalled(['searchContacts', 'getInvoices']), 'searchContacts, getInvoices');
  assert.equal(describeToolsCalled([]), 'none');
});

test('an empty reply is retried only when no tool has run, so a write can never be done twice', () => {
  for (const empty of ['', '   ', '\n', undefined, null, 42]) assert.equal(shouldRetryEmptyReply(empty, []), true, String(empty));
  assert.equal(shouldRetryEmptyReply('Done.', []), false, 'a real answer is never retried');
  assert.equal(shouldRetryEmptyReply('', ['getInvoices']), false, 'a tool already ran');
  assert.equal(shouldRetryEmptyReply('', ['createTask']), false, 'a write already ran');
});

test('the message after an empty reply never claims success, and warns when something may have been saved', () => {
  const plain = emptyReplyMessage([]);
  assert.match(plain, /nothing was changed/);
  assert.ok(!/processed your request/i.test(plain));
  assert.match(emptyReplyMessage(['getInvoices']), /nothing was changed/, 'a read changes nothing');
  for (const write of ['createTask', 'createProject', 'createContact', 'createAppointment']) {
    const warned = emptyReplyMessage(['searchContacts', write]);
    assert.match(warned, /cannot confirm it was saved/, write);
    assert.match(warned, /not done twice/, write);
    assert.ok(!/nothing was changed/.test(warned), `${write} must not claim nothing changed`);
  }
});
