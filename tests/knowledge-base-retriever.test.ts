import assert from 'node:assert/strict';
import test from 'node:test';
import { asPublishedChunks, loadKnowledgeDocuments } from '../src/ai/knowledge-base/source-documents';
import {
  buildSearchTerms,
  knowledgeCitations,
  knowledgeSearchTerms,
  matchesCandidateQuery,
  rankKnowledgeChunks,
} from '../src/ai/knowledge-base/retriever';
import type { KnowledgeChunk } from '../src/ai/knowledge-base/types';

const chunks = asPublishedChunks(loadKnowledgeDocuments());
const idsFor = (query: string, currentPath?: string) => rankKnowledgeChunks(chunks, { query, currentPath }).map((chunk) => chunk.id);
const idsForQuery = (query: string) => idsFor(query);

const cases = [
  ['How do I select an existing activity?', 'activity-manager.selection-and-quick-actions'],
  ['How do I customize Quick actions in Activity Manager?', 'activity-manager.selection-and-quick-actions'],
  ['How does Next free slot choose a time?', 'activity-manager.when.next-free-slot'],
  ['How do I give an activity no set time?', 'activity-manager.when.choices-and-editing'],
  ['What happens when I change the assignee?', 'activity-manager.when.next-free-slot'],
  ['What is the difference between Save and Save & New?', 'activity-manager.save.controls'],
  ['Why did my unfinished calendar item turn amber?', 'calendar.events.overdue'],
  ['How do I reopen a completed calendar item?', 'calendar.events.done-and-menu'],
  ['How do I create an entry from a calendar time slot?', 'calendar.quick-entry.create'],
  ['How do I switch the sidebar to Favorites?', 'navigation.sidebar.views'],
  ['How do Workflows affect the sidebar Workspace group?', 'navigation.sidebar.workflows'],
  ['What can the Knowledge Base do?', 'platform.knowledge-base.purpose'],
  ['How do I add a contact?', 'contacts.create.manual'],
  ['Where do new contacts go if I do not choose a folder?', 'contacts.folders.defaults-and-system'],
  ['What happens when I delete a contact folder?', 'contacts.folders.manage'],
  ['How do I edit or bulk delete contacts?', 'contacts.edit.delete'],
  ['How do I start a project from a contact?', 'contacts.actions.workflow-links'],
  ['What does the consolidated Client Record show?', 'contacts.client-record.overview'],
  ['When is a contact document folder created?', 'contacts.documents.provisioning'],
  ['Why can I not see payroll fields on my contact?', 'contacts.hr.conditional-fields'],
  ['How do I start and pause a timer?', 'time.timer.start-pause-log'],
  ['What does Stop & Log do?', 'time.timer.start-pause-log'],
  ['Why did my timer disappear on another computer?', 'time.timer.running-indicator'],
  ['How do I edit a recorded session?', 'time.sessions.edit-and-save'],
  ['Why does my scheduled activity say not yet worked?', 'time.duration.scheduled-vs-worked'],
  ['Where do I find Time Logs?', 'time.log.report'],
  ['How do I log time after the fact?', 'time.log.manual-entry'],
  ['Can I delete a calendar event from the Time Log?', 'time.log.row-actions'],
  ['Which time can be billed?', 'time.billing.eligibility'],
  ['How do I turn my billable hours into an invoice?', 'time.billing.to-invoice'],
  ['How do I see all the hours for one client?', 'time.client-log.report'],
  ['How do I print a work activity report for a client?', 'time.work-activity.summary'],
  ['Which report should I use?', 'time.reports.hub'],
  ['How does payroll calculate hours worked?', 'time.payroll.from-time'],
  ['How is a salaried worker paid for a pay period?', 'time.payroll.from-time'],
  ['How do I set my pay schedule to bi-weekly?', 'time.payroll.pay-periods'],
  ['Why are my payroll period dates not lining up?', 'time.payroll.pay-periods'],
  ['How do I turn a quote into an invoice?', 'quotes.convert.to-invoice'],
  ['Why can I not convert my declined quote?', 'quotes.convert.to-invoice'],
  ['What do the quote statuses mean?', 'quotes.lifecycle.statuses'],
  ['What does the Approve button do on a quote?', 'quotes.lifecycle.statuses'],
  ['How is the invoice number chosen?', 'invoices.create.numbers-and-totals'],
  ['Why does my invoice total have cents rounded?', 'invoices.create.numbers-and-totals'],
  ['Why does my invoice say overdue?', 'invoices.receivable.overdue-and-balance'],
  ['Where do I see what clients owe me?', 'invoices.receivable.overdue-and-balance'],
  ['How do I post a payment on an invoice?', 'invoices.payment.post'],
  ['What is the BKS ledger?', 'bks.ledger.overview'],
  ['Why do my personal entries not count in the ledger totals?', 'bks.ledger.overview'],
  ['How does the entry form work out the tax from the amount?', 'bks.entry.tax-and-amounts'],
  ['How is the net amount calculated from a tax-inclusive total?', 'bks.entry.tax-and-amounts'],
  ['How do I work out the sales tax I owe?', 'bks.tax.sales-tax'],
  ['What does Record Remittance Payment do?', 'bks.tax.sales-tax'],
  ['What is the income statement based on?', 'bks.tax.income-statement'],
  ['What happens to an expense with no tax line?', 'bks.tax.income-statement'],
  ['Does the income statement include sales tax?', 'bks.tax.income-statement'],
  ['Why is my sales tax remittance not an expense on the income statement?', 'bks.tax.income-statement'],
  ['How do I post a scanned receipt to the ledger?', 'bks.receipts.intake-and-posting'],
  ['What checks does receipt review run?', 'bks.receipts.intake-and-posting'],
  ['How do I upload a bank statement CSV?', 'bks.bank.statement-csv'],
  ['Why were some rows skipped when I imported my bank file?', 'bks.bank.statement-csv'],
  ['How are bank transactions matched to my ledger?', 'bks.bank.matching'],
  ['What does a day drift mean in reconciliation?', 'bks.bank.matching'],
  ['How do I pay a bill in accounts payable?', 'bks.payable.bills'],
  ['Why does my bill say overdue?', 'bks.payable.bills'],
  ['What does Mark as Paid do on a payroll remittance?', 'bks.payroll.remittances'],
  ['Why is my payroll remittance not counted twice on the income statement?', 'bks.payroll.remittances'],
  ['How do I record CCA depreciation on an asset?', 'bks.assets.cca'],
  ['What is the half-year rule for capital assets?', 'bks.assets.cca'],
  ['How do I add a loan in the Loan Manager?', 'bks.loans.manager'],
  ['Why does the outstanding balance on a loan not go down?', 'bks.loans.manager'],
  ['How is owner equity worked out on the financial snapshot?', 'bks.equity.and-balance-sheet'],
  ['Why does the balance sheet balance?', 'bks.equity.and-balance-sheet'],
  ['What is the current box float in petty cash?', 'bks.pettycash.float'],
  ['What does Post to GL do for petty cash?', 'bks.pettycash.float'],
  ['Can I invoice a work order twice?', 'bks.workorders.invoicing'],
  ['What order do work order statuses go in?', 'bks.workorders.invoicing'],
  ['Which account do reconciled bank statement entries go to?', 'bks.bank.matching'],
  ['Why can I not delete a time log that was invoiced?', 'time.entries.invoiced-lock'],
  ['Why can I not change the hours on an activity that is on an invoice?', 'time.entries.invoiced-lock'],
  ['Why can I not delete a project that has billed activities?', 'time.entries.invoiced-lock'],
  ['Why is my custom shortcut link refused?', 'action-manager.shortcuts.links'],
  ['What links can I use for a My Shortcuts custom URL?', 'action-manager.shortcuts.links'],
  ['How do I restore an archived task?', 'action-manager.archive.restore'],
  ['Why is my archived task file empty?', 'action-manager.archive.restore'],
  ['Why can I not archive a task that is on a work order?', 'action-manager.archive.restore'],
  ['Why can I not delete or rename a system folder in the Document Manager?', 'document-manager.folders.rules'],
  ['What happens to the files when I delete a folder in the Document Manager?', 'document-manager.folders.rules'],
  ['Why can I not drag a file onto All Files?', 'document-manager.folders.rules'],
  ['Why does the Document Manager refuse my Google Drive link?', 'document-manager.folders.rules'],
  ['Why does View Documents say the folder no longer exists?', 'document-manager.files.links'],
  ['Why will the Co-Pilot not create a task for me?', 'ai.copilot.tasks-and-limits'],
  ['Can the Co-Pilot schedule something for tomorrow in my time zone?', 'ai.copilot.tasks-and-limits'],
  ['Why does the Co-Pilot say I am sending requests too quickly?', 'ai.copilot.tasks-and-limits'],
  ['Why did the Image Generator fail to make my picture?', 'ai.image-generator.usage'],
  ['How many images can I generate a minute?', 'ai.image-generator.usage'],
  ['What is the difference between a Viewer and an Editor?', 'permissions.roles.what-each-can-do'],
  ['Why can I not change my own role?', 'permissions.roles.what-each-can-do'],
  ['What happens to a user who is removed from my workspace?', 'permissions.roles.what-each-can-do'],
  ['How does an invited team member set their password?', 'permissions.invitations.and-passwords'],
  ['Can an admin change the password of a user in another workspace?', 'permissions.invitations.and-passwords'],
  ['Why can I not delete a contact that has invoices?', 'contacts.edit.delete'],
  ['Why does Ogeemo say a contact is still in use when I delete it?', 'contacts.edit.delete'],
  ['How do I search for a contact by phone number?', 'contacts.search.and-checks'],
  ['Why does Ogeemo say a contact is a possible duplicate?', 'contacts.search.and-checks'],
  ['Why is my SIN rejected when I save a contact?', 'contacts.search.and-checks'],
  ['What happens to contacts when I delete a folder?', 'contacts.folders.manage'],
  ['Why does Payroll History show the pay stub year to date?', 'time.payroll.history-and-stubs'],
  ['Can I pay a worker twice for the same pay period?', 'time.payroll.history-and-stubs'],
  ['How do I restart invoice numbers at 001?', 'settings.document-numbering'],
  ['Why can two document types not share a prefix?', 'settings.document-numbering'],
  ['Why is my posted receipt counted under Other expenses?', 'bks.receipts.posting-checks'],
  ['Why does posting a receipt say net plus tax is not the total?', 'bks.receipts.posting-checks'],
  ['Does Secure Bank Link connect to my bank?', 'bks.bank.statements-screen'],
  ['What happens if I upload the same bank statement CSV twice?', 'bks.bank.statements-screen'],
  ['Why is my SKU refused when I save an inventory item?', 'bks.inventory.items-and-stock'],
  ['How is total inventory value calculated in Inventory Central?', 'bks.inventory.items-and-stock'],
  ['What does Complete Sale do in Point of Sale?', 'bks.inventory.point-of-sale'],
  ['Can two tills sell the last unit of an item?', 'bks.inventory.point-of-sale'],
  ['How do I record a payment on a loan?', 'bks.loans.payments'],
  ['Does loan interest count as an expense?', 'bks.loans.payments'],
  ['Does the balance sheet include cash in the bank?', 'bks.balance-sheet.cash-inventory'],
  ['How is inventory valued on the balance sheet?', 'bks.balance-sheet.cash-inventory'],
  ['How do I set an opening balance for a bank account?', 'bks.balance-sheet.cash-inventory'],
  ['How do I add an item to Products and Services?', 'bks.catalogue.products-services'],
  ['Why did changing a catalogue price not change my old invoice?', 'bks.catalogue.products-services'],
  ['What is audit-ready record keeping mode?', 'bks.receipts.tax-and-record-keeping'],
  ['Why does the tax come from the total on a receipt?', 'bks.receipts.tax-and-record-keeping'],
  ['Why can I not record a payment bigger than the balance?', 'invoices.payment.post'],
  ['How do I change the payroll deduction percentage?', 'time.payroll.deductions-rate'],
  ['Can I change deductions for just one payroll run?', 'time.payroll.deductions-rate'],
  ['Why is my unscheduled activity missing from the time report?', 'time.entries.no-set-time'],
  ['How do I merge a duplicate contact?', 'contacts.merge.duplicates'],
  ['How do I merge a duplicate worker?', 'contacts.merge.workers'],
  ['What happens to a contact\'s invoices when I merge duplicates?', 'contacts.merge.duplicates'],
  ['How do I create a project from a template?', 'projects.create.blank-or-template'],
  ['How do I change a project status on the board?', 'projects.status.lifecycle'],
  ['How do I sort the project list by client?', 'projects.list.register'],
  ['How do I save a project as a template?', 'projects.list.actions'],
  ['What happens to tasks when I delete a project?', 'projects.delete.cascade'],
  ['How do I move a task to done on the task board?', 'projects.task-board.columns'],
  ['How do I add steps in the project planner?', 'projects.planner.steps'],
  ['How do I schedule a project step on the calendar?', 'projects.planner.schedule-and-template'],
  ['How do projects connect to the Activity Manager project picker?', 'projects.activity-link'],
  ['What is a standard workflow?', 'workflows.overview.standard'],
  ['How do I reorder the steps in a workflow?', 'workflows.create.edit'],
  ['Which template workflows are available?', 'workflows.templates'],
  ['Why is my sidebar not following my workflow?', 'workflows.sidebar-fallback'],
  ['What happens if I delete my standard workflow?', 'workflows.delete'],
  ['How does the Welcome page use my workflow?', 'workflows.welcome-integration'],
] as const;

for (const [query, expected] of cases) {
  test(`retrieval covers: ${query}`, () => assert.ok(idsFor(query).includes(expected), `Expected ${expected}; got ${idsFor(query).join(', ')}`));
}

// Production retrieval first selects candidates in Firestore with
// array-contains-any(searchTerms, queryTerms), then ranks them. Simulating that
// step here keeps the Firestore path honest: ranking tests over the full source
// set cannot see a document the candidate query would never select.
for (const [query, expected] of cases) {
  test(`firestore candidate selection finds: ${query}`, () => {
    const queryTerms = knowledgeSearchTerms(query).slice(0, 10);
    const candidates = chunks
      .map((chunk) => ({ ...chunk, searchTerms: buildSearchTerms(chunk) }))
      .filter((chunk) => matchesCandidateQuery(chunk.searchTerms, queryTerms));
    const ids = rankKnowledgeChunks(candidates, { query }).map((chunk) => chunk.id);
    assert.ok(ids.includes(expected), `Expected ${expected} among candidates; got ${ids.join(', ') || 'none'}`);
  });
}

test('search terms are single words, so phrase keywords are reachable by one word', () => {
  const terms = buildSearchTerms({ keywords: ['delete project'], title: 'What deleting a project removes', module: 'Projects' });
  assert.ok(terms.includes('delete'));
  assert.ok(terms.includes('project'));
  assert.ok(terms.every((term) => !term.includes(' ')));
});

test('general Ogeemo identity questions select platform identity on the beta page', () => {
  assert.equal(rankKnowledgeChunks(chunks, { query: 'What is Ogeemo?', currentPath: '/knowledge-base' })[0]?.id, 'platform.identity.overview');
});

test('an unsupported question retrieves nothing instead of guessing', () => {
  assert.deepEqual(idsFor('How do I change the colour of the moon in Ogeemo?'), []);
});

test('a focused question is not padded with unrelated, weakly matching entries', () => {
  const ids = idsFor('Which template workflows are available?');
  assert.equal(ids[0], 'workflows.templates');
  assert.ok(!ids.includes('activity-manager.when.next-free-slot'), `unrelated entry cited: ${ids.join(', ')}`);
  assert.ok(!ids.includes('calendar.quick-entry.create'), `unrelated entry cited: ${ids.join(', ')}`);
});

test('retrieval is limited to four prompt chunks', () => {
  assert.ok(rankKnowledgeChunks(chunks, { query: 'activity calendar time schedule action', limit: 4 }).length <= 4);
});

test('current page boosts documentation for that route', () => {
  const ids = idsFor('How do I create an entry?', '/calendar');
  assert.equal(ids[0], 'calendar.quick-entry.create');
});

test('role-restricted documents are not returned to other roles', () => {
  const restricted: KnowledgeChunk = {
    ...chunks[0], id: 'admin.only', audiences: ['org_admin'], keywords: ['secret admin procedure'], content: 'Administrator-only documentation.',
  };
  assert.equal(rankKnowledgeChunks([restricted], { query: 'secret admin procedure', accessLevel: 'viewer' }).length, 0);
  assert.equal(rankKnowledgeChunks([restricted], { query: 'secret admin procedure', accessLevel: 'org_admin' }).length, 1);
});

test('citations expose user-facing routes, not source code paths', () => {
  const citations = knowledgeCitations(rankKnowledgeChunks(chunks, { query: 'sidebar favorites' }));
  assert.equal(citations[0].route, '/settings');
  assert.ok(!JSON.stringify(citations).includes('src/'));
});

test('search terms include useful aliases and stay bounded', () => {
  assert.ok(knowledgeSearchTerms('appointment availability').includes('free'));
  assert.ok(!knowledgeSearchTerms('which templates are available').includes('free'), "'available' alone must not imply scheduling");
  assert.ok(idsForQuery('when am I available for a meeting').includes('activity-manager.when.next-free-slot'));
  assert.ok(knowledgeSearchTerms('favourites').includes('favorites'));
  assert.ok(knowledgeSearchTerms('one two three four five six seven eight nine ten eleven twelve thirteen fourteen').length <= 12);
});
