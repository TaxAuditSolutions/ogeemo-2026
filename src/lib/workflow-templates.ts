import type { Workflow, WorkflowItem } from '@/services/workflow-service';

/**
 * Shipped workflow templates - user-invoked starting points for the
 * Template Workflows menu on /workflows.
 *
 * History: workflow-service.ts originally shipped with "rather than shipping
 * speculative built-in presets, users compose their own". These reverse that
 * deliberately - but only in the opt-in direction: a template is copied into
 * the user's list on click, never applied implicitly, and is thereafter
 * identical to a self-authored workflow (rename, edit, delete freely).
 *
 * New templates are derived from beta-provided role task lists (see commit
 * history); add one by mapping its tasks onto real menu destinations - the
 * guard test rejects any step that does not resolve.
 *
 * Every item href/label must match the menu registry (tests/workflow-templates.test.ts
 * enforces this) or the sidebar resolver in src/lib/workspace-workflow.ts would
 * silently drop the step from the Workspace group.
 */

export interface WorkflowTemplate {
    /** Display name - becomes the workflow's name (user-editable afterwards). */
    name: string;
    /** One-line description for the dropdown menu. */
    blurb: string;
    items: WorkflowItem[];
}

const item = (href: string, label: string): WorkflowItem => ({
    // Same id convention as palette-added steps (see menuItemToChip on the page).
    id: `menu-${href}`,
    href,
    label,
});

/**
 * NOTE: /inquiries carries adminOnly in the menu registry (the destination
 * palette skips admin-only entries). It is kept as the first step of the
 * legal templates (Lawyer, Paralegal) because intake leads the legal
 * day-to-day list and beta accounts are firm owners (admins); for non-admin
 * users it is the one step that may be guarded.
 */
export const WORKFLOW_TEMPLATES: readonly WorkflowTemplate[] = [
    {
        name: 'Accountant',
        blurb: 'Day-to-day bookkeeping: receipts, ledger, invoicing and tax.',
        items: [
            item('/accounting/receipt-processor', 'Receipt Intake'),
            item('/accounting/ledgers', 'BKS Ledger'),
            item('/accounting/bank-statements', 'Bank Statements'),
            item('/accounting/invoices/create', 'Create Invoice'),
            item('/accounting/quotes', 'Quote Manager'),
            item('/accounting/tax', 'Tax Center'),
            item('/accounting/financial-snapshot', 'Financial Snapshot'),
            item('/accounting/reports/income-statement', 'Income Statement'),
        ],
    },
    {
        name: 'Lawyer',
        blurb: 'Daily practice: intake, retainers, time, matters and documents.',
        items: [
            item('/inquiries', 'Inquiries'),
            item('/contacts', 'Contacts Hub'),
            item('/accounting/quotes/create', 'Create Quote'),
            item('/reports/time-log', 'Worker Time Log Report'),
            item('/projects/all', 'Projects'),
            item('/calendar', 'Calendar'),
            item('/event-manager', 'Activity Manager'),
            item('/document-manager', 'Document Manager'),
            item('/reports/client-statement', 'Client Statement'),
        ],
    },
    {
        name: 'Consultant',
        blurb: 'Consulting: proposals, milestones, deliverables and retainers.',
        items: [
            item('/accounting/quotes/create', 'Create Quote'),
            item('/projects/all', 'Projects'),
            item('/event-manager', 'Activity Manager'),
            item('/document-manager', 'Document Manager'),
            item('/reports/time-log', 'Worker Time Log Report'),
            item('/accounting/receipt-processor', 'Receipt Intake'),
            item('/reports/client-statement', 'Client Statement'),
            item('/accounting/ledgers', 'BKS Ledger'),
        ],
    },
    {
        name: 'Virtual Assistant',
        blurb: 'Admin support: requests, agendas, follow-ups, receipts and time.',
        items: [
            item('/to-do', 'To-Do List'),
            item('/calendar', 'Calendar'),
            item('/crm/plan', 'CRM Hub'),
            item('/event-manager', 'Activity Manager'),
            item('/accounting/receipt-processor', 'Receipt Intake'),
            item('/accounting/invoices/create', 'Create Invoice'),
            item('/reports/time-log', 'Worker Time Log Report'),
            item('/reports/work-activity', 'Work Activity Summary'),
        ],
    },
    {
        name: 'Paralegal',
        blurb: 'Legal support: intakes, filings, deadlines, time and pre-billing.',
        items: [
            item('/inquiries', 'Inquiries'),
            item('/contacts', 'Contacts Hub'),
            item('/document-manager', 'Document Manager'),
            item('/event-manager', 'Activity Manager'),
            item('/reports/time-log', 'Worker Time Log Report'),
            item('/accounting/receipt-processor', 'Receipt Intake'),
            item('/reports/client-statement', 'Client Statement'),
            item('/accounting/ledgers', 'BKS Ledger'),
        ],
    },
    {
        name: 'Field Contractor',
        blurb: 'Trades: work orders, crew scheduling, field time and job invoicing.',
        items: [
            item('/accounting/work-orders', 'Work Orders'),
            item('/accounting/quotes/create', 'Create Quote'),
            item('/calendar', 'Calendar'),
            item('/event-manager', 'Activity Manager'),
            item('/reports/time-log', 'Worker Time Log Report'),
            item('/accounting/receipt-processor', 'Receipt Intake'),
            item('/accounting/invoices/create', 'Create Invoice'),
            item('/accounting/ledgers', 'BKS Ledger'),
        ],
    },
    {
        name: 'Marketing Agency',
        blurb: 'Agency work: scopes, campaigns, assets, ad spend and retainers.',
        items: [
            item('/accounting/quotes/create', 'Create Quote'),
            item('/projects/all', 'Projects'),
            item('/event-manager', 'Activity Manager'),
            item('/document-manager', 'Document Manager'),
            item('/accounting/receipt-processor', 'Receipt Intake'),
            item('/accounting/invoices/create', 'Create Invoice'),
            item('/reports/client-statement', 'Client Statement'),
            item('/accounting/ledgers', 'BKS Ledger'),
        ],
    },
    {
        name: 'Property Manager',
        blurb: 'Properties: tenants, work orders, rent billing and owner statements.',
        items: [
            item('/contacts', 'Contacts Hub'),
            item('/accounting/quotes/create', 'Create Quote'),
            item('/accounting/work-orders', 'Work Orders'),
            item('/event-manager', 'Activity Manager'),
            item('/calendar', 'Calendar'),
            item('/accounting/invoices/create', 'Create Invoice'),
            item('/accounting/accounts-receivable', 'Accounts Receivable'),
            item('/accounting/receipt-processor', 'Receipt Intake'),
            item('/reports/client-statement', 'Client Statement'),
        ],
    },
    {
        name: 'IT & MSP',
        blurb: 'IT services: tickets, proposals, time tracking and retainer billing.',
        items: [
            item('/to-do', 'To-Do List'),
            item('/event-manager', 'Activity Manager'),
            item('/contacts', 'Contacts Hub'),
            item('/accounting/quotes/create', 'Create Quote'),
            item('/document-manager', 'Document Manager'),
            item('/reports/time-log', 'Worker Time Log Report'),
            item('/reports/client-statement', 'Client Statement'),
            item('/accounting/ledgers', 'BKS Ledger'),
        ],
    },
];

/**
 * Copies a template onto the user's workflow list.
 *
 * - Duplicate guard is by exact name: while "Accountant" exists the template
 *   cannot be added again (re-adding after a rename/delete works - that is
 *   intentional, it lets the user fetch a fresh copy).
 * - The added workflow gets a fresh id from makeWorkflowId and fresh copies of
 *   the items so user edits never mutate the shipped template.
 */
export function applyWorkflowTemplate(
    workflows: readonly Workflow[],
    template: WorkflowTemplate,
    makeWorkflowId: () => string,
): { status: 'added'; workflows: Workflow[] } | { status: 'duplicate'; workflows: readonly Workflow[] } {
    if (workflows.some((w) => w.name === template.name)) {
        return { status: 'duplicate', workflows };
    }
    return {
        status: 'added',
        workflows: [
            ...workflows,
            {
                id: makeWorkflowId(),
                name: template.name,
                items: template.items.map((i) => ({ ...i })),
            },
        ],
    };
}
