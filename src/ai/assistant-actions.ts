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