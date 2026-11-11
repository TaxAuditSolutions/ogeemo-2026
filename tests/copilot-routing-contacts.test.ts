import assert from 'node:assert/strict';
import test from 'node:test';

import { isContactDetailChange, isContactEditRequest, shouldProcessAsCommand } from '../src/lib/copilot-routing';

test('a change to a person\'s detail is a contact edit even when the word "contact" is never said', () => {
  for (const yes of [
    "change Dana's phone number to 555-0199",
    "update Jane's email to jane@new.com",
    'remove the fax number from Sam',
    "correct the spelling of Dana's name",
    'Fix the city for Dana Whitfield',
    "clear Sam's cell phone",
    "set Dana's website to acme.com",
    "replace Jane's address with 12 Main Street",
  ]) {
    assert.equal(isContactDetailChange(yes), true, yes);
    assert.equal(isContactEditRequest(yes), true, yes);
    assert.equal(shouldProcessAsCommand(yes, []), false, `${yes} must reach the assistant`);
  }
});

test('questions, and details of invoices, quotes, projects, folders and the user\'s own login, are not contact edits', () => {
  for (const no of [
    'How do I change a phone number?',
    'what is my phone number',
    'update the invoice address',
    'change my password',
    'update the quote number',
    'change the business number on the invoice',
    'change the order number',
    "update Dana's SIN",
    "rename the project's name",
    'set the timer to 5 minutes',
    'remove the receipt',
    'open contacts',
    '',
  ]) {
    assert.equal(isContactDetailChange(no), false, no);
  }
});

test('the earlier contact-edit phrasings still count, and plain navigation still does not', () => {
  assert.equal(isContactEditRequest('edit John Doe\'s contact'), true);
  assert.equal(isContactEditRequest('i want to add an email address to the contact "Cookie Monster"'), true);
  assert.equal(isContactEditRequest('open contacts'), false);
  assert.equal(shouldProcessAsCommand('open contacts', []), true);
});

test('a contact edit is not mistaken for a contact creation', () => {
  assert.equal(isContactEditRequest("add a phone number to Jane Doe's contact"), true);
  assert.equal(isContactEditRequest('add a new contact named Dana White'), false);
});
