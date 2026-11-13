import assert from 'node:assert/strict';
import test from 'node:test';

import { processCommand } from '../src/lib/command-processor';
import { shouldProcessAsCommand } from '../src/lib/copilot-routing';

/**
 * Found by trying the names people type for every menu screen (12 Nov 2026): 32 opened nothing and 24 opened a
 * neighbour. This pins the fixes, and the bare words that must NOT jump to a page.
 */
const opens = (phrase: string, href: string) => {
  const result = processCommand(phrase);
  assert.equal(result.type === 'navigation' || result.type === 'action', true, `${phrase} -> ${result.type}`);
  assert.equal((result.target ?? '').split('?')[0], href, phrase);
};

test('the names that used to open nothing now open their screen', () => {
  const cases: Array<[string, string]> = [
    ['open documents', '/document-manager'], ['open my documents', '/document-manager'],
    ['open my notes', '/user-notes'], ['open ideas', '/idea-board'], ['open help', '/help'], ['open the help page', '/help'],
    ['open users', '/user-manager'], ['open receipts', '/accounting/receipt-processor'], ['open loans', '/accounting/loan-manager'],
    ['open human resources', '/hr-manager'], ['open leave', '/hr-manager/time-off'], ['open reports', '/reports'],
    ['go to documents', '/document-manager'], ['take me to the help page', '/help'],
  ];
  for (const [phrase, href] of cases) opens(phrase, href);
});

test('the names that used to open a NEIGHBOUR now open the right screen', () => {
  const cases: Array<[string, string]> = [
    ['open client time log', '/reports/client-time-log'], ['open client time logs', '/reports/client-time-log'],
    ['open my client time log', '/reports/client-time-log'], ['open client time report', '/reports/client-time-log'],
    ['open sales tax', '/accounting/tax/sales-tax'], ['open sales taxes', '/accounting/tax/sales-tax'],
    ['open tax category', '/accounting/tax/categories'],
    ['open idea boards', '/idea-board'],
  ];
  for (const [phrase, href] of cases) opens(phrase, href);
});

test('the pages reached from a card or a button open from their own name, with their own label', () => {
  const cases: Array<[string, string, string]> = [
    ['open rituals', '/settings/rituals', 'Planning Rituals'], ['open planning rituals', '/settings/rituals', 'Planning Rituals'],
    ['open settings rituals', '/settings/rituals', 'Planning Rituals'], ['open site images', '/settings/site-images', 'Site Images'],
    ['open image settings', '/settings/site-images', 'Site Images'], ['open calendar reminders', '/calendar/reminders', 'Calendar Reminders'],
    ['open reminders', '/calendar/reminders', 'Calendar Reminders'], ['open inventory pos', '/inventory-manager/pos', 'Point of Sale'],
    ['open the pos', '/inventory-manager/pos', 'Point of Sale'], ['open point of sale', '/inventory-manager/pos', 'Point of Sale'],
    ['open organize ideas', '/idea-board/organize', 'Organize Ideas'], ['open idea board organize', '/idea-board/organize', 'Organize Ideas'],
    ['open change password', '/change-password', 'Change Password'], ['open help', '/help', 'Help'],
  ];
  for (const [phrase, href, label] of cases) {
    opens(phrase, href);
    assert.equal(processCommand(phrase).label, label, phrase);
  }
});

test('"open settings" and its neighbours are right, and Settings is not confused with its sub-pages', () => {
  for (const phrase of ['open settings', 'go to settings', 'settings', 'open my settings', 'take me to settings', 'open the settings page']) opens(phrase, '/settings');
  opens('open payroll settings', '/accounting/payroll/settings');
  opens('open payroll history', '/accounting/payroll/history');
  opens('open payroll', '/accounting/payroll/run');
});

test('ordinary words typed on their own are NOT turned into a page jump (they are usually the start of a question)', () => {
  for (const word of ['help', 'users', 'tenants', 'vacation', 'reminders', 'pos']) {
    const result = processCommand(word);
    assert.equal(result.type === 'navigation' || result.type === 'action', false, `${word} -> ${result.type} ${result.target ?? ''}`);
  }
});

test('questions and requests that mention these names are still answered, never opened', () => {
  for (const phrase of [
    'how do I open the help page', 'where is the point of sale?', 'what are planning rituals', 'how do I change my password?',
    'help me with payroll', 'what is sales tax', 'who can see the user manager', 'documents for Dana', 'open documents for Dana',
  ]) {
    const result = processCommand(phrase);
    assert.equal(result.type === 'navigation' || result.type === 'action', false, `${phrase} -> ${result.type} ${result.target ?? ''}`);
  }
});

test('the verbs still decide: show me / view are left to the Co-Pilot for the names that are lists, and open opens', () => {
  assert.equal(processCommand('show me my quotes').type, 'unknown');
  opens('open quotes', '/accounting/quotes');
  assert.equal(shouldProcessAsCommand('open documents', []), true);
});
