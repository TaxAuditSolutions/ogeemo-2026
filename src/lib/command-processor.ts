
/**
 * @fileOverview High-Fidelity Command Processor for Ogeemo.
 * Maps natural language verbs and nouns to structured application actions.
 */

import { allMenuItems } from './menu-items';
import { isContactCreationRequest } from './copilot-routing';

export interface CommandResult {
    type: 'navigation' | 'action' | 'unknown';
    target?: string;
    label?: string;
    message: string;
    assistantMessage?: string;
    description?: string;
    isExternal?: boolean;
    category?: string;
}

/**
 * Normalizes a string for matching by removing non-alphanumeric characters 
 * and converting to lowercase.
 */
function normalize(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Cleans a parameter string by removing filler words from anywhere in the string.
 */
function cleanParam(param: string): string {
    return param
        .replace(/\b(to|a|an|the|new|named|called|for|about|at|with|page|hub|manager|list)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const commandMap: Record<string, { target: string; label: string; category: string }> = {
    // Workspace & Core Hubs
    'actionmanager': { target: '/action-manager', label: 'Action Manager', category: 'Workspace' },
    'dashboard': { target: '/action-manager', label: 'Action Manager', category: 'Workspace' },
    'copilot': { target: '/co-pilot', label: 'AI Co-Pilot', category: 'Intelligence' },
    'aidispatch': { target: '/co-pilot', label: 'AI Co-Pilot', category: 'Intelligence' },
    'dispatch': { target: '/co-pilot', label: 'AI Co-Pilot', category: 'Intelligence' },
    'commandcentre': { target: '/co-pilot', label: 'AI Co-Pilot', category: 'Intelligence' },
    'commandcenter': { target: '/co-pilot', label: 'AI Co-Pilot', category: 'Intelligence' },
    'ogeemoai': { target: '/co-pilot', label: 'Ogeemo Co-Pilot', category: 'Intelligence' },
    'mastermind': { target: '/master-mind', label: 'Master Mind', category: 'Workspace' },
    'timemanager': { target: '/master-mind', label: 'Master Mind', category: 'Workspace' },
    'timelog': { target: '/master-mind', label: 'Master Mind', category: 'Workspace' },
    'timesheet': { target: '/master-mind', label: 'Master Mind', category: 'Workspace' },
    'timer': { target: '/master-mind?startTimer=true', label: 'Master Mind Timer', category: 'Workspace' },
    'starttimer': { target: '/master-mind?startTimer=true', label: 'Master Mind Timer', category: 'Workspace' },
    'logtime': { target: '/master-mind?startTimer=true', label: 'Master Mind Timer', category: 'Workspace' },
    'tracktime': { target: '/master-mind?startTimer=true', label: 'Master Mind Timer', category: 'Workspace' },

    // Finances & Accounting
    'accounting': { target: '/accounting', label: 'Accounting Hub', category: 'Finances' },
    'finance': { target: '/accounting', label: 'Accounting Hub', category: 'Finances' },
    'tax': { target: '/accounting/tax', label: 'Tax Center', category: 'Finances' },
    'ledger': { target: '/accounting/ledgers', label: 'General Ledger', category: 'Finances' },
    'generalledger': { target: '/accounting/ledgers', label: 'General Ledger', category: 'Finances' },
    'books': { target: '/accounting/ledgers', label: 'General Ledger', category: 'Finances' },
    'income': { target: '/accounting/ledgers?tab=income', label: 'Income Ledger', category: 'Finances' },
    'incomegledger': { target: '/accounting/ledgers?tab=income', label: 'Income Ledger', category: 'Finances' },
    'incomeledger': { target: '/accounting/ledgers?tab=income', label: 'Income Ledger', category: 'Finances' },
    'expense': { target: '/accounting/ledgers?tab=expenses', label: 'Expense Ledger', category: 'Finances' },
    'expenseledger': { target: '/accounting/ledgers?tab=expenses', label: 'Expense Ledger', category: 'Finances' },
    'payroll': { target: '/accounting/payroll/run', label: 'Payroll', category: 'HR' },
    'invoice': { target: '/accounting/invoices/create', label: 'Invoicing', category: 'Finances' },
    'newinvoice': { target: '/accounting/invoices/create', label: 'Invoicing', category: 'Finances' },
    'createinvoice': { target: '/accounting/invoices/create', label: 'Invoicing', category: 'Finances' },
    'invoices': { target: '/accounting/accounts-receivable', label: 'Invoice List', category: 'Finances' },
    'ar': { target: '/accounting/accounts-receivable', label: 'Accounts Receivable', category: 'Finances' },
    'ap': { target: '/accounting/accounts-payable', label: 'Accounts Payable', category: 'Finances' },
    'snapshot': { target: '/accounting/financial-snapshot', label: 'Financial Snapshot', category: 'Finances' },
    'inventory': { target: '/inventory-manager/track', label: 'Inventory', category: 'Operations' },
    'pettycash': { target: '/accounting/petty-cash', label: 'Petty Cash', category: 'Finances' },
    'cashaccounting': { target: '/accounting/petty-cash', label: 'Petty Cash', category: 'Finances' },

    // Relationships
    'contact': { target: '/contacts', label: 'Contacts Hub', category: 'Relationships' },
    'contacts': { target: '/contacts', label: 'Contacts Hub', category: 'Relationships' },
    'contactlist': { target: '/contacts', label: 'Contacts Hub', category: 'Relationships' },
    'clients': { target: '/contacts', label: 'Clients', category: 'Relationships' },
    'clientlist': { target: '/contacts', label: 'Clients', category: 'Relationships' },
    'directory': { target: '/contacts', label: 'Contacts Hub', category: 'Relationships' },
    'people': { target: '/contacts', label: 'Contacts Hub', category: 'Relationships' },
    'workers': { target: '/contacts', label: 'Workers', category: 'HR' },
    'crm': { target: '/crm/plan', label: 'CRM Hub', category: 'Relationships' },
    'leads': { target: '/crm/plan', label: 'Leads', category: 'Relationships' },

    // Projects & Tasks
    'projects': { target: '/projects/all', label: 'Project List', category: 'Operations' },
    'projectlist': { target: '/projects/all', label: 'Project List', category: 'Operations' },
    'board': { target: '/project-status', label: 'Project Board', category: 'Operations' },
    'todo': { target: '/to-do', label: 'To-Do List', category: 'Workspace' },
    'todolist': { target: '/to-do', label: 'To-Do List', category: 'Workspace' },
    'tasks': { target: '/to-do', label: 'Tasks', category: 'Workspace' },
    'tasklist': { target: '/to-do', label: 'Tasks', category: 'Workspace' },
    'calendar': { target: '/calendar', label: 'Calendar', category: 'Workspace' },

    // Administration
    'backup': { target: '/backup', label: 'Backups', category: 'Administration' },
    'backups': { target: '/backup', label: 'Backups', category: 'Administration' },
    'export': { target: '/backup', label: 'Backups', category: 'Administration' },
    'settings': { target: '/settings', label: 'Settings', category: 'Administration' },
};

/** Shortest alias length allowed to match a token prefix or an unseparated phrase. */
const MIN_PREFIX_ALIAS_LENGTH = 3;
const MIN_EMBEDDED_ALIAS_LENGTH = 4;
const MAX_PHRASE_TOKENS = 3;

function tokenize(text: string): string[] {
    return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Collects each token plus the concatenation of up to three adjacent tokens so
 * multi-word destinations like "general ledger" still resolve to their alias.
 */
function collectPhrases(tokens: string[]): Set<string> {
    const phrases = new Set<string>();

    for (let start = 0; start < tokens.length; start += 1) {
        let joined = '';
        for (let end = start; end < Math.min(start + MAX_PHRASE_TOKENS, tokens.length); end += 1) {
            joined += normalize(tokens[end]);
            if (joined) phrases.add(joined);
        }
    }

    return phrases;
}

function findExactOrAliasCommand(text: string): { target: string; label: string; category: string } | undefined {
    const normalizedText = normalize(text);
    if (!normalizedText) return undefined;

    if (commandMap[normalizedText]) return commandMap[normalizedText];

    const tokens = tokenize(text);
    const phrases = collectPhrases(tokens);

    const matchingEntries = Object.entries(commandMap)
        .filter(([key]) => {
            if (phrases.has(key)) return true;
            if (key.length >= MIN_PREFIX_ALIAS_LENGTH && tokens.some((token) => token.startsWith(key))) return true;
            return key.length >= MIN_EMBEDDED_ALIAS_LENGTH && normalizedText.includes(key);
        })
        .sort((a, b) => b[0].length - a[0].length);

    return matchingEntries[0]?.[1];
}

/**
 * Detects whether the input is phrased as an information-seeking question
 * (e.g., "How do you create a contact?") rather than a direct action request
 * (e.g., "Create a contact"). Questions must be answered by the Co-Pilot,
 * never hijacked into navigation.
 */
const QUESTION_PATTERNS = [
    /\?$/,
    /\bhow\s+(to|do|does|did|can|could|should|would|might|i|you|we)\b/i,
    /\b(what|where|why|when|who)\s+(is|are|was|were|do|does|did|should|can|would)\b/i,
    /^(explain|describe|tell\s+me)\b/i,
];

export function isQuestion(input: string): boolean {
    const text = (input || '').trim();
    if (!text) return false;
    return QUESTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Processes natural language input through hierarchical intent matching.
 */
export function processCommand(input: string): CommandResult {
    const rawInput = input.toLowerCase().trim();
    if (!rawInput) return { type: 'unknown', message: 'Awaiting Signal...' };

    // Questions are never commands: route them to the Co-Pilot for an answer.
    if (isQuestion(rawInput)) {
        return {
            type: 'unknown',
            message: 'Question Detected',
            description: 'Routing to Ogeemo Co-Pilot for an answer.',
        };
    }

    const normalizedInput = normalize(rawInput);
    const tokens = rawInput.split(/\s+/).filter(Boolean);
    const verb = tokens[0];
    const remaining = tokens.slice(1).join(' ');

    // Creation and scheduling: "Create", "Make", "New", "Add", "Do", "Schedule", "Book", "Plan"
    // Keep this before generic route alias matching so phrase-based actions like
    // "new contact for Acme" resolve to the correct create flow instead of the
    // broader "Contacts Hub" destination.
    if (['create', 'make', 'new', 'add', 'do', 'schedule', 'book', 'plan'].includes(verb) && remaining) {
        const param = cleanParam(remaining);
        const normalizedParam = normalize(param);

        if (normalizedParam.includes('contact')) {
            return {
                type: 'unknown',
                message: 'Contact Assistance',
                description: 'Routing contact creation to Ogeemo Co-Pilot.',
            };
        }

        if (normalizedParam.includes('project')) {
            const name = cleanParam(param.replace(/project/i, ''));
            return {
                type: 'action',
                target: `/projects/create${name ? `?title=${encodeURIComponent(name)}` : ''}`,
                label: 'Project Planner',
                message: 'Action: [Start Project]',
                description: name ? `Project "${name}" is ready to plan.` : 'Project planner is ready.',
                category: 'Operations',
            };
        }

        if (normalizedParam.includes('meeting') || normalizedParam.includes('call') || normalizedParam.includes('appointment')) {
            const name = cleanParam(param.replace(/(meeting|call|appointment)/gi, ''));
            const title = name ? `Meeting ${name}`.trim() : 'New meeting';
            return {
                type: 'action',
                target: `/master-mind?title=${encodeURIComponent(title)}`,
                label: 'Meeting Scheduler',
                message: 'Action: [Schedule Meeting]',
                description: name ? `A meeting with "${name}" is ready to schedule.` : 'Scheduling flow is ready.',
                category: 'Workspace',
            };
        }

        if (normalizedParam.includes('quote')) {
            return {
                type: 'action',
                target: '/accounting/quotes/create',
                label: 'Quote Generator',
                message: 'Action: [New Quote]',
                description: 'Quote generator is ready.',
                category: 'Finances',
            };
        }

        if (normalizedParam.includes('invoice')) {
            const invoiceName = cleanParam(param.replace(/invoice/i, ''));
            const customerName = invoiceName ? `&contactName=${encodeURIComponent(invoiceName)}` : '';
            return {
                type: 'action',
                target: `/accounting/invoices/create?${customerName ? 'contactName=' + encodeURIComponent(invoiceName) : ''}`,
                label: 'Invoice Generator',
                message: 'Action: [New Invoice]',
                description: invoiceName ? `An invoice for "${invoiceName}" is ready to prepare.` : 'Invoice generator is ready.',
                category: 'Finances',
            };
        }

        if (normalizedParam.match(/(task|event|reminder)/)) {
            const title = cleanParam(param.replace(/(task|event|reminder)/gi, ''));
            return {
                type: 'action',
                target: `/master-mind${title ? `?title=${encodeURIComponent(title)}` : ''}`,
                label: 'Master Mind',
                message: 'Action: [Schedule Entry]',
                description: title ? `"${title}" is ready to add to the timeline.` : 'Scheduler is ready.',
                category: 'Workspace',
            };
        }

        if (normalizedParam.includes('backup')) {
            return {
                type: 'navigation',
                target: '/backup',
                label: 'Backup Manager',
                message: 'Action: [Backup Manager]',
                description: 'Backup and data protection tools are ready.',
                category: 'Administration',
            };
        }
    }

    // Navigation: "Go", "Open", "Show", "View", "Launch"
    if (['go', 'open', 'show', 'view', 'launch', 'navigate', 'goto'].includes(verb) && remaining) {
        const cleaned = cleanParam(remaining);
        const searchTarget = normalize(cleaned);

        // Contact-creation requests route to the Co-Pilot conversation (which
        // auto-opens the prepared form), never to a plain hub navigation.
        if (isContactCreationRequest(rawInput)) {
            return {
                type: 'unknown',
                message: 'Contact Assistance',
                description: 'Routing contact creation to Ogeemo Co-Pilot.',
            };
        }

        const routeMatch = findExactOrAliasCommand(searchTarget) || findExactOrAliasCommand(cleaned);
        if (routeMatch) {
            return {
                type: 'navigation',
                target: routeMatch.target,
                label: routeMatch.label,
                message: `Ready: [Open ${routeMatch.label}]`,
                description: 'Your requested hub is ready.',
                category: routeMatch.category,
            };
        }

        if (/(income|expense)\s*ledger/.test(cleaned)) {
            const isIncome = /income/.test(cleaned);
            return {
                type: 'navigation',
                target: `/accounting/ledgers?tab=${isIncome ? 'income' : 'expenses'}`,
                label: `${isIncome ? 'Income' : 'Expense'} Ledger`,
                message: `Ready: [Open ${isIncome ? 'Income' : 'Expense'} Ledger]`,
                description: `The ${isIncome ? 'income' : 'expense'} ledger view is ready.`,
                category: 'Finances',
            };
        }

        const menuMatch = allMenuItems.find(item => {
            const label = normalize(item.label);
            return label === searchTarget || label.includes(searchTarget) || searchTarget.includes(label);
        });
        if (menuMatch) {
            return {
                type: 'navigation',
                target: menuMatch.href,
                label: menuMatch.label,
                message: `Ready: [Open ${menuMatch.label}]`,
                description: 'Target found in application menu.',
                category: 'Navigation',
            };
        }
    }

    /* 
    // Search: "Find", "Search", "Lookup"
    if (['find', 'search', 'lookup'].includes(verb) && remaining) {
        const query = cleanParam(remaining);
        return {
            type: 'navigation',
            target: `/reports/search?q=${encodeURIComponent(query)}`,
            message: `Search: [${query}]`,
            description: `Searching the global database for "${query}".`,
            category: 'Intelligence'
        };
    }
    */

    // Live State: "Track", "Time", "Start", "Log"
    if (['track', 'time', 'start', 'log', 'begin'].includes(verb) && remaining) {
        const target = cleanParam(remaining);
        const isTimerIntent = /timer|time|session|work|task|entry|log/i.test(target) || target.length === 0;
        if (isTimerIntent) {
            const derivedTitle = cleanParam(
                target
                    .replace(/\b(timer|time|session|work|task|entry|log|start|begin|track)\b/gi, '')
                    .replace(/\b(for|about|on|with)\b/gi, '')
            );
            const titleTarget = derivedTitle ? `&title=${encodeURIComponent(derivedTitle)}` : '';
            return {
                type: 'action',
                target: `/master-mind?startTimer=true${titleTarget}`,
                label: 'Master Mind Timer',
                message: `Timer: [${derivedTitle || target || 'Start timer'}]`,
                description: derivedTitle ? `A timer for "${derivedTitle}" is ready to start.` : 'A live recording session is ready to start.',
                category: 'Operations',
            };
        }
    }

    if (/\b(assist|help)\b.*\b(creat(?:e|ing)|add(?:ing)?)\b.*\bcontact\b/i.test(rawInput)) {
        return {
            type: 'navigation',
            target: '/contacts',
            label: 'Contacts Hub',
            message: 'Ready: [Contacts Hub]',
            assistantMessage: "You can create a new contact in Contacts Hub. Click 'Contacts Hub' below to open it.",
            description: 'Contacts Hub is ready.',
            category: 'Relationships',
        };
    }

    const directCmd = findExactOrAliasCommand(rawInput);
    if (directCmd) {
        return {
            type: 'navigation',
            target: directCmd.target,
            label: directCmd.label,
            message: `Dispatch: [${directCmd.label}]`,
            description: `${directCmd.label} is ready to open.`,
            category: directCmd.category,
        };
    }

    const menuItemMatch = allMenuItems.find(item =>
        normalize(item.label) === normalizedInput ||
        (normalizedInput.length > 3 && normalize(item.label).includes(normalizedInput))
    );
    if (menuItemMatch) {
        return {
            type: 'navigation',
            target: menuItemMatch.href,
            label: menuItemMatch.label,
            message: `Dispatch: [${menuItemMatch.label}]`,
            description: 'Match found in application registry.',
            category: 'Navigation',
        };
    }

    return {
        type: 'unknown',
        message: 'Command Not Recognized',
        description: 'Try: "Go to Ledger", "New Contact", or "Track Meeting".',
    };
}
