import { z } from 'zod';

import { resolveDefaultContactFolderId, findMatchingContactFolder } from '@/lib/contact-folders';

const optionalText = z.string().trim().optional();
const optionalDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD.').optional();

export const AssistantContactDraftSchema = z.object({
    name: z.string().trim().min(2),
    // Optional: a contact may be drafted/submitted without a role (beta
    // requirement). When absent, dispatch falls back to the default folder.
    folderId: z.string().trim().min(1).optional(),
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

export const AssistantContactDraftPatchSchema = AssistantContactDraftSchema.partial().refine(
    (patch) => Object.keys(patch).length > 0,
    { message: 'Contact draft patches must include at least one field.' },
);

export type AssistantContactDraftPatch = z.infer<typeof AssistantContactDraftPatchSchema>;

export const AssistantClientActionSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('open_contact_form'),
        draft: AssistantContactDraftSchema,
    }).strict(),
    z.object({
        type: z.literal('update_contact_draft'),
        patch: AssistantContactDraftPatchSchema,
    }).strict(),
    z.object({
        type: z.literal('submit_contact_form'),
        patch: AssistantContactDraftPatchSchema.optional(),
    }).strict(),
    z.object({
        type: z.literal('open_contact'),
        contactId: z.string().trim().min(1),
        patch: AssistantContactDraftPatchSchema.optional(),
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

    if (parsed.data.type === 'open_contact_form' || parsed.data.type === 'update_contact_draft') {
        const allowedFolders = new Set(validFolderIds);
        const folderId = parsed.data.type === 'open_contact_form'
            ? parsed.data.draft.folderId
            : parsed.data.patch.folderId;
        if (folderId !== undefined && !allowedFolders.has(folderId)) return undefined;
    }

    if ((parsed.data.type === 'open_contact' || parsed.data.type === 'submit_contact_form') && parsed.data.patch?.folderId !== undefined) {
        const allowedFolders = new Set(validFolderIds);
        if (!allowedFolders.has(parsed.data.patch.folderId)) return undefined;
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
 * Helper to match a folder reference against tenant folders:
 * 1. Exact or case-insensitive match on folder.id
 * 2. Exact or case-insensitive match on folder.name
 * 3. Match on the last segment of hierarchical paths (e.g. "Workers / Employees" -> "Employees")
 */
function findMatchingTenantFolder(
    wanted: string,
    folders: ReadonlyArray<{ id: string; name: string }>,
): { id: string; name: string } | undefined {
    return findMatchingContactFolder(wanted, folders);
}

/**
 * Resolves a capability action like `resolveAssistantCapabilityAction`, but
 * repairs the most common model slip first: echoing the folder NAME (or an
 * unknown id) instead of a real tenant folder id, or flattening patch fields
 * to the top level. Falls back to the system "Miscellaneous" folder for
 * open_contact_form so the form action survives; the user can still change the
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
        folders.length > 0
    ) {
        const raw = value as Record<string, unknown>;
        const rawType = typeof raw.type === 'string' ? raw.type : '';

        if (rawType === 'open_contact_form' || rawType === 'update_contact_draft') {
            const actionType = rawType as 'open_contact_form' | 'update_contact_draft';
            const payloadKey = actionType === 'open_contact_form' ? 'draft' : 'patch';
            const rawPayload = (raw[payloadKey] && typeof raw[payloadKey] === 'object')
                ? (raw[payloadKey] as Record<string, unknown>)
                : {};

            // Flattened recovery: extract folderId or other draft/patch fields if top-level
            const payload: Record<string, unknown> = { ...rawPayload };
            if (raw.folderId && typeof raw.folderId === 'string' && !payload.folderId) {
                payload.folderId = raw.folderId;
            }
            if (raw.name && typeof raw.name === 'string' && !payload.name) {
                payload.name = raw.name;
            }

            const wantedFolder = typeof payload.folderId === 'string' ? payload.folderId.trim() : '';
            if (wantedFolder) {
                const matchedFolder = findMatchingTenantFolder(wantedFolder, folders);
                const folderId = matchedFolder?.id ?? (actionType === 'open_contact_form' ? resolveDefaultContactFolderId(folders) : undefined);
                if (folderId) {
                    payload.folderId = folderId;
                } else if (actionType === 'update_contact_draft') {
                    // Unresolvable folder in patch: drop folderId so other patched fields survive
                    delete payload.folderId;
                }
            } else if (actionType === 'open_contact_form' && !payload.folderId) {
                payload.folderId = resolveDefaultContactFolderId(folders);
            }

            if (actionType === 'open_contact_form' && !payload.name && typeof raw.name === 'string') {
                payload.name = raw.name;
            }

            if (Object.keys(payload).length > 0) {
                const repaired = resolveAssistantCapabilityAction(
                    { type: actionType, [payloadKey]: payload },
                    folders.map((folder) => folder.id),
                );
                if (repaired) {
                    console.warn('[assistant-actions] repaired capability draft folder id', {
                        originalFolderId: wantedFolder || null,
                        repairedFolderId: payload.folderId ?? null,
                    });
                    return repaired;
                }
            }
        }
    }

    // `open_contact` patches carry an already-valid contactId; an unresolvable
    // folderId in the optional patch shouldn't sink the whole action, so drop
    // just that field and let the rest of the patch (and the navigation) stand.
    if (
        value &&
        typeof value === 'object' &&
        (value as { type?: unknown }).type === 'open_contact' &&
        (value as { patch?: unknown }).patch &&
        typeof (value as { patch?: unknown }).patch === 'object'
    ) {
        const { patch, ...rest } = value as Record<string, unknown>;
        const patchObj = patch as Record<string, unknown>;
        let patchWithoutFolder = { ...patchObj };
        if (typeof patchObj.folderId === 'string') {
            const matched = findMatchingTenantFolder(patchObj.folderId, folders);
            if (matched) {
                patchWithoutFolder.folderId = matched.id;
            } else {
                delete patchWithoutFolder.folderId;
            }
        }
        const repaired = resolveAssistantCapabilityAction(
            Object.keys(patchWithoutFolder).length > 0 ? { ...rest, patch: patchWithoutFolder } : rest,
            folders.map((folder) => folder.id),
        );
        if (repaired) {
            console.warn('[assistant-actions] repaired or dropped unresolvable open_contact patch folder id');
            return repaired;
        }
    }

    return undefined;
}

const DRAFT_FIELD_KEYS = Object.keys(AssistantContactDraftSchema.shape) as Array<keyof AssistantContactDraft>;

/** Keeps only non-empty, individually valid snapshot fields and resolves the folder to a tenant folder id. */
function sanitizeDraftSnapshot(
    snapshot: unknown,
    folders: ReadonlyArray<{ id: string; name: string }>,
): AssistantContactDraftPatch | undefined {
    if (!snapshot || typeof snapshot !== 'object') return undefined;
    const raw = snapshot as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    for (const key of DRAFT_FIELD_KEYS) {
        const value = raw[key];
        if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) continue;

        if (key === 'folderId') {
            const folder = typeof value === 'string' ? findMatchingTenantFolder(value, folders) : undefined;
            if (folder) patch.folderId = folder.id;
            continue;
        }

        const parsed = (AssistantContactDraftSchema.shape[key] as z.ZodTypeAny).safeParse(value);
        if (parsed.success && parsed.data !== undefined) patch[key] = parsed.data;
    }

    return Object.keys(patch).length > 0 ? (patch as AssistantContactDraftPatch) : undefined;
}

type HistoryEntry = { action?: unknown;[key: string]: unknown };
type FormSession = { mode: 'create' | 'edit'; contactId?: string };
type CatalogContact = { id: string; name: string; email?: string; businessName?: string; folderId?: string };

/** The contact form the thread last opened, or null once it was submitted or never opened. */
export function getContactFormSession(history: ReadonlyArray<HistoryEntry>): FormSession | null {
    for (let index = history.length - 1; index >= 0; index -= 1) {
        const action = parseAssistantMessageAction(history[index]?.action);
        if (!action) continue;
        if (action.type === 'submit_contact_form') return null;
        if (action.type === 'open_contact') return { mode: 'edit', contactId: action.contactId };
        if (action.type === 'open_contact_form') return { mode: 'create' };
        if (action.type === 'dispatch' && action.target === ASSISTANT_DESTINATIONS.new_contact.target) return { mode: 'create' };
    }
    return null;
}

export function isContactFormOpenInHistory(history: ReadonlyArray<HistoryEntry>): boolean {
    return getContactFormSession(history) !== null;
}

const sameText = (a: unknown, b: unknown) =>
    String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

/**
 * In an edit only fields that differ from the stored record may change, and a
 * rename or folder move needs the user's latest message to ask for it.
 */
function guardEditPatch(
    patch: AssistantContactDraftPatch | undefined,
    current: CatalogContact | undefined,
    userMessage: string | undefined,
    folders: ReadonlyArray<{ id: string; name: string }>,
): AssistantContactDraftPatch | undefined {
    if (!patch) return undefined;
    const message = (userMessage ?? '').toLowerCase();
    const guarded: Record<string, unknown> = { ...patch };

    for (const key of Object.keys(guarded)) {
        const value = guarded[key];
        if (current && key in current && sameText((current as Record<string, unknown>)[key], value)) {
            delete guarded[key];
            continue;
        }
        if (key === 'name' && !message.includes(String(value).trim().toLowerCase())) delete guarded[key];
        if (key === 'folderId') {
            const folderName = folders.find((folder) => folder.id === value)?.name.trim().toLowerCase();
            if (!folderName || !message.includes(folderName)) delete guarded[key];
        }
    }

    return Object.keys(guarded).length > 0 ? (guarded as AssistantContactDraftPatch) : undefined;
}

/**
 * Turns the model's cumulative draft snapshot into the form action, so the form
 * receives every field the reply claims even when the model forgot the action.
 */
export function reconcileContactDraftAction(input: {
    action: unknown;
    snapshot: unknown;
    history: ReadonlyArray<HistoryEntry>;
    folders: ReadonlyArray<{ id: string; name: string }>;
    contacts?: ReadonlyArray<CatalogContact>;
    userMessage?: string;
}): unknown {
    const { action, snapshot, history, folders, contacts, userMessage } = input;
    const session = getContactFormSession(history);
    if (!session) return action;

    const current = session.contactId ? contacts?.find((contact) => contact.id === session.contactId) : undefined;
    const guard = (patch: AssistantContactDraftPatch | undefined) =>
        session.mode === 'edit' ? guardEditPatch(patch, current, userMessage, folders) : patch;

    const type = action && typeof action === 'object' ? (action as { type?: unknown }).type : undefined;
    const known = guard(sanitizeDraftSnapshot(snapshot, folders));
    const modelPatch = type === 'update_contact_draft'
        ? guard(sanitizeDraftSnapshot((action as { patch?: unknown }).patch, folders))
        : undefined;
    const merged = { ...known, ...modelPatch } as AssistantContactDraftPatch;
    const hasChanges = Object.keys(merged).length > 0;

    if (type === 'submit_contact_form') {
        if (hasChanges) return { type: 'submit_contact_form', patch: merged };
        return session.mode === 'edit' ? { type: 'submit_contact_form' } : action;
    }

    if (type === undefined || type === 'update_contact_draft') {
        if (hasChanges) return { type: 'update_contact_draft', patch: merged };
        return session.mode === 'edit' ? undefined : action;
    }

    return action;
}

const DETERMINISTIC_FOLDER_PHRASE_PATTERN = /\bcontact\s+in\s+(?:the\s+)?([^.!?]+?)\s+folder\b[.,!]?\s*(.*)$/i;

/**
 * Deterministic fallback for the AI contact capability: extracts a name (and
 * optional email/phone) from a plain sentence such as "Make a contact for Nick
 * Illiopoulos email address of nick@ogeemo.com" or "create a contact for Sam
 * Sneed, cell #4166666797", and returns an `open_contact_form` action using
 * the "Miscellaneous" folder (falling back to the first tenant folder) as the
 * default. Returns `undefined` when no usable contact name can be extracted.
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

    // Folder-first phrasing: "create a new contact in the friends folder. John
    // Test with email address John@gmail.com" — the folder precedes the name.
    let capturedFolderName: string | undefined;
    let postFolderText: string | undefined;
    const folderPhraseMatch = DETERMINISTIC_FOLDER_PHRASE_PATTERN.exec(working);
    if (folderPhraseMatch) {
        capturedFolderName = folderPhraseMatch[1].trim();
        postFolderText = folderPhraseMatch[2] ?? '';
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
    if (!nameCandidate && postFolderText) {
        nameCandidate = stripDeterministicTrailingNoise(postFolderText.replace(/^for\s+/i, ''));
    }

    if (!nameCandidate || nameCandidate.includes('@')) return undefined;
    const name = nameCandidate.replace(/\s+/g, ' ').trim();
    if (name.length < 2 || DETERMINISTIC_NAME_STOP_WORDS.has(name.toLowerCase())) return undefined;

    const defaultFolderId = resolveDefaultContactFolderId(folders);
    if (!defaultFolderId) return undefined;
    let folderId = defaultFolderId;
    let resolvedName = name;

    const wantedFolder = (capturedFolderName ?? '').toLowerCase();
    const matchedFolder = wantedFolder
        ? folders.find((folder) => folder.name.trim().toLowerCase() === wantedFolder)
        : undefined;
    if (matchedFolder) {
        folderId = matchedFolder.id;
    }

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