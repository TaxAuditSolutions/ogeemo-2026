/**
 * @fileOverview Deterministic Command Processor for Ogeemo.
 * Maps natural language keywords and "verbs" to structured application actions.
 */

export interface CommandResult {
    type: 'navigation' | 'action' | 'unknown';
    target?: string;
    message: string;
    description?: string;
    isExternal?: boolean;
}

const commandMap: Record<string, string> = {
    'accounting': '/accounting',
    'account': '/accounting',
    'finance': '/accounting',
    'money': '/accounting',
    'tax': '/accounting/tax',
    'tax center': '/accounting/tax',
    'categories': '/accounting/tax/categories',
    'contact': '/contacts',
    'contacts': '/contacts',
    'client': '/contacts',
    'clients': '/contacts',
    'ledger': '/accounting/ledgers',
    'income': '/accounting/ledgers?tab=income',
    'expense': '/accounting/ledgers?tab=expenses',
    'bks': '/accounting/ledgers',
    'payroll': '/accounting/payroll/run',
    'worker': '/contacts',
    'workers': '/contacts',
    'project': '/projects/all',
    'projects': '/projects/all',
    'board': '/project-status',
    'status': '/project-status',
    'calendar': '/calendar',
    'schedule': '/calendar',
    'event': '/calendar',
    'ar': '/accounting/accounts-receivable',
    'ap': '/accounting/accounts-payable',
    'receivable': '/accounting/accounts-receivable',
    'payable': '/accounting/accounts-payable',
    'invoice': '/accounting/invoices/create',
    'invoices': '/accounting/accounts-receivable',
    'inventory': '/inventory-manager/track',
    'stock': '/inventory-manager/track',
    'pos': '/inventory-manager/pos',
    'marketing': '/marketing-manager',
    'settings': '/settings',
    'profile': '/settings',
    'hub': '/action-manager',
    'dashboard': '/action-manager',
    'ai': '/command-centre',
    'search': '/reports/search',
    'reports': '/reports/search',
    'help': '/master-mind/gtd-instructions',
    'drive': 'https://drive.google.com',
    'gmail': 'https://mail.google.com',
    'hytexercise': '/hytexercise',
    'wellness': '/hytexercise',
};

export function processCommand(input: string): CommandResult {
    const cleanInput = input.toLowerCase().trim();
    const parts = cleanInput.split(' ');
    const verb = parts[0];
    const remaining = parts.slice(1).join(' ');

    // 1. Direct Keyword Match (Strict)
    if (commandMap[cleanInput]) {
        const target = commandMap[cleanInput];
        return {
            type: 'navigation',
            target,
            isExternal: target.startsWith('http'),
            message: `Recognized intent: ${cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1)} Hub`,
            description: `Navigating to the ${cleanInput} section.`,
        };
    }

    // 2. Fuzzy Keyword Match (Contains) - Provide context if we're "close"
    const fuzzyMatchKey = Object.keys(commandMap).find(key => cleanInput.includes(key));
    if (fuzzyMatchKey) {
        const target = commandMap[fuzzyMatchKey];
        return {
            type: 'navigation',
            target,
            isExternal: target.startsWith('http'),
            message: `Did you mean: ${fuzzyMatchKey.charAt(0).toUpperCase() + fuzzyMatchKey.slice(1)}?`,
            description: `I've detected a request for ${fuzzyMatchKey}.`,
        };
    }

    // 3. Verb: "Go"
    if (verb === 'go' && remaining) {
        const searchTarget = remaining.startsWith('to ') ? remaining.replace('to ', '') : remaining;
        const target = commandMap[searchTarget];
        if (target) {
            return {
                type: 'navigation',
                target,
                isExternal: target.startsWith('http'),
                message: `Navigating to ${searchTarget}...`,
                description: `Executing direct launch to ${searchTarget}.`,
            };
        }
    }

    // 4. Verb: "New"
    if (verb === 'new' && remaining) {
        if (remaining.includes('contact')) {
            const name = remaining.replace('contact', '').trim();
            return {
                type: 'navigation',
                target: `/contacts?action=new${name ? `&name=${encodeURIComponent(name)}` : ''}`,
                message: `Opening New Contact Form`,
                description: name ? `Preparing record for "${name}".` : "Starting a fresh contact record.",
            };
        }
        if (remaining.includes('project')) {
            const name = remaining.replace('project', '').trim();
            return {
                type: 'navigation',
                target: `/projects/create${name ? `?title=${encodeURIComponent(name)}` : ''}`,
                message: `Creating New Project`,
                description: name ? `Initializing plan for "${name}".` : "Opening the project creator.",
            };
        }
        if (remaining.includes('invoice')) {
            return {
                type: 'navigation',
                target: '/accounting/invoices/create',
                message: 'Opening Invoice Generator',
                description: "Preparing to bill a client.",
            };
        }
        if (remaining.includes('task') || remaining.includes('event') || remaining.includes('reminder')) {
            const title = remaining.replace(/task|event|reminder/g, '').trim();
            return {
                type: 'navigation',
                target: `/master-mind${title ? `?title=${encodeURIComponent(title)}` : ''}`,
                message: `Scheduling Commitment`,
                description: title ? `Adding "${title}" to your timeline.` : "Opening the Command Centre scheduler.",
            };
        }
    }

    // 5. Verb: "Track"
    if (verb === 'track' && remaining) {
        return {
            type: 'navigation',
            target: `/master-mind?title=${encodeURIComponent(remaining)}&startTimer=true`,
            message: `Active Tracking Initialized`,
            description: `Starting a live timer for "${remaining}".`,
        };
    }

    return {
        type: 'unknown',
        message: `Command Not Recognized: "${input}"`,
        description: "Try typing 'Accounting', 'New contact', 'Go to Ledger', or 'Track Client Call'.",
    };
}
