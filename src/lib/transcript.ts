/**
 * Appends recognized speech to an existing narrative field.
 * Never replaces, never doubles-up on whitespace (voice-to-text helper,
 * beta: low-friction documentation - docs/activity-capture.md).
 */
export function appendTranscript(current: string, addition: string): string {
    const piece = addition.trim();
    if (!piece) return current;
    if (!current) return piece;
    const needsSeparator = !/[\s]$/.test(current);
    return `${current}${needsSeparator ? ' ' : ''}${piece}`;
}
