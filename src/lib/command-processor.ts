/**
 * @fileOverview Enhanced Deterministic Command Processor for Ogeemo.
 * Maps natural language keywords, verbs, and parameters to structured application actions.
 */

export interface CommandResult {
    type: 'navigation' | 'action' | 'unknown';
    target?: string;
    message: string;
    description?: string;
    isExternal?: boolean;
    category?: string;
}

const commandMap: Record<string, { target: string; label: string; category: string }> = {
    'accounting': { target: '/accounting', label: 'Accounting Hub', category: 'Finances' },
    'account': { target: '/accounting', label: 'Accounting Hub', category: 'Finances' },
    'finance': { target: '/accounting', label: 'Accounting Hub', category: 'Finances' },
    'money': { target: '/accounting', label: 'Accounting Hub', category: 'Finances' },
    'tax': { target: '/accounting/tax', label: 'Tax Center', category: 'Compliance' },
    'ledger': { target: '/accounting/ledgers', label: 'General Ledger', category: 'Finances' },
    'income': { target: '/accounting/ledgers?tab=income', label: 'Income Ledger', category: 'Finances' },
    'expense': { target: '/accounting/ledgers?tab=expenses', label: 'Expense Ledger', category: 'Finances' },
    'bks': { target: '/accounting/ledgers', label: 'BKS Ledger', category: 'Finances' },
    'payroll': { target: '/accounting/payroll/run', label: 'Payroll Manager', category: 'HR' },
    'ar': { target: '/accounting/accounts-receivable', label: 'Accounts Receivable', category: 'Finances' },
    'ap': { target: '/accounting/accounts-payable', label: 'Accounts Payable', category: 'Finances' },
    'receivable': { target: '/accounting/accounts-receivable', label: 'Accounts Receivable', category: 'Finances' },
    'payable': { target: '/accounting/accounts-payable', label: 'Accounts Payable', category: 'Finances' },
    'invoice': { target: '/accounting/invoices/create', label: 'Invoice Generator', category: 'Finances' },
    'invoices': { target: '/accounting/accounts-receivable', label: 'Invoice Registry', category: 'Finances' },
    
    'contact': { target: '/contacts', label: 'Contacts Hub', category: 'Relationships' },
    'contacts': { target: '/contacts', label: 'Contacts Hub', category: 'Relationships' },
    'client': { target: '/contacts', label: 'Client Directory', category: 'Relationships' },
    'clients': { target: '/contacts', label: 'Client Directory', category: 'Relationships' },
    'worker': { target: '/contacts', label: 'Worker Directory', category: 'HR' },
    'workers': { target: '/contacts', label: 'Worker Directory', category: 'HR' },
    'crm': { target: '/crm/plan', label: 'CRM Pipeline', category: 'Relationships' },
    'pipeline': { target: '/crm/plan', label: 'CRM Pipeline', category: 'Relationships' },
    
    'project': { target: '/projects/all', label: 'Project List', category: 'Operations' },
    'projects': { target: '/projects/all', label: 'Project List', category: 'Operations' },
    'board': { target: '/project-status', label: 'Project Status Board', category: 'Operations' },
    'status': { target: '/project-status', label: 'Project Status Board', category: 'Operations' },
    
    'calendar': { target: '/calendar', label: 'Calendar', category: 'Workspace' },
    'schedule': { target: '/calendar', label: 'Calendar', category: 'Workspace' },
    'event': { target: '/calendar', label: 'Calendar', category: 'Workspace' },
    
    'inventory': { target: '/inventory-manager/track', label: 'Inventory Central', category: 'Growth' },
    'stock': { target: '/inventory-manager/track', label: 'Inventory Central', category: 'Growth' },
    'pos': { target: '/inventory-manager/pos', label: 'Point of Sale', category: 'Growth' },
    
    'marketing': { target: '/marketing-manager', label: 'Marketing Manager', category: 'Growth' },
    'hytexercise': { target: '/hytexercise', label: 'Wellness Manager', category: 'Operations' },
    'wellness': { target: '/hytexercise', label: 'Wellness Manager', category: 'Operations' },
    'settings': { target: '/settings', label: 'Settings', category: 'Admin' },
    'profile': { target: '/settings', label: 'My Profile', category: 'Admin' },
    'hub': { target: '/action-manager', label: 'Action Manager', category: 'Workspace' },
    'dashboard': { target: '/action-manager', label: 'Action Manager', category: 'Workspace' },
    'search': { target: '/reports/search', label: 'Advanced Search', category: 'Reports' },
    'reports': { target: '/reports/search', label: 'Advanced Search', category: 'Reports' },
    'help': { target: '/master-mind/gtd-instructions', label: 'Ogeemo Method', category: 'Admin' },
    'drive': { target: 'https://drive.google.com', label: 'Google Drive', category: 'External' },
    'gmail': { target: 'https://mail.google.com', label: 'Google Mail', category: 'External' },
};

export function processCommand(input: string): CommandResult {
    const cleanInput = input.toLowerCase().trim();
    if (!cleanInput) return { type: 'unknown', message: 'Awaiting Input...' };

    const parts = cleanInput.split(/\s+/);
    const verb = parts[0];
    const remainingRaw = parts.slice(1).join(' ');
    
    // Remove filler words for better extraction (e.g., "for", "named", "called", "to")
    const remaining = remainingRaw
        .replace(/^(for|named|called|to)\s+/i, '')
        .trim();

    // 1. Direct Keyword Match (Strict)
    if (commandMap[cleanInput]) {
        const cmd = commandMap[cleanInput];
        return {
            type: 'navigation',
            target: cmd.target,
            isExternal: cmd.target.startsWith('http'),
            message: `Launcher: [${cmd.label}]`,
            description: `Navigating to ${cmd.label} in ${cmd.category}.`,
            category: cmd.category
        };
    }

    // 2. Verb: "Go"
    if (verb === 'go' && remaining) {
        const searchTarget = remaining.startsWith('to ') ? remaining.replace('to ', '') : remaining;
        const cmd = commandMap[searchTarget];
        if (cmd) {
            return {
                type: 'navigation',
                target: cmd.target,
                isExternal: cmd.target.startsWith('http'),
                message: `Navigating: [${cmd.label}]`,
                description: `Executing direct launch to ${cmd.label}.`,
                category: cmd.category
            };
        }
    }

    // 3. Verb: "New"
    if (verb === 'new' && remaining) {
        if (remaining.includes('contact')) {
            const name = remaining.replace('contact', '').replace(/^(named|called)\s+/i, '').trim();
            return {
                type: 'navigation',
                target: `/contacts?action=new${name ? `&name=${encodeURIComponent(name)}` : ''}`,
                message: `Action: [New Contact]`,
                description: name ? `Preparing record for "${name}".` : "Opening the contact creator.",
                category: 'Relationships'
            };
        }
        if (remaining.includes('project')) {
            const name = remaining.replace('project', '').replace(/^(named|called|for)\s+/i, '').trim();
            return {
                type: 'navigation',
                target: `/projects/create${name ? `?title=${encodeURIComponent(name)}` : ''}`,
                message: `Action: [New Project]`,
                description: name ? `Initializing plan for "${name}".` : "Opening the project planner.",
                category: 'Operations'
            };
        }
        if (remaining.includes('invoice')) {
            return {
                type: 'navigation',
                target: '/accounting/invoices/create',
                message: 'Action: [New Invoice]',
                description: "Preparing to bill a client.",
                category: 'Finances'
            };
        }
        if (remaining.includes('task') || remaining.includes('event') || remaining.includes('reminder')) {
            const title = remaining.replace(/(task|event|reminder)/g, '').replace(/^(named|called|for)\s+/i, '').trim();
            return {
                type: 'navigation',
                target: `/master-mind${title ? `?title=${encodeURIComponent(title)}` : ''}`,
                message: `Action: [New Entry]`,
                description: title ? `Adding "${title}" to your timeline.` : "Opening the scheduler.",
                category: 'Workspace'
            };
        }
    }

    // 4. Verb: "Track"
    if (verb === 'track' && remaining) {
        return {
            type: 'navigation',
            target: `/master-mind?title=${encodeURIComponent(remaining)}&startTimer=true`,
            message: `Timer: [${remaining}]`,
            description: `Initializing live session for "${remaining}".`,
            category: 'Workspace'
        };
    }

    // 5. Fuzzy Match (Fallback)
    const fuzzyMatchKey = Object.keys(commandMap).find(key => cleanInput.includes(key));
    if (fuzzyMatchKey) {
        const cmd = commandMap[fuzzyMatchKey];
        return {
            type: 'navigation',
            target: cmd.target,
            isExternal: cmd.target.startsWith('http'),
            message: `Detected Intent: ${cmd.label}`,
            description: `We've matched your input to ${cmd.label}.`,
            category: cmd.category
        };
    }

    return {
        type: 'unknown',
        message: `Command Not Recognized`,
        description: "Try keywords like 'Ledger', 'Contacts', or 'New project'.",
    };
}
