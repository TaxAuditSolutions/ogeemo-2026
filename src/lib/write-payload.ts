/**
 * Firestore write-payload helpers.
 *
 * The Firestore Web SDK rejects `undefined` field values outright:
 * addDoc/setDoc/updateDoc throw "Function ... called with invalid data.
 * Unsupported field value: undefined" (verified empirically against the
 * installed SDK). Any form that maps blank optional inputs to `undefined`
 * therefore turns into a failed save - so writes must express
 * "absent" by omitting the key, and "empty" by null.
 */

/** Shallow copy without `undefined`-valued keys (absent = not provided). */
export function omitUndefined<T extends object>(data: T): Partial<T> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (value !== undefined) out[key] = value;
    }
    return out as Partial<T>;
}

/** Shallow copy with `undefined` values converted to `null` (empty), for updates. */
export function replaceUndefinedWithNull<T extends object>(data: T): Partial<T> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        out[key] = value === undefined ? null : value;
    }
    return out as Partial<T>;
}
