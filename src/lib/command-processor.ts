/**
 * @fileOverview High-Fidelity Command Processor for Ogeemo.
 * Maps natural language verbs and nouns to structured application actions.
 */

import { allMenuItems } from './menu-items';

export interface CommandResult {
    type: 'navigation' | 'action' | 'unknown';
    target?: string;
    message: string;
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
        .replace(/\b(to|a|an|the|new|named|called|for|about|at|with|page|hub|manager)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const commandMap: Record<string, { target: string; label: string; category: string }> = {
    // Workspace & Core Hubs
    'actionmanager': { target: '/action-manager', label: 'Action Manager', category: 'Workspace' },
    'dashboard': { target: '/action-manager', label: 'Action Manager', category: 'Workspace' },
    'commandcentre': { target: '/command-centre', label: 'Command Centre', category: 'Intelligence' },
    'commandcenter': { target: '/command-centre', label: 'Command Centre', category: 'Intelligence' },
    'ogeemoai': { target: '/command-centre', label: 'Ogeemo AI', category: 'Intelligence' },
    'mastermind': { target: '/master-mind', label: 'Master Mind', category: 'Workspace' },
    'timemanager': { target: '/master-mind', label: 'Master Mind', category: 'Workspace' },
    'timelog': { target: '/master-mind', label: 'Master Mind', category: 'Workspace' },
    'timesheet': { target: '/master-mind', label: 'Master Mind', category: 'Workspace' },
    
    // Finances & Accounting
    'accounting': { target: '/accounting', label: 'Accounting Hub', category: 'Finances' },
    'finance': { target: '/accounting', label: 'Accounting Hub', category: 'Finances' },
    'tax': { target: '/accounting/tax', label: 'Tax Center', category: 'Finances' },
    'ledger': { target: '/accounting/ledgers', label: 'General Ledger', category: 'Finances' },
    'income': { target: '/accounting/ledgers?tab=income', label: 'Income Ledger', category: 'Finances' },
    'expense': { target: '/accounting/ledgers?tab=expenses', label: 'Expense Ledger', category: 'Finances' },
    'payroll': { target: '/accounting/payroll/run', label: 'Payroll', category: 'HR' },
    'invoice': { target: '/accounting/invoices/create', label: 'Invoicing', category: 'Finances' },
    'invoices': { target: '/accounting/accounts-receivable', label: 'Invoice List', category: 'Finances' },
    'ar': { target: '/accounting/accounts-receivable', label: 'Accounts Receivable', category: 'Finances' },
    'ap': { target: '/accounting/accounts-payable', label: 'Accounts Payable', category: 'Finances' },
    'snapshot': { target: '/accounting/financial-snapshot', label: 'Financial Snapshot', category: 'Finances' },
    'inventory': { target: '/inventory-manager/track', label: 'Inventory', category: 'Operations' },
    
    // Relationships
    'contacts': { target: '/contacts', label: 'Contacts Hub', category: 'Relationships' },
    'clients': { target: '/contacts', label: 'Clients', category: 'Relationships' },
    'workers': { target: '/contacts', label: 'Workers', category: 'HR' },
    'crm': { target: '/crm/plan', label: 'CRM Hub', category: 'Relationships' },
    'leads': { target: '/crm/plan', label: 'Leads', category: 'Relationships' },
    
    // Projects & Tasks
    'projects': { target: '/projects/all', label: 'Project List', category: 'Operations' },
    'board': { target: '/project-status', label: 'Project Board', category: 'Operations' },
    'todo': { target: '/to-do', label: 'To-Do List', category: 'Workspace' },
    'tasks': { target: '/to-do', label: 'Tasks', category: 'Workspace' },
    'calendar': { target: '/calendar', label: 'Calendar', category: 'Workspace' },

    // Administration
    'backup': { target: '/backup', label: 'Backups', category: 'Administration' },
    'backups': { target: '/backup', label: 'Backups', category: 'Administration' },
    'export': { target: '/backup', label: 'Backups', category: 'Administration' },
    'settings': { target: '/settings', label: 'Settings', category: 'Administration' },
};

/**
 * Processes natural language input through hierarchical intent matching.
 */
export function processCommand(input: string): CommandResult {
    const rawInput = input.toLowerCase().trim();
    if (!rawInput) return { type: 'unknown', message: 'Awaiting Signal...' };

    const normalizedInput = normalize(rawInput);
    const tokens = rawInput.split(/\s+/).filter(Boolean);
    const verb = tokens[0];
    const remaining = tokens.slice(1).join(' ');

    // 1. EXACT INTENT MATCH
    if (commandMap[normalizedInput]) {
        const cmd = commandMap[normalizedInput];
        return {
            type: 'navigation',
            target: cmd.target,
            message: `Launcher: [${cmd.label}]`,
            description: `Navigating directly to ${cmd.label}.`,
            category: cmd.category
        };
    }

    // 2. VERB-BASED ACTION INTERPRETATION
    
    // Navigation: "Go", "Open", "Show", "View"
    if (['go', 'open', 'show', 'view'].includes(verb) && remaining) {
        const cleaned = cleanParam(remaining);
        const searchTarget = normalize(cleaned);
        
        // Search command map first
        if (commandMap[searchTarget]) {
            const cmd = commandMap[searchTarget];
            return {
                type: 'navigation',
                target: cmd.target,
                message: `Executing: [Open ${cmd.label}]`,
                description: `Routing to requested hub.`,
                category: cmd.category
            };
        }

        // Search menu items
        const menuMatch = allMenuItems.find(item => normalize(item.label).includes(searchTarget));
        if (menuMatch) {
            return {
                type: 'navigation',
                target: menuMatch.href,
                message: `Executing: [Open ${menuMatch.label}]`,
                description: `Target found in application menu.`,
                category: 'Navigation'
            };
        }
    }

    // Creation: "Create", "Make", "New", "Add", "Do"
    if (['create', 'make', 'new', 'add', 'do'].includes(verb) && remaining) {
        const param = cleanParam(remaining);
        const normalizedParam = normalize(param);

        if (normalizedParam.includes('contact')) {
            const name = cleanParam(param.replace(/contact/i, ''));
            return {
                type: 'action',
                target: `/contacts?action=new${name ? `&name=${encodeURIComponent(name)}` : ''}`,
                message: 'Action: [Create Contact]',
                description: name ? `Starting record for "${name}".` : "Opening contact creator.",
                category: 'Relationships'
            };
        }

        if (normalizedParam.includes('project')) {
            const name = cleanParam(param.replace(/project/i, ''));
            return {
                type: 'action',
                target: `/projects/create${name ? `?title=${encodeURIComponent(name)}` : ''}`,
                message: 'Action: [Start Project]',
                description: name ? `Planning project "${name}".` : "Opening project planner.",
                category: 'Operations'
            };
        }

        if (normalizedParam.includes('invoice')) {
            return {
                type: 'action',
                target: '/accounting/invoices/create',
                message: 'Action: [New Invoice]',
                description: "Opening invoice generator.",
                category: 'Finances'
            };
        }

        if (normalizedParam.match(/(task|event|reminder)/)) {
            const title = cleanParam(param.replace(/(task|event|reminder)/gi, ''));
            return {
                type: 'action',
                target: `/master-mind${title ? `?title=${encodeURIComponent(title)}` : ''}`,
                message: 'Action: [Schedule Entry]',
                description: title ? `Adding "${title}" to timeline.` : "Opening scheduler.",
                category: 'Workspace'
            };
        }

        if (normalizedParam.includes('backup')) {
            return {
                type: 'navigation',
                target: '/backup',
                message: 'Action: [Backup Manager]',
                description: "Opening backup and data protection tools.",
                category: 'Administration'
            };
        }
    }

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

    // Live State: "Track", "Time", "Start"
    if (['track', 'time', 'start'].includes(verb) && remaining) {
        const target = cleanParam(remaining);
        return {
            type: 'action',
            target: `/master-mind?title=${encodeURIComponent(target)}&startTimer=true`,
            message: `Timer: [${target}]`,
            description: `Starting a live recording session.`,
            category: 'Operations'
        };
    }

    // 3. GLOBAL MENU SEARCH (Fallback)
    const menuItemMatch = allMenuItems.find(item => 
        normalize(item.label) === normalizedInput || 
        (normalizedInput.length > 3 && normalize(item.label).includes(normalizedInput))
    );
    if (menuItemMatch) {
        return {
            type: 'navigation',
            target: menuItemMatch.href,
            message: `Launcher: [${menuItemMatch.label}]`,
            description: `Match found in application registry.`,
            category: 'Navigation'
        };
    }

    return {
        type: 'unknown',
        message: 'Command Not Recognized',
        description: 'Try: "Go to Ledger", "New Contact", or "Track Meeting".',
    };
}
