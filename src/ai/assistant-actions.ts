import { z } from 'zod';

const optionalText = z.string().trim().optional();
const optionalDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD.').optional();

export const AssistantContactDraftSchema = z.object({
    name: z.string().trim().min(2),
    folderId: z.string().trim().min(1),
    email: z.string().trim().email().optional().or(z.literal('')),
    birthDate: optionalDate,
    website: optionalText,
    businessName: optionalText,
    employeeNumber: optionalText,
    industryCode: optionalText,
    craProgramAccountNumber: optionalText,
    streetAddress: optionalText,
    city: optionalText,
    provinceState: optionalText,
    postalCode: optionalText,
    country: optionalText,
    businessPhone: optionalText,
    cellPhone: optionalText,
    homePhone: optionalText,
    faxNumber: optionalText,
    primaryPhoneType: z.enum(['businessPhone', 'cellPhone', 'homePhone']).nullable().optional(),
    notes: optionalText,
    sin: optionalText,
    workerType: z.enum(['employee', 'contractor']).nullable().optional(),
    payType: z.enum(['hourly', 'salary']).nullable().optional(),
    payRate: z.number().nonnegative().nullable().optional(),
    hireDate: optionalDate,
    startDate: optionalDate,
    emergencyContactName: optionalText,
    emergencyContactPhone: optionalText,
    hasContract: z.boolean().optional(),
    specialNeeds: optionalText,
}).strict();

export type AssistantContactDraft = z.infer<typeof AssistantContactDraftSchema>;

export const AssistantClientActionSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('open_contact_form'),
        draft: AssistantContactDraftSchema,
    }).strict(),
    z.object({
        type: z.literal('open_contact'),
        contactId: z.string().trim().min(1),
    }).strict(),
]);

export type AssistantClientAction = z.infer<typeof AssistantClientActionSchema>;

const AssistantDispatchActionSchema = z.object({
    type: z.literal('dispatch'),
    target: z.string().trim().min(1),
    isExternal: z.boolean(),
    label: z.string().trim().min(1),
    category: z.string().trim().min(1).optional(),
}).strict().superRefine((action, context) => {
    if (action.isExternal) {
        try {
            const url = new URL(action.target);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                context.addIssue({ code: 'custom', message: 'External dispatch targets must use HTTP(S).' });
            }
        } catch {
            context.addIssue({ code: 'custom', message: 'External dispatch target must be a valid URL.' });
        }
        return;
    }

    if (!action.target.startsWith('/') || action.target.startsWith('//')) {
        context.addIssue({ code: 'custom', message: 'Internal dispatch targets must be application-relative paths.' });
    }
});

export const AssistantMessageActionSchema = z.union([
    AssistantDispatchActionSchema,
    AssistantClientActionSchema,
]);

export type AssistantMessageAction = z.infer<typeof AssistantMessageActionSchema>;

export const AssistantApiResponseSchema = z.object({
    answer: z.string(),
    action: AssistantMessageActionSchema.optional(),
    /** True when the answer came from the deterministic fallback instead of the AI capability flow. */
    degraded: z.boolean().optional(),
}).strict();

/** The only destinations a capability flow may offer; the model never supplies a raw path. */
export const ASSISTANT_DESTINATIONS = {
    contacts_hub: { target: '/contacts', label: 'Contacts Hub', category: 'Relationships' },
    new_contact: { target: '/contacts?action=new', label: 'New Contact', category: 'Relationships' },
} as const;

export type AssistantDestinationKey = keyof typeof ASSISTANT_DESTINATIONS;

export const AssistantCapabilityActionSchema = z.union([
    z.object({
        type: z.literal('open_destination'),
        destination: z.enum(Object.keys(ASSISTANT_DESTINATIONS) as [AssistantDestinationKey, ...AssistantDestinationKey[]]),
    }).strict(),
    AssistantClientActionSchema,
]);

export type AssistantCapabilityAction = z.infer<typeof AssistantCapabilityActionSchema>;

export function parseAssistantClientAction(
    value: unknown,
    validFolderIds: Iterable<string>,
): AssistantClientAction | undefined {
    const parsed = AssistantClientActionSchema.safeParse(value);
    if (!parsed.success) return undefined;

    if (parsed.data.type === 'open_contact_form') {
        const allowedFolders = new Set(validFolderIds);
        if (!allowedFolders.has(parsed.data.draft.folderId)) return undefined;
    }

    return parsed.data;
}

export function parseAssistantMessageAction(value: unknown): AssistantMessageAction | undefined {
    const parsed = AssistantMessageActionSchema.safeParse(value);
    return parsed.success ? parsed.data : undefined;
}

/**
 * Resolves a capability-supplied action into a persistable message action,
 * mapping destination keys through the allowlist rather than trusting a path.
 */
export function resolveAssistantCapabilityAction(
    value: unknown,
    validFolderIds: Iterable<string>,
): AssistantMessageAction | undefined {
    const parsed = AssistantCapabilityActionSchema.safeParse(value);
    if (!parsed.success) return undefined;

    if (parsed.data.type === 'open_destination') {
        const destination = ASSISTANT_DESTINATIONS[parsed.data.destination];
        return {
            type: 'dispatch',
            target: destination.target,
            isExternal: false,
            label: destination.label,
            category: destination.category,
        };
    }

    return parseAssistantClientAction(parsed.data, validFolderIds);
}

/** A client action that opens the contact form pre-filled with an assistant draft. */
export type AssistantContactFormAction = Extract<AssistantClientAction, { type: 'open_contact_form' }>;

const DETERMINISTIC_EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

const DETERMINISTIC_NAME_PATTERNS: RegExp[] = [
    /\b(?:make|create|add|new)\s+(?:a\s+|an\s+)?(?:new\s+)?contact\s+(?:for|named|called)\s+(.+)$/i,
    /\bcontact\s+(?:for|named|called)\s+(.+)$/i,
    /\badd\s+(.+?)\s+as\s+(?:a\s+)?(?:new\s+)?contact/i,
    /\b(?:make|create|add)\s+(?:a\s+|an\s+)?(?:new\s+)?contact\s*[:\u2013-]\s*(.+)$/i,
];

const DETERMINISTIC_NAME_STOP_WORDS = new Set([
    'me', 'it', 'him', 'her', 'them', 'us', 'you', 'this', 'that', 'someone', 'somebody', 'anyone',
]);

const DETERMINISTIC_TRAILING_NOISE_PATTERNS: RegExp[] = [
    /\s*(?:with\s+)?e-?mail\s+address\s*(?:\s+(?:of|is|at|as|:))?\s*$/i,
    /\s*(?:with\s+)?e-?mail\s*(?:\s+(?:of|is|at|as|:))?\s*$/i,
    /\s*(?:with|and|plus|please)\s*$/i,
];

const DETERMINISTIC_EDGE_NOISE = /^[\s,;:<"']+|[\s.,;:>?"']+$/g;

function stripDeterministicTrailingNoise(value: string): string {
    let current = value.replace(DETERMINISTIC_EDGE_NOISE, '').trim();
    let changed = true;
    while (changed && current) {
        changed = false;
        for (const pattern of DETERMINISTIC_TRAILING_NOISE_PATTERNS) {
            const next = current.replace(pattern, '').replace(DETERMINISTIC_EDGE_NOISE, '').trim();
            if (next !== current) {
                current = next;
                changed = true;
            }
        }
    }
    return current.replace(/\s+/g, ' ').trim();
}

function escapeDeterministicRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DETERMINISTIC_PHONE_KEYWORD_PATTERN = /\b(cell|mobile|home|business|work|office|telephone|tel|phone)\s*(?:number|#|:)?\s*([+()]?[\d][\d\s().-]{7,}\d)/gi;

type DeterministicPhoneField = 'cellPhone' | 'homePhone' | 'businessPhone';

function extractDeterministicPhones(value: string): Array<{ field: DeterministicPhoneField; number: string; match: string }> {
    const results: Array<{ field: DeterministicPhoneField; number: string; match: string }> = [];
    for (const match of value.matchAll(DETERMINISTIC_PHONE_KEYWORD_PATTERN)) {
        const label = match[1].toLowerCase();
        const digits = match[2].replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 11) continue;
        const field: DeterministicPhoneField = label === 'home'
            ? 'homePhone'
            : (label === 'business' || label === 'work' || label === 'office')
                ? 'businessPhone'
                : 'cellPhone';
        results.push({ field, number: match[2].replace(/[\s().-]+$/, '').trim(), match: match[0] });
    }
    return results;
}

/**
 * Resolves a capability action like `resolveAssistantCapabilityAction`, but
 * repairs the most common model slip first: echoing the folder NAME (or an
 * unknown id) instead of a real tenant folder id. Falls back to the first
 * tenant folder so the form action survives; the user can still change the
 * folder inside the form before saving.
 */
export function resolveAssistantCapabilityActionWithRepair(
    value: unknown,
    folders: ReadonlyArray<{ id: string; name: string }>,
): AssistantMessageAction | undefined {
    const direct = resolveAssistantCapabilityAction(value, folders.map((folder) => folder.id));
    if (direct) return direct;

    if (
        value &&
        typeof value === 'object' &&
        (value as { type?: unknown }).type === 'open_contact_form' &&
        folders.length > 0
    ) {
        const draft = (value as { draft?: Record<string, unknown> }).draft ?? {};
        const name = typeof draft.name === 'string' ? draft.name.trim() : '';
        const wantedFolder = typeof draft.folderId === 'string' ? draft.folderId.trim().toLowerCase() : '';
        const matchedByName = wantedFolder
            ? folders.find((folder) => folder.name.trim().toLowerCase() === wantedFolder)
            : undefined;
        const folderId = matchedByName?.id ?? folders[0].id;
        const repaired = resolveAssistantCapabilityAction(
            { type: 'open_contact_form', draft: { ...draft, folderId } },
            folders.map((folder) => folder.id),
        );
        if (repaired) {
            console.warn('[assistant-actions] repaired capability draft folder id', {
                originalFolderId: draft.folderId ?? null,
                repairedFolderId: folderId,
            });
            return repaired;
        }
    }

    return undefined;
}

/**
 * Deterministic fallback for the AI contact capability: extracts a name (and
 * optional email/phone) from a plain sentence such as "Make a contact for Nick
 * Illiopoulos email address of nick@ogeemo.com" or "create a contact for Sam
 * Sneed, cell #4166666797", and returns an `open_contact_form` action using
 * the first tenant folder as the default. Returns `undefined` when no usable
 * contact name can be extracted.
 */
export function buildDeterministicContactDraft(
    message: string,
    folders: ReadonlyArray<{ id: string; name: string }>,
): AssistantContactFormAction | undefined {
    if (!message || folders.length === 0) return undefined;

    const emailMatch = DETERMINISTIC_EMAIL_PATTERN.exec(message);
    const email = emailMatch ? emailMatch[0] : undefined;
    let working = email ? message.replace(email, ' ') : message;

    const phoneEntries = extractDeterministicPhones(working);
    for (const entry of phoneEntries) {
        working = working.replace(entry.match, ' ');
    }

    let nameCandidate: string | undefined;
    for (const pattern of DETERMINISTIC_NAME_PATTERNS) {
        const match = pattern.exec(working);
        if (!match?.[1]) continue;
        const stripped = stripDeterministicTrailingNoise(match[1]);
        if (!stripped) continue;
        nameCandidate = stripped;
        break;
    }

    if (!nameCandidate || nameCandidate.includes('@')) return undefined;
    const name = nameCandidate.replace(/\s+/g, ' ').trim();
    if (name.length < 2 || DETERMINISTIC_NAME_STOP_WORDS.has(name.toLowerCase())) return undefined;

    let folderId = folders[0].id;
    let resolvedName = name;
    for (const folder of folders) {
        if (!folder.name) continue;
        const folderSuffix = new RegExp(
            `\\s+(?:in|under|into|to)\\s+(?:the\\s+)?${escapeDeterministicRegExp(folder.name)}(?:\\s+folder|\\s+category)?\\s*$`,
            'i',
        );
        const stripped = resolvedName.replace(folderSuffix, '').trim();
        if (stripped && stripped !== resolvedName) {
            resolvedName = stripped;
            folderId = folder.id;
            break;
        }
    }

    const draft: AssistantContactDraft = {
        name: resolvedName,
        folderId,
        ...(email ? { email } : {}),
    };
    for (const entry of phoneEntries) {
        if (!draft[entry.field]) draft[entry.field] = entry.number;
    }
    if (phoneEntries.length > 0) {
        draft.primaryPhoneType = phoneEntries[0].field;
    }

    const parsed = AssistantContactDraftSchema.safeParse(draft);
    if (!parsed.success) return undefined;

    return { type: 'open_contact_form', draft: parsed.data };
}