/**
 * Should the End date of a schedule still follow the Start date?
 *
 * Beta UX request: End should autopopulate to the same day as Start. The save
 * path already defaults `endDate || startDate`, so this is purely about what
 * the picker shows - but a naive "always mirror" would stomp a deliberately
 * chosen multi-day End when the user later tweaks Start. Rule: mirror only
 * while End is empty, or still exactly the Start value it was derived from.
 */
export function endFollowsStart(prevStart: Date | undefined | null, end: Date | undefined | null): boolean {
    if (!end) return true; // nothing chosen yet - safe to fill/clear
    if (!prevStart) return false; // End chosen before Start: user's choice - keep
    return end.getTime() === prevStart.getTime(); // still the auto-derived value
}
