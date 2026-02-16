
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
    'settings': '/settings',
    'profile': '/settings',
    'hub': '/action-manager',
    'dashboard': '/action-manager',
    'ai': '/command-centre',
    'search': '/reports/search',
    'help': '/master-mind/gtd-instructions',
    'drive': 'https://drive.google.com',
    'gmail': 'https://mail.google.com',
};

export function processCommand(input: string): CommandResult {
    const cleanInput = input.toLowerCase().trim();
    const parts = cleanInput.split(' ');
    const verb = parts[0];
    const remaining = parts.slice(1).join(' ');

    // 1. Direct Keyword Match
    if (commandMap[cleanInput]) {
        const target = commandMap[cleanInput];
        return {
            type: 'navigation',
            target,
            isExternal: target.startsWith('http'),
            message: `Recognized intent: ${cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1)} Hub`,
            description: `I will take you to the ${cleanInput} area of the application.`,
        };
    }

    // 2. Verb: "Go"
    if (verb === 'go' && remaining) {
        // Clean up "to" if present
        const searchTarget = remaining.startsWith('to ') ? remaining.replace('to ', '') : remaining;
        const target = commandMap[searchTarget];
        if (target) {
            return {
                type: 'navigation',
                target,
                isExternal: target.startsWith('http'),
                message: `Going to ${searchTarget}...`,
                description: `Navigating directly to ${searchTarget}.`,
            };
        }
    }

    // 3. Verb: "New"
    if (verb === 'new' && remaining) {
        if (remaining.includes('contact')) {
            const name = remaining.replace('contact', '').trim();
            return {
                type: 'navigation',
                target: `/contacts?action=new${name ? `&name=${encodeURIComponent(name)}` : ''}`,
                message: `Opening New Contact Form`,
                description: name ? `Preparing contact record for "${name}".` : "Starting a fresh contact record.",
            };
        }
        if (remaining.includes('project')) {
            const name = remaining.replace('project', '').trim();
            return {
                type: 'navigation',
                target: `/projects/create${name ? `?title=${encodeURIComponent(name)}` : ''}`,
                message: `Creating New Project`,
                description: name ? `Starting the "${name}" project plan.` : "Creating a new multi-step project.",
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
                description: title ? `Adding "${title}" to your timeline.` : "Scheduling a new item in the Command Centre.",
            };
        }
    }

    // 4. Verb: "Track"
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
        message: `Unknown Command: "${input}"`,
        description: "Try typing 'Contact', 'Go to Ledger', 'New project Website', or 'Track Client Call'.",
    };
}
