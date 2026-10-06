/**
 * Firestore Timestamp / Date / ISO-string -> 'YYYY-MM-DD' for
 * <input type="date">. Never throws: unparseable values become '' instead of
 * crashing on toISOString() (the Edit Worker form hit this on workers that
 * have a hireDate stored as a Firestore Timestamp).
 */
export function toDateInputValue(value: unknown): string {
    if (!value) return '';
    let d: Date | undefined;
    if (value instanceof Date) {
        d = value;
    } else if (typeof (value as any)?.toDate === 'function') {
        d = (value as any).toDate();
    } else if (typeof (value as any)?.seconds === 'number') {
        d = new Date((value as any).seconds * 1000);
    } else if (typeof (value as any)?._seconds === 'number') {
        d = new Date((value as any)._seconds * 1000);
    } else if (typeof value === 'string' || typeof value === 'number') {
        d = new Date(value);
    }
    return d && !Number.isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
}
