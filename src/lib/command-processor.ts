/**
 * @fileOverview Enhanced Deterministic Command Processor for Ogeemo.
 * Maps natural language keywords, verbs, and parameters to structured application actions.
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

const commandMap: Record<string, { target: string; label: string; category: string }> = {
    // Workspace & Core Hubs
    'action manager': { target: '/action-manager', label: 'Action Manager', category: 'Workspace' },
    'action-manager': { target: '/action-manager', label: 'Action Manager', category: 'Workspace' },
    'hub': { target: '/action-manager', label: 'Action Manager', category: 'Workspace' },
    'dashboard': { target: '/action-manager', label: 'Action Manager', category: 'Workspace' },
    'command centre': { target: '/master-mind', label: 'Command Centre', category: 'Workspace' },
    'command center': { target: '/master-mind', label: 'Command Centre', category: 'Workspace' },
    'master mind': { target: '/master-mind', label: 'Command Centre', category: 'Workspace' },
    
    // Finances & Accounting
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
    'statement': { target: '/reports/client-statement', label: 'Client Statement', category: 'Reports' },
    'snapshot': { target: '/accounting/financial-snapshot', label: 'Financial Snapshot', category: 'Finances' },
    'loan': { target: '/accounting/loan-manager', label: 'Loan Manager', category: 'Finances' },
    
    // Relationships
    'contact': { target: '/contacts', label: 'Contacts Hub', category: 'Relationships' },
    'contacts': { target: '/contacts', label: 'Contacts Hub', category: 'Relationships' },
    'client': { target: '/contacts', label: 'Client Directory', category: 'Relationships' },
    'clients': { target: '/contacts', label: 'Client Directory', category: 'Relationships' },
    'worker': { target: '/contacts', label: 'Worker Directory', category: 'HR' },
    'workers': { target: '/contacts', label: 'Worker Directory', category: 'HR' },
    'crm': { target: '/crm/plan', label: 'CRM Pipeline', category: 'Relationships' },
    'pipeline': { target: '/crm/plan', label: 'CRM Pipeline', category: 'Relationships' },
    'leads': { target: '/crm/plan', label: 'Leads', category: 'Relationships' },
    'prospects': { target: '/crm/plan', label: 'Prospects', category: 'Relationships' },
    
    // Projects & Tasks
    'project': { target: '/projects/all', label: 'Project List', category: 'Operations' },
    'projects': { target: '/projects/all', label: 'Project List', category: 'Operations' },
    'board': { target: '/project-status', label: 'Project Status Board', category: 'Operations' },
    'status': { target: '/project-status', label: 'Project Status Board', category: 'Operations' },
    'tasks': { target: '/to-do', label: 'Task List', category: 'Operations' },
    'todo': { target: '/to-do', label: 'To-Do List', category: 'Operations' },
    'inbox': { target: '/projects/inbox/tasks', label: 'Inbox', category: 'Workspace' },
    
    // Workspace & Utils
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
    'images': { target: '/image-manager', label: 'Image Manager', category: 'Admin' },
    'search': { target: '/reports/search', label: 'Global Search', category: 'Reports' },
    'reports': { target: '/reports/search', label: 'Advanced Search', category: 'Reports' },
    'help': { target: '/master-mind/gtd-instructions', label: 'Ogeemo Method', category: 'Admin' },
    'backup': { target: '/backup', label: 'Backup Manager', category: 'Admin' },
    'feedback': { target: '/feedback', label: 'Feedback Form', category: 'Support' },
    
    // External
    'drive': { target: 'https://drive.google.com', label: 'Google Drive', category: 'External' },
    'gmail': { target: 'https://mail.google.com', label: 'Google Mail', category: 'External' },
};

/**
 * Normalizes input and processes it through hierarchical intent matching.
 */
export function processCommand(input: string): CommandResult {
    const cleanInput = input.toLowerCase().trim().replace(/[?]/g, '');
    if (!cleanInput) return { type: 'unknown', message: 'Awaiting Input...' };

    const tokens = cleanInput.split(/\s+/).filter(Boolean);
    const verb = tokens[0];
    const remainingRaw = tokens.slice(1).join(' ');
    
    // Remove filler words for parameter extraction
    const remaining = remainingRaw
        .replace(/^(for|named|called|to|about|at)\s+/i, '')
        .trim();

    // 1. EXACT MATCH (Highest Priority)
    if (commandMap[cleanInput]) {
        const cmd = commandMap[cleanInput];
        return {
            type: 'navigation',
            target: cmd.target,
            isExternal: cmd.target.startsWith('http'),
            message: `Launcher: [${cmd.label}]`,
            description: `Navigating directly to ${cmd.label}.`,
            category: cmd.category
        };
    }

    // 2. PAGE TITLE MATCH (Scan all menu items)
    const menuItemMatch = allMenuItems.find(item => 
        item.label.toLowerCase() === cleanInput || 
        item.label.toLowerCase().includes(cleanInput) && cleanInput.length > 3
    );
    if (menuItemMatch) {
        return {
            type: 'navigation',
            target: menuItemMatch.href,
            message: `Launcher: [${menuItemMatch.label}]`,
            description: `Opening ${menuItemMatch.label}.`,
            category: 'Navigation'
        };
    }

    // 3. VERB-BASED ACTIONS
    // Handle "Go [Place]"
    if ((verb === 'go' || verb === 'open' || verb === 'show') && remaining) {
        const searchTarget = remaining.startsWith('to ') ? remaining.replace('to ', '') : remaining;
        
        // Check command map
        const cmd = commandMap[searchTarget];
        if (cmd) {
            return {
                type: 'navigation',
                target: cmd.target,
                isExternal: cmd.target.startsWith('http'),
                message: `Executing: [${cmd.label}]`,
                description: `Opening the requested hub.`,
                category: cmd.category
            };
        }

        // Check menu items
        const menuMatch = allMenuItems.find(item => item.label.toLowerCase().includes(searchTarget));
        if (menuMatch) {
            return {
                type: 'navigation',
                target: menuMatch.href,
                message: `Go To: [${menuMatch.label}]`,
                description: `Opening requested page.`,
                category: 'Navigation'
            };
        }
    }

    // Handle "New [Entity] [Name]"
    if (verb === 'new' && remaining) {
        if (remaining.includes('contact')) {
            const name = remaining.replace('contact', '').trim();
            return {
                type: 'navigation',
                target: `/contacts?action=new${name ? `&name=${encodeURIComponent(name)}` : ''}`,
                message: `Action: [New Contact]`,
                description: name ? `Creating record for "${name}".` : "Opening contact creator.",
                category: 'Relationships'
            };
        }
        if (remaining.includes('project')) {
            const name = remaining.replace('project', '').trim();
            return {
                type: 'navigation',
                target: `/projects/create${name ? `?title=${encodeURIComponent(name)}` : ''}`,
                message: `Action: [New Project]`,
                description: name ? `Starting project "${name}".` : "Opening project planner.",
                category: 'Operations'
            };
        }
        if (remaining.includes('invoice')) {
            return {
                type: 'navigation',
                target: '/accounting/invoices/create',
                message: 'Action: [New Invoice]',
                description: "Opening invoice generator.",
                category: 'Finances'
            };
        }
        if (remaining.match(/(task|event|reminder)/)) {
            const title = remaining.replace(/(task|event|reminder)/g, '').trim();
            return {
                type: 'navigation',
                target: `/master-mind${title ? `?title=${encodeURIComponent(title)}` : ''}`,
                message: `Action: [New Entry]`,
                description: title ? `Adding "${title}" to timeline.` : "Opening scheduler.",
                category: 'Workspace'
            };
        }
    }

    // Handle "Track [Something]"
    if (verb === 'track' && remaining) {
        return {
            type: 'navigation',
            target: `/master-mind?title=${encodeURIComponent(remaining)}&startTimer=true`,
            message: `Timer: [${remaining}]`,
            description: `Starting live session for "${remaining}".`,
            category: 'Workspace'
        };
    }

    // 4. WORD-BOUNDARY FUZZY MATCH (Lower Priority)
    for (const keyword of Object.keys(commandMap)) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(cleanInput)) {
            const cmd = commandMap[keyword];
            return {
                type: 'navigation',
                target: cmd.target,
                isExternal: cmd.target.startsWith('http'),
                message: `Recognized: [${cmd.label}]`,
                description: `Signal detected for hub navigation.`,
                category: cmd.category
            };
        }
    }

    return {
        type: 'unknown',
        message: `Command Not Recognized`,
        description: "Refine your command or use the Global Search in the top bar.",
    };
}
