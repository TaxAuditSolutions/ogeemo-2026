/**
 * Single source of truth for the launch offer story (pre-launch review item #2).
 *
 * Before this module existed, the homepage promised "6 months free + 50% off
 * for life" (Founding 100), the features page offered a "30-day free trial",
 * and the pricing page mentioned neither - three surfaces, three stories.
 * Every page now renders from these constants.
 *
 * Julie/Dan control the launch narrative here:
 *  - claimedCount / closeDate stay null until REAL values exist; the UI shows
 *    no counter or deadline rather than inventing scarcity (review item #7).
 *  - The standing 30-day trial (Terms §8) remains the fallback offer after the
 *    Founding 100 spots close.
 */
export const FOUNDING_OFFER = {
    /** Card/banner headline. */
    headline: 'The Founding 100',
    /** Short offer terms, exactly as promised on the homepage. */
    terms: '6 months free + 50% off for life',
    /** Plain-English price math for the pricing page. */
    lifetimePrice: 'the founding rate of $15/mo for life (50% off $30)',
    /** Total founding spots. */
    totalSpots: 100,
    /**
     * Real claimed count. Leave null until it exists - never fabricate it.
     * When set (e.g. 23), every page shows "23 of 100 claimed".
     */
    claimedCount: null as number | null,
    /**
     * Real close date (ISO, e.g. '2026-12-31'). Leave null until decided.
     * When set, pricing shows a deadline alongside the offer.
     */
    closeDate: null as string | null,
} as const;

/** The standing trial offer (defined in Terms of Service, section 8). */
export const STANDARD_TRIAL_DAYS = 30;

/** "23 of 100 claimed" - or null when no real count exists yet. */
export function foundingClaimLabel(): string | null {
    if (FOUNDING_OFFER.claimedCount === null) return null;
    return `${FOUNDING_OFFER.claimedCount} of ${FOUNDING_OFFER.totalSpots} spots claimed`;
}

/** Formatted close date - or null when no deadline has been set. */
export function foundingCloseLabel(): string | null {
    if (!FOUNDING_OFFER.closeDate) return null;
    try {
        const d = new Date(`${FOUNDING_OFFER.closeDate}T00:00:00`);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
        return null;
    }
}