
/**
 * @fileOverview High-Fidelity Command Processor for Ogeemo.
 * Maps natural language verbs and nouns to structured application actions.
 */

import { allMenuItems } from './menu-items';
import { isContactCreationRequest, isContactEditRequest } from './copilot-routing';
import { GOOGLE_APPS_CATEGORY, googleAppLabel, matchGoogleApp } from './google-app-names';

export interface CommandResult {
    type: 'navigation' | 'action' | 'unknown';
    target?: string;
    label?: string;
    message: string;
    assistantMessage?: string;
    description?: string;
    isExternal?: boolean;
    category?: string;
    /**
     * The menu screen whose permissions decide whether this may be opened, when the target is not itself a menu screen
     * (a Google app is governed by the Google Apps entry). See src/lib/screen-access.ts.
     */
    accessScreen?: string;
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
    'actionmanager': { target: '/action-manager', label: 'My Shortcuts', category: 'Workspace' },
    'dashboard': { target: '/action-manager', label: 'My Shortcuts', category: 'Workspace' },
    'copilot': { target: '/co-pilot', label: 'AI Co-Pilot', category: 'Intelligence' },
    'aidispatch': { target: '/co-pilot', label: 'AI Co-Pilot', category: 'Intelligence' },
    'dispatch': { target: '/co-pilot', label: 'AI Co-Pilot', category: 'Intelligence' },
    'commandcentre': { target: '/event-manager', label: 'Activity Manager', category: 'Workspace' },
    'commandcenter': { target: '/event-manager', label: 'Activity Manager', category: 'Workspace' },
    'ogeemoai': { target: '/co-pilot', label: 'Ogeemo Co-Pilot', category: 'Intelligence' },
    'mastermind': { target: '/event-manager', label: 'Activity Manager', category: 'Workspace' },
    'eventmanager': { target: '/event-manager', label: 'Activity Manager', category: 'Workspace' },
    'activitymanager': { target: '/event-manager', label: 'Activity Manager', category: 'Workspace' },
    'timemanager': { target: '/event-manager', label: 'Activity Manager', category: 'Workspace' },
    // "Time log" is the Worker Time Log Report (the knowledge base says so too), not the Activity Manager.
    'timelog': { target: '/reports/time-log', label: 'Worker Time Log Report', category: 'Workspace' },
    'timesheet': { target: '/event-manager', label: 'Activity Manager', category: 'Workspace' },
    'timer': { target: '/event-manager?startTimer=true', label: 'Activity Manager Timer', category: 'Workspace' },
    'starttimer': { target: '/event-manager?startTimer=true', label: 'Activity Manager Timer', category: 'Workspace' },
    'logtime': { target: '/event-manager?startTimer=true', label: 'Activity Manager Timer', category: 'Workspace' },
    'tracktime': { target: '/event-manager?startTimer=true', label: 'Activity Manager Timer', category: 'Workspace' },

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
    'worker': { target: '/workers', label: 'Workers', category: 'HR' },
    'employees': { target: '/workers', label: 'Workers', category: 'HR' },
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
    'workers': { target: '/workers', label: 'Workers', category: 'HR' },
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

/** Words that may stand in front of or after a screen's name without changing which screen it is. */
const LEADING_FILLER = /^(?:(?:to|me|us|the|my|our|a|please|up)\s+)+/i;
const TRAILING_FILLER = /\s+(?:page|screen)$/i;
/** The ways people ask to be taken to a screen. The verbs the processor already knows are included so a bare phrase works too. */
const NAVIGATION_PHRASE = /^(?:take me to|bring me to|bring up|pull up|switch to|jump to|head to|navigate to|go to|goto|open up|open|show me|show|view|launch|go)\s+/i;

/**
 * The menu screen whose name is EXACTLY what was typed ("Quote Manager", "the Image Manager", "Idea Board page").
 *
 * The short aliases below are shortcuts for people who do not know the name, but they are matched loosely (a token
 * that starts with one, or one inside a longer word), so they used to beat the real name: "Project Status" opened the
 * Project List (it contains "projects"), "Quote Manager" opened Create Quote, "Image Manager" opened the image
 * generator, and 11 other screens opened a neighbour. When someone types a screen's exact name, that screen wins.
 */
function exactMenuItem(text: string): (typeof allMenuItems)[number] | undefined {
    // Try the name as typed first, then without leading filler: "My Shortcuts" is a real name, "my calendar" is not.
    const asTyped = text.trim().replace(NAVIGATION_PHRASE, '').replace(TRAILING_FILLER, '');
    for (const candidate of [asTyped, asTyped.replace(LEADING_FILLER, '')]) {
        const wanted = normalize(candidate);
        if (!wanted) continue;
        const found = allMenuItems.find((item) => normalize(item.label) === wanted);
        if (found) return found;
    }
    return undefined;
}

/**
 * Other names people use for a screen that already has an exact name, matched as a WHOLE phrase (not loosely like the
 * aliases above). Added after "open quotes", "go to quotes" and "open the quote form" opened nothing and the assistant
 * answered with a route written in text.
 *
 * Two kinds, because "show me my quotes" wants the quotes themselves (the Co-Pilot reads them and answers), while "open
 * quotes" wants the screen:
 *   - LIST names say "the list of these". They open the screen after open / go to / take me to, but NOT after show / view.
 *   - FORM names say "the form to make one". They open it after any of those verbs.
 */
const LIST_SCREEN_NAMES: Record<string, string> = {
    quotes: '/accounting/quotes',
    myquotes: '/accounting/quotes',
    allquotes: '/accounting/quotes',
    quotelist: '/accounting/quotes',
    quoteslist: '/accounting/quotes',
    quotesmanager: '/accounting/quotes',
};
const FORM_SCREEN_NAMES: Record<string, string> = {
    quoteform: '/accounting/quotes/create',
    newquoteform: '/accounting/quotes/create',
    quotegenerator: '/accounting/quotes/create',
    quotecreator: '/accounting/quotes/create',
    newquote: '/accounting/quotes/create',
};
/**
 * Other names for a screen that open it after ANY verb. Found by trying the names people type for every menu screen
 * (12 Nov 2026): these either opened nothing ("open documents", "open ideas", "open loans") or opened a neighbour
 * ("open client time log" opened the WORKER report, "open sales tax" opened the Tax Center, not the calculator).
 * Screens that are not in the menu but are reached from a visible button or a card are included, with their own label.
 */
const SCREEN_NAMES: Record<string, string> = {
    // Workspace
    // "docs" is deliberately not here: it means Google Docs, which needs the word "Google" (see google-app-names.ts).
    documents: '/document-manager',
    mynotes: '/user-notes', usernotes: '/user-notes', notes: '/user-notes',
    ideas: '/idea-board', ideaboards: '/idea-board',
    activity: '/event-manager', activities: '/event-manager',
    organizeideas: '/idea-board/organize', organiseideas: '/idea-board/organize', ideaboardorganize: '/idea-board/organize',
    reminders: '/calendar/reminders', calendarreminders: '/calendar/reminders', calendarreminder: '/calendar/reminders',
    // Reports
    reports: '/reports',
    clienttimelog: '/reports/client-time-log', clienttimelogs: '/reports/client-time-log', clienttimereport: '/reports/client-time-log', clienttime: '/reports/client-time-log',
    // Accounting
    salestax: '/accounting/tax/sales-tax', salestaxes: '/accounting/tax/sales-tax',
    taxcategory: '/accounting/tax/categories',
    receipts: '/accounting/receipt-processor', receiptscanner: '/accounting/receipt-processor',
    loans: '/accounting/loan-manager', loan: '/accounting/loan-manager',
    // People
    humanresources: '/hr-manager',
    leave: '/hr-manager/time-off', vacation: '/hr-manager/time-off',
    // Settings and tools reached from a card or a button
    rituals: '/settings/rituals', planningrituals: '/settings/rituals', settingsrituals: '/settings/rituals',
    siteimages: '/settings/site-images', settingssiteimages: '/settings/site-images', imagesettings: '/settings/site-images',
    pos: '/inventory-manager/pos', pointofsale: '/inventory-manager/pos', inventorypos: '/inventory-manager/pos',
    changepassword: '/change-password', changemypassword: '/change-password',
    // Administration
    users: '/user-manager', usermanagement: '/user-manager',
    tenants: '/tenant-manager',
    help: '/help', helppage: '/help', helpcentre: '/help', helpcenter: '/help',
};
/**
 * Names above that are ordinary words on their own. They open a screen only after a verb ("open help"), never typed
 * bare: a lone "help" or "users" is far more likely to be the start of a question for the Co-Pilot. (A few bare words
 * such as "leave", "loan" and "activity" already opened a screen before this list existed, through the older matching
 * of menu labels; this list does not change that.)
 */
const NEEDS_A_VERB = new Set(['help', 'helppage', 'helpcentre', 'helpcenter', 'vacation', 'users', 'tenants', 'activity', 'activities', 'reminders', 'pos']);
/** Labels for the screens above that are not in the menu (a menu screen uses its own label). */
const EXTRA_SCREEN_LABELS: Record<string, string> = {
    '/settings/rituals': 'Planning Rituals',
    '/settings/site-images': 'Site Images',
    '/calendar/reminders': 'Calendar Reminders',
    '/inventory-manager/pos': 'Point of Sale',
    '/idea-board/organize': 'Organize Ideas',
    '/change-password': 'Change Password',
    '/help': 'Help',
};
/** After these the person wants the information, not the page. */
const DATA_VERB = /^(?:show me|show|view)\s+/i;

type ScreenRef = { href: string; label: string };

function screenSynonym(text: string): ScreenRef | undefined {
    const typed = text.trim();
    const dataVerb = DATA_VERB.test(typed);
    const hadVerb = NAVIGATION_PHRASE.test(typed);
    const stripped = typed.replace(NAVIGATION_PHRASE, '').replace(TRAILING_FILLER, '');
    for (const candidate of [stripped, stripped.replace(LEADING_FILLER, '')]) {
        const wanted = normalize(candidate);
        if (!wanted) continue;
        const named = SCREEN_NAMES[wanted];
        const href = FORM_SCREEN_NAMES[wanted] ?? (named && (hadVerb || !NEEDS_A_VERB.has(wanted)) ? named : undefined) ?? (dataVerb ? undefined : LIST_SCREEN_NAMES[wanted]);
        if (!href) continue;
        const found: ScreenRef | undefined = allMenuItems.find((item) => item.href === href)
            ?? (EXTRA_SCREEN_LABELS[href] ? { href, label: EXTRA_SCREEN_LABELS[href] } : undefined);
        if (found) return found;
    }
    return undefined;
}

/**
 * A typed request for one of the Google apps ("open google maps", "google drawings", "open maps"). The apps open on
 * another site, so the result is an external link; the Co-Pilot shows it as a button (see copilot-dispatch.ts). Which names
 * count, and which need the word "Google", is decided in google-app-names.ts.
 */
function googleAppCommand(text: string): CommandResult | undefined {
    const typed = text.trim();
    const hadVerb = NAVIGATION_PHRASE.test(typed);
    const stripped = typed.replace(NAVIGATION_PHRASE, '').replace(TRAILING_FILLER, '').replace(/\s+app$/i, '');
    for (const candidate of [stripped, stripped.replace(LEADING_FILLER, '')]) {
        const app = matchGoogleApp(candidate, hadVerb);
        if (!app) continue;
        const label = googleAppLabel(app);
        return {
            type: 'navigation',
            target: app.href,
            label,
            isExternal: true,
            accessScreen: '/google',
            message: `Ready: [Open ${label}]`,
            description: `${label} opens on another site.`,
            category: GOOGLE_APPS_CATEGORY,
        };
    }
    return undefined;
}

function menuNavigation(item: ScreenRef): CommandResult {
    return {
        type: 'navigation',
        target: item.href,
        label: item.label,
        message: `Ready: [Open ${item.label}]`,
        description: 'Your requested hub is ready.',
        category: 'Navigation',
    };
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
    // A sentence that opens with a question word is a question even with no "?" and no "is/are/do" after it
    // ("What happens to my payroll deductions at year end"). Auto-open made this matter: it used to cost a
    // button, now it would cost a page jump away from the answer.
    /^(what|what's|whats|why|when|who|who's|whose|which|where|where's)\b/i,
    // "does/did/is/are" never start a command ("does payroll include vacation pay"); "do" is left out on purpose
    // ("do my taxes" is a request) and "can/could/should/would/will" only count with a subject ("can I print...").
    /^(does|did|is|are)\s+\w+/i,
    /^(can|could|should|would|will)\s+(i|we|my|there|the|it|this|that)\b/i,
    // "help me with payroll", "help with invoices", "help me create a contact": asking the Co-Pilot for help, not naming
    // a screen. These used to open Payroll / Invoice List / Contacts because a screen name was inside the sentence.
    // A bare "help" (or "open help") is handled separately and still means the Help screen after a verb.
    /^(?:please\s+)?(?:help|assist)\s+(?:me|us|with|to)\b/i,
    /^(?:i\s+)?(?:need|want)\s+(?:some\s+)?help\b/i,
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

    // A Google app by name comes first, so "google calendar" opens Google's calendar and not Ogeemo's.
    const googleApp = googleAppCommand(rawInput);
    if (googleApp) return googleApp;

    const normalizedInput = normalize(rawInput);
    const tokens = rawInput.split(/\s+/).filter(Boolean);
    const verb = tokens[0];
    const remaining = tokens.slice(1).join(' ');

    // Editing: "Edit", "Update", "Modify", "Change" a contact routes to the
    // Co-Pilot conversation, which searches for the matching record and opens
    // it for editing, the same way contact-creation requests do.
    if (['edit', 'update', 'modify', 'change'].includes(verb) && remaining) {
        const param = cleanParam(remaining);
        const normalizedParam = normalize(param);

        if (normalizedParam.includes('contact')) {
            return {
                type: 'unknown',
                message: 'Contact Assistance',
                description: 'Routing contact editing to Ogeemo Co-Pilot.',
            };
        }
    }

    if (isContactEditRequest(rawInput)) {
        return {
            type: 'unknown',
            message: 'Contact Assistance',
            description: 'Routing contact editing to Ogeemo Co-Pilot.',
        };
    }

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
                target: `/event-manager?title=${encodeURIComponent(title)}`,
                label: 'Schedule Meeting',
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
            return {
                type: 'action',
                target: `/accounting/invoices/create${invoiceName ? '?contactName=' + encodeURIComponent(invoiceName) : ''}`,
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
                target: `/event-manager${title ? `?title=${encodeURIComponent(title)}` : ''}`,
                label: 'Activity Manager',
                message: 'Action: [Schedule Entry]',
                description: title ? `"${title}" is ready to add to the timeline.` : 'Activity Manager is ready.',
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

        // Contact-creation and contact-editing requests route to the Co-Pilot
        // conversation (which auto-opens the prepared form), never to a plain
        // hub navigation.
        if (isContactCreationRequest(rawInput)) {
            return {
                type: 'unknown',
                message: 'Contact Assistance',
                description: 'Routing contact creation to Ogeemo Co-Pilot.',
            };
        }
        if (isContactEditRequest(rawInput)) {
            return {
                type: 'unknown',
                message: 'Contact Assistance',
                description: 'Routing contact editing to Ogeemo Co-Pilot.',
            };
        }

        // An exact screen name beats every alias (see exactMenuItem). `remaining` is used, not `cleaned`, because
        // cleanParam strips words like "manager" and "list" that are part of real screen names.
        const exact = exactMenuItem(remaining) ?? screenSynonym(input);
        if (exact) return menuNavigation(exact);

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
                target: `/event-manager?startTimer=true${titleTarget}`,
                label: 'Activity Manager Timer',
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

    const exactBare = exactMenuItem(rawInput) ?? screenSynonym(rawInput);
    if (exactBare) return menuNavigation(exactBare);

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
