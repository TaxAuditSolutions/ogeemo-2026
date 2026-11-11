import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { classifyRate, gradeToolChoice, rateToolChoice, summarizeToolEval, type ToolEvalCase } from '../src/ai/tool-eval';
import { TOOL_EVAL_CASES } from '../src/ai/tool-eval-cases';

const base: ToolEvalCase = { id: 'x', say: 'x', role: 'editor' };

test('the first call must be one of the expected tools', () => {
  const c = { ...base, first: ['getInvoices'] };
  assert.equal(gradeToolChoice(c, ['getInvoices']).pass, true);
  assert.equal(gradeToolChoice(c, ['getInvoices', 'getQuotes']).pass, true, 'later calls are not graded');
  assert.equal(gradeToolChoice(c, ['getQuotes']).pass, false);
  assert.equal(gradeToolChoice(c, ['getQuotes', 'getInvoices']).pass, false, 'order matters: the first call is the choice');
  assert.match(gradeToolChoice(c, []).reason, /called no tool/);
});

test('several tools may be acceptable first calls', () => {
  const c = { ...base, first: ['searchContacts', 'getInvoices'] };
  assert.equal(gradeToolChoice(c, ['searchContacts', 'getInvoices']).pass, true);
  assert.equal(gradeToolChoice(c, ['getInvoices']).pass, true);
});

test('"none" means no tool at all', () => {
  const c = { ...base, none: true };
  assert.equal(gradeToolChoice(c, []).pass, true);
  assert.match(gradeToolChoice(c, ['createTask']).reason, /expected no tool, called createTask/);
});

test('a forbidden tool fails the case wherever in the chain it appears', () => {
  const c = { ...base, first: ['searchContacts'], forbid: ['createContact'] };
  assert.equal(gradeToolChoice(c, ['searchContacts']).pass, true);
  const grade = gradeToolChoice(c, ['searchContacts', 'createContact']);
  assert.equal(grade.pass, false);
  assert.match(grade.reason, /createContact/);
});

test('a case that only forbids passes when nothing forbidden is called, tool or no tool', () => {
  const c = { ...base, forbid: ['createTask'] };
  assert.equal(gradeToolChoice(c, []).pass, true);
  assert.equal(gradeToolChoice(c, ['getCalendar']).pass, true);
  assert.equal(gradeToolChoice(c, ['createTask']).pass, false);
});

test('the summary counts passes and lists each failure with what was called', () => {
  const results = [
    { testCase: { ...base, id: 'a', first: ['getInvoices'] }, called: ['getInvoices'] },
    { testCase: { ...base, id: 'b', first: ['getQuotes'], say: 'quotes?' }, called: ['getInvoices'] },
    { testCase: { ...base, id: 'c', none: true }, called: [] },
  ];
  const summary = summarizeToolEval(results);
  assert.equal(summary.passed, 2);
  assert.equal(summary.total, 3);
  assert.deepEqual(summary.failures.map((f) => [f.id, f.called]), [['b', ['getInvoices']]]);
});

test('repeated runs give a pass rate, and say how each failing run went wrong', () => {
  const c = { ...base, first: ['getTimeSummary'] };
  const rate = rateToolChoice(c, [['getTimeSummary'], ['searchKnowledge'], ['getTimeSummary'], [], ['getTimeSummary']]);
  assert.equal(rate.passes, 3);
  assert.equal(rate.runs, 5);
  assert.deepEqual(rate.failedCalls, [['searchKnowledge'], []]);
  assert.equal(classifyRate(rate), 'flaky');
});

test('every run passing is stable, none passing is broken, and no runs at all is not "stable"', () => {
  const c = { ...base, none: true };
  assert.equal(classifyRate(rateToolChoice(c, [[], [], []])), 'stable');
  assert.equal(classifyRate(rateToolChoice(c, [['createTask'], ['createTask']])), 'broken');
  assert.equal(classifyRate(rateToolChoice(c, [])), 'broken');
});

test('the case list itself is sound: unique ids, a message and a check on every case', () => {
  const ids = TOOL_EVAL_CASES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate case id');
  for (const c of TOOL_EVAL_CASES) {
    assert.ok(c.say.trim(), `${c.id} has no message`);
    assert.ok(c.first?.length || c.none || c.forbid?.length, `${c.id} checks nothing`);
    assert.ok(!(c.none && c.first?.length), `${c.id} says both none and a first tool`);
  }
});

test('every tool the agent has is the expected first call of some case, so a new tool cannot ship unevaluated', () => {
  const source = fs.readFileSync('src/ai/flows/ogeemo-chat.ts', 'utf8');
  const defined = [...source.matchAll(/defineTool\(\s*\{\s*name:\s*'([^']+)'/g)].map((m) => m[1]);
  const covered = new Set(TOOL_EVAL_CASES.flatMap((c) => c.first ?? []));
  for (const tool of defined) assert.ok(covered.has(tool), `${tool} is not the expected first call of any case in src/ai/tool-eval-cases.ts`);
});

test('every tool named in a case really exists, so a typo cannot make a check pass for the wrong reason', () => {
  const source = fs.readFileSync('src/ai/flows/ogeemo-chat.ts', 'utf8');
  const defined = new Set([...source.matchAll(/defineTool\(\s*\{\s*name:\s*'([^']+)'/g)].map((m) => m[1]));
  for (const c of TOOL_EVAL_CASES) {
    for (const name of [...(c.first ?? []), ...(c.forbid ?? [])]) assert.ok(defined.has(name), `${c.id} names ${name}, which is not a tool`);
  }
});

test('the write cases cover the viewer refusal and the "cannot do yet" requests', () => {
  assert.ok(TOOL_EVAL_CASES.some((c) => c.role === 'viewer'), 'no viewer case');
  for (const id of ['move-event', 'cancel-event', 'confirm-cancel', 'decline-cancel', 'cannot-delete', 'cannot-delete-todo', 'cannot-pay', 'cannot-send']) assert.ok(TOOL_EVAL_CASES.some((c) => c.id === id), `${id} missing`);
});
