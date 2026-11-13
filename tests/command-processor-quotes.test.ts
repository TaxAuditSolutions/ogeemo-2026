import assert from 'node:assert/strict';
import test from 'node:test';

import { processCommand } from '../src/lib/command-processor';
import { shouldProcessAsCommand } from '../src/lib/copilot-routing';

/**
 * Found live on 12 Nov 2026: "open quote form" was answered with a route written in text, and "open quotes" / "go to
 * quotes" opened nothing. The Quote Manager and Create Quote screens now open from the ways people actually ask.
 */
const MANAGER = '/accounting/quotes';
const CREATE = '/accounting/quotes/create';

const opens = (phrase: string, href: string) => {
  const result = processCommand(phrase);
  assert.equal(result.type === 'navigation' || result.type === 'action', true, `${phrase} -> ${result.type}`);
  assert.equal(result.target, href, phrase);
};

test('the Quote Manager opens from the ways people ask for it', () => {
  for (const phrase of [
    'open quote manager', 'open the quote manager', 'quote manager', 'go to quote manager', 'take me to the quote manager',
    'open quotes', 'go to quotes', 'open my quotes', 'open all quotes', 'open the quotes', 'take me to my quotes', 'bring up quotes',
    'open the quote list', 'open quote list', 'quotes', 'my quotes', 'open quotes page', 'go to the quotes screen',
  ]) opens(phrase, MANAGER);
});

test('Create Quote opens from the ways people ask for the form', () => {
  for (const phrase of [
    'open quote form', 'open the quote form', 'go to the quote form', 'show me the quote form', 'show the quote form',
    'view quote form', 'open create quote', 'create quote', 'new quote', 'create a quote', 'open the quote generator',
    'open new quote form', 'quote form', 'new quote form', 'take me to the quote form',
  ]) opens(phrase, CREATE);
});

test('asking to SEE the quotes is left to the Co-Pilot, which reads them and answers with the figures', () => {
  for (const phrase of ['show me my quotes', 'show me quotes', 'show quotes', 'view quotes', 'view my quotes', 'show my quotes']) {
    const result = processCommand(phrase);
    assert.equal(result.type, 'unknown', `${phrase} -> ${result.type} ${result.target ?? ''}`);
    assert.equal(shouldProcessAsCommand(phrase, []), true, 'it still reaches the processor, which hands it on');
  }
});

test('questions and requests about quotes are never turned into a page jump', () => {
  for (const phrase of [
    'which quotes need follow-up', 'how many quotes are open', 'what quotes do I have', 'what is a quote', 'how do I open the quote form',
    'how do I create a quote?', 'list my quotes', 'quotes for Dana', 'quotes that expire this week', 'who has an open quote',
    'when does the quote for Bugs Bunny expire', 'where is the quote manager?',
  ]) {
    assert.equal(processCommand(phrase).type, 'unknown', phrase);
  }
});

test('the invoice screens did not move, and a quote is not mistaken for one', () => {
  opens('open invoices', '/accounting/accounts-receivable');
  opens('new invoice', '/accounting/invoices/create');
  opens('open accounts receivable', '/accounting/accounts-receivable');
  assert.notEqual(processCommand('open quotes').target, '/accounting/accounts-receivable');
});

test('a quote request that names a client is not swallowed as a plain "open the quotes" request', () => {
  // These carry a client name, so they are not the screen's own name. They go to the Co-Pilot, as before.
  assert.equal(processCommand('open quotes for Dana').type, 'unknown');
  assert.equal(processCommand('open the quotes for Dana').type, 'unknown');
  // Creating a quote still opens the form, exactly as it did before this change (it has no client hand-off yet).
  assert.equal(processCommand('create a quote for Dana').target, CREATE);
  assert.equal(processCommand('create a quote for Dana').type, 'action');
});
