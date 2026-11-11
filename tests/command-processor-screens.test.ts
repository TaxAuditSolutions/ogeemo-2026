import assert from 'node:assert/strict';
import test from 'node:test';

import { processCommand } from '../src/lib/command-processor';
import { shouldProcessAsCommand } from '../src/lib/copilot-routing';
import { allMenuItems } from '../src/lib/menu-items';

/**
 * Every screen in the menu must open when its own name is typed, however it is asked for. An audit on 11 Nov 2026
 * found 14 of 66 screens opened a neighbour instead (a loose alias such as "projects" beat the exact name "Project
 * Status"), which is why a typed request could bring up the wrong button. This pins all 66, six ways each.
 */
const ways = (label: string) => [`open ${label}`, `go to the ${label}`, `show me ${label} page`, `take me to ${label}`, label, `open my ${label.toLowerCase()}`];

test('every menu screen opens when its own name is typed, six ways', () => {
  const wrong: string[] = [];
  for (const item of allMenuItems) {
    for (const phrase of ways(item.label)) {
      const result = processCommand(phrase);
      const startsSomething = /^create /i.test(item.label);
      const right = result.target === item.href && (result.type === 'navigation' || (result.type === 'action' && startsSomething));
      if (!right) wrong.push(`"${phrase}" -> ${result.type} ${result.target ?? ''} (want ${item.href})`);
    }
  }
  assert.deepEqual(wrong, []);
});

test('the screens that used to open a neighbour now open themselves', () => {
  const expected: Array<[string, string]> = [
    ['Project Status', '/project-status'],
    ['Idea Board', '/idea-board'],
    ['Quote Manager', '/accounting/quotes'],
    ['Image Manager', '/image-manager'],
    ['Client Statement', '/reports/client-statement'],
    ['Worker Time Log Report', '/reports/time-log'],
    ['Client Time Log Report', '/reports/client-time-log'],
    ['Payroll History', '/accounting/payroll/history'],
    ['Payroll Settings', '/accounting/payroll/settings'],
    ['Tax Categories', '/accounting/tax/categories'],
    ['Sales Tax Calculator', '/accounting/tax/sales-tax'],
    ['Accrual Accounting', '/accounting/accrual-accounting'],
    ['Income Statement', '/accounting/reports/income-statement'],
    ['Customize My Shortcuts', '/action-manager/manage'],
  ];
  for (const [label, href] of expected) assert.equal(processCommand(`open ${label}`).target, href, label);
});

test('"open contact hub" and "open contacts hub" still open the Contacts Hub', () => {
  for (const phrase of ['open contact hub', 'open contacts hub', 'open contacts', 'open the contact hub page', 'contacts hub']) {
    const result = processCommand(phrase);
    assert.equal(result.type, 'navigation', phrase);
    assert.equal(result.target, '/contacts', phrase);
  }
});

test('the short aliases people use when they do not know the name still work', () => {
  const aliases: Array<[string, string]> = [
    ['open ar', '/accounting/accounts-receivable'],
    ['open taxes', '/accounting/tax'],
    ['go to ledger', '/accounting/ledgers'],
    ['open projects', '/projects/all'],
    ['open calendar', '/calendar'],
    ['open the time log', '/reports/time-log'],
    ['open timelog', '/reports/time-log'],
    ['open backups', '/backup'],
    ['open to-do list', '/to-do'],
  ];
  for (const [phrase, href] of aliases) assert.equal(processCommand(phrase).target, href, phrase);
});

test('requests that START something keep their prefilled link, and nothing becomes a navigation by accident', () => {
  assert.match(processCommand('start timer').target ?? '', /^\/event-manager\?startTimer=true/);
  assert.equal(processCommand('create a project called Apollo').target, '/projects/create?title=apollo');
  assert.equal(processCommand('new invoice').target, '/accounting/invoices/create', 'no stray "?" when no client is named');
  assert.equal(processCommand('new invoice for Acme').target, '/accounting/invoices/create?contactName=acme');
  assert.equal(processCommand('create a contact').type, 'unknown', 'contact creation is the Co-Pilot\'s job, not a link');
});

test('a question is answered, not opened, even with no question mark and no "is/are/do" (found live: payroll year end)', () => {
  const questions = [
    'What happens to my payroll deductions at year end',
    'What happens to my payroll deductions at year end?',
    'when is payroll due',
    'which quotes need follow-up',
    'where do I find the ledger',
    'who owes me money',
    'does payroll include vacation pay',
    'can I print an invoice',
    'is there a way to export contacts',
    'what time log report shows billable hours',
  ];
  for (const q of questions) assert.equal(processCommand(q).type, 'unknown', q);
  // ...and the plain requests that share their nouns still open the screen
  for (const [q, href] of [['payroll', '/accounting/payroll/run'], ['open payroll', '/accounting/payroll/run'], ['open the quote manager', '/accounting/quotes'], ['open the ledger', '/accounting/ledgers'], ['do my taxes', '/accounting/tax']] as const) {
    assert.equal(processCommand(q).target, href, q);
  }
});

test('an exact screen name is used only for a plain screen request, never for a question or a creation request', () => {
  assert.equal(processCommand('how do I open the Quote Manager?').type, 'unknown');
  assert.equal(processCommand('what is the Idea Board').type, 'unknown');
  assert.equal(shouldProcessAsCommand('open Quote Manager', []), true);
});
