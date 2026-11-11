import assert from 'node:assert/strict';
import test from 'node:test';

import { isProjectCreationRequest, isTaskRequest, shouldProcessAsCommand } from '../src/lib/copilot-routing';

test('to-do and task requests are recognised, however the to-do is spelled', () => {
  for (const yes of [
    'make a to-do',
    'make a T-Do',
    'make a todo',
    'add a to-do: call the bank',
    'add a todo call the bank',
    'create a task for Friday',
    'new task call Dana',
    'add a reminder to renew the licence',
    'remind me to call Dana on Friday',
    'create a to do list item for the bank',
  ]) {
    assert.equal(isTaskRequest(yes), true, yes);
  }
});

test('navigation, questions about tasks and other records are not task requests', () => {
  for (const no of [
    'open my tasks',
    'show the to-do list',
    'go to todo',
    'to-do',
    'what is a task',
    'create a task template',
    'add a task report',
    'start timer',
    'create an invoice',
    '',
  ]) {
    assert.equal(isTaskRequest(no), false, no);
  }
});

test('project creation requests are recognised, and opening the project screens is not one', () => {
  for (const yes of [
    'add a new project',
    'create a project called Website Redesign',
    'new project Website',
    'make a project for Dana',
    'start a new project: Audit prep',
  ]) {
    assert.equal(isProjectCreationRequest(yes), true, yes);
  }
  for (const no of [
    'open projects',
    'show the project board',
    'go to the project list',
    'create a project template',
    'project status',
    'add a task to the project',
    'create a task for the website project',
    '',
  ]) {
    assert.equal(isProjectCreationRequest(no), false, no);
  }
});

test('in the chat these go to the assistant, not the command processor', () => {
  assert.equal(shouldProcessAsCommand('make a T-Do', []), false);
  assert.equal(shouldProcessAsCommand('add a to-do: call the bank', []), false);
  assert.equal(shouldProcessAsCommand('remind me to call Dana', []), false);
  assert.equal(shouldProcessAsCommand('add a new project', []), false);
  assert.equal(shouldProcessAsCommand('create a project called Website Redesign', []), false);
});

test('navigation and the other commands still go to the command processor', () => {
  assert.equal(shouldProcessAsCommand('open projects', []), true);
  assert.equal(shouldProcessAsCommand('open to-do list', []), true);
  assert.equal(shouldProcessAsCommand('go to the project board', []), true);
  assert.equal(shouldProcessAsCommand('create a project template', []), true);
  assert.equal(shouldProcessAsCommand('start timer', []), true);
  assert.equal(shouldProcessAsCommand('create an invoice', []), true);
});

test('answering "what should it be called?" or "create it anyway?" stays in the conversation', () => {
  const askName = { role: 'model' as const, content: 'Sure. What should the project be called?' };
  assert.equal(shouldProcessAsCommand('Website Redesign', [askName]), false);
  assert.equal(shouldProcessAsCommand('new website for Dana', [askName]), false);
  const askTodo = { role: 'model' as const, content: 'What should the to-do say?' };
  assert.equal(shouldProcessAsCommand('call the bank', [askTodo]), false);
  assert.equal(shouldProcessAsCommand('add milk to the list', [askTodo]), false);
  const dup = { role: 'model' as const, content: 'A project called "Website Redesign" already exists. Create another with the same name anyway?' };
  assert.equal(shouldProcessAsCommand('yes, create it anyway', [dup]), false);
});

test('an unrelated question from the assistant does not capture the next command', () => {
  const other = { role: 'model' as const, content: 'The ledger is ready. Would you like anything else?' };
  assert.equal(shouldProcessAsCommand('open projects', [other]), true);
});
