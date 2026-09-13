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

export const AssistantApiResponseSchema = z.object({
    answer: z.string(),
    action: AssistantClientActionSchema.optional(),
}).strict();

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