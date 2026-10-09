export type ContactValues = Record<string, unknown>;

// Only Full Legal Name is mandatory; the role/folder is optional per beta
// requirement (a contact may be saved unfiled, or with the default folder).
const REQUIRED_CONTACT_KEYS = new Set(['name']);

export function isBlankValue(value: unknown): boolean {
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/** Required fields can never be saved blank, even when a caller asks to clear them. */
export function isBlankRequiredContactField(key: string, value: unknown): boolean {
    return REQUIRED_CONTACT_KEYS.has(key) && isBlankValue(value);
}

function normalizeForCompare(value: unknown): unknown {
    if (value instanceof Date) return value.toISOString().split('T')[0];
    if (value && typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
        return normalizeForCompare((value as { toDate: () => Date }).toDate());
    }
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value.trim();
    return value;
}

export function contactValuesEqual(a: unknown, b: unknown): boolean {
    return normalizeForCompare(a) === normalizeForCompare(b);
}

/**
 * Builds the edit payload from only the fields the user or assistant actually
 * changed, so every untouched field keeps its stored value.
 */
export function buildContactUpdatePayload(input: {
    baseline: ContactValues;
    values: ContactValues;
    editedKeys: ReadonlySet<string>;
}): { changes: ContactValues; blocked: string[] } {
    const changes: ContactValues = {};
    const blocked: string[] = [];

    for (const key of input.editedKeys) {
        if (!(key in input.values)) continue;
        const next = input.values[key];
        if (isBlankRequiredContactField(key, next)) {
            blocked.push(key);
            continue;
        }
        if (contactValuesEqual(input.baseline[key], next)) continue;
        changes[key] = next;
    }

    return { changes, blocked };
}
