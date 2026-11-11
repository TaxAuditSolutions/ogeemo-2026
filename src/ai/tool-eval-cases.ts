/**
 * The cases the tool-choice eval runs (see src/ai/tool-eval.ts). Add one when you add a tool: the test fails if a tool
 * in 04_tool_definitions.json is never the expected first call of any case.
 */
import { DATA_TOOLS, WRITE_TOOLS, type ToolEvalCase } from '@/ai/tool-eval';

const SEARCH = ['searchContacts', 'searchGlobal'] as const;

export const TOOL_EVAL_CASES: readonly ToolEvalCase[] = [
  // Actions: the right write tool, and not a neighbouring one.
  { id: 'todo', say: 'Make a to-do: call the bank', role: 'editor', first: ['createTask'], forbid: ['createAppointment', 'createProject'] },
  { id: 'todo-reminder', say: 'Remind me to call Dana on Friday at 2pm', role: 'editor', first: ['createTask', 'searchContacts', 'searchGlobal'], forbid: ['createProject'] },
  { id: 'todo-linked', say: 'Add a task to call Dana about the Website project', role: 'editor', first: [...SEARCH, 'createTask'], forbid: ['createProject'] },
  { id: 'project', say: 'Add a new project called Zz Probe Project', role: 'editor', first: ['createProject'], forbid: ['createTask', 'createAppointment'] },
  { id: 'contact', say: 'Add a contact named Jane Doe, jane@acme.com', role: 'editor', first: ['createContact'], forbid: ['createProject', 'createTask'] },
  { id: 'appointment', say: 'Book a meeting called Team sync tomorrow at 3pm for 30 minutes', role: 'editor', first: ['createAppointment', 'getCalendar'], forbid: ['createTask'] },
  { id: 'sync', say: 'Sync my receipts', role: 'editor', first: ['syncReceipts'], forbid: [...WRITE_TOOLS] },

  // Reads: the right data tool, and not a neighbouring one.
  { id: 'calendar', say: 'What is on my calendar tomorrow?', role: 'editor', first: ['getCalendar'], forbid: [...WRITE_TOOLS] },
  { id: 'hours', say: 'How many hours did I work this week?', role: 'editor', first: ['getTimeSummary'], forbid: [...WRITE_TOOLS, 'getInvoices'] },
  { id: 'unbilled', say: 'What is unbilled?', role: 'editor', first: ['getTimeSummary'], forbid: ['getInvoices', ...WRITE_TOOLS] },
  { id: 'team-hours', say: 'How many hours has the whole team logged this month?', role: 'org_admin', first: ['getTimeSummary'], forbid: [...WRITE_TOOLS] },
  { id: 'owed', say: 'Who owes me money?', role: 'editor', first: ['getInvoices'], forbid: ['getQuotes', 'getTimeSummary', ...WRITE_TOOLS] },
  { id: 'overdue', say: 'What invoices are overdue?', role: 'editor', first: ['getInvoices'], forbid: ['getQuotes', ...WRITE_TOOLS] },
  { id: 'invoice-status', say: 'What is the status of invoice INV-1042?', role: 'editor', first: ['getInvoices'], forbid: ['getQuotes', ...WRITE_TOOLS] },
  { id: 'client-paid', say: 'Has Dana paid?', role: 'editor', first: [...SEARCH, 'getInvoices'], forbid: ['getQuotes', ...WRITE_TOOLS] },
  { id: 'quotes-open', say: 'Which quotes need follow-up?', role: 'editor', first: ['getQuotes'], forbid: ['getInvoices', ...WRITE_TOOLS] },
  { id: 'who', say: 'Who is Dana?', role: 'editor', first: [...SEARCH], forbid: [...WRITE_TOOLS] },

  // Questions about how things work are answered, never acted on.
  { id: 'how-contact', say: 'How do I add a contact?', role: 'editor', forbid: [...WRITE_TOOLS] },
  { id: 'how-quote', say: 'How do I create a quote?', role: 'editor', forbid: [...WRITE_TOOLS, ...DATA_TOOLS] },
  { id: 'what-bks', say: 'What is BKS?', role: 'editor', forbid: [...WRITE_TOOLS, ...DATA_TOOLS] },
  { id: 'how-knowledge', say: 'What happens to my payroll deductions at year end?', role: 'editor', first: ['searchKnowledge'], forbid: [...WRITE_TOOLS] },

  // Things it cannot do: no neighbouring write tool may stand in for them.
  { id: 'cannot-move', say: 'Move my 3pm meeting tomorrow to 4pm', role: 'editor', forbid: [...WRITE_TOOLS] },
  { id: 'cannot-delete', say: 'Delete the Website Redesign project', role: 'editor', forbid: [...WRITE_TOOLS] },
  { id: 'cannot-pay', say: 'Post a payment of $500 on INV-1042', role: 'editor', forbid: [...WRITE_TOOLS] },
  { id: 'cannot-send', say: 'Send invoice INV-1042 to Dana by email', role: 'editor', forbid: [...WRITE_TOOLS] },
  { id: 'cannot-edit-contact', say: "Change Dana's phone number to 555-0199", role: 'editor', forbid: ['createContact'] },
  { id: 'cannot-payroll', say: 'Run payroll for this month', role: 'org_admin', forbid: [...WRITE_TOOLS] },

  // A viewer asking to write: the tool would refuse, but the model should not even try.
  { id: 'viewer-todo', say: 'Make a to-do: buy milk', role: 'viewer', forbid: ['createTask'] },

  // A reply that only makes sense in context.
  {
    id: 'reply-project-name',
    say: 'Website Redesign',
    role: 'editor',
    history: [
      { role: 'user', content: 'Add a new project' },
      { role: 'model', content: 'What should the project be called?' },
    ],
    first: ['createProject'],
    forbid: ['createTask', 'createContact'],
  },
  {
    id: 'reply-todo-text',
    say: 'call the bank',
    role: 'editor',
    history: [
      { role: 'user', content: 'Make a to-do' },
      { role: 'model', content: 'What should the to-do say?' },
    ],
    first: ['createTask'],
    forbid: ['createProject', 'createContact'],
  },
];
