/**
 * Find the contact that represents the signed-in user ("self").
 *
 * A bare `contacts.find(c => c.userId === user.uid)` is wrong: manually
 * added workers are also stamped with the saving user's userId, so the
 * first worker you add would win the lookup and be labelled "(Admin)"
 * (beta report: Brian Manzer shown as Admin in the Time Log Report).
 * Linked self-contacts always carry the account's email, so verify it.
 */
export function findSelfContact<
    T extends { userId?: string | null; email?: string | null },
    U extends { uid?: string | null; email?: string | null },
>(contacts: T[], user: U | null | undefined): T | undefined {
    if (!user?.uid) return undefined;
    const candidates = contacts.filter((c) => c.userId === user.uid);
    if (candidates.length === 0) return undefined;
    if (user.email) {
        const me = user.email.trim().toLowerCase();
        return candidates.find((c) => (c.email || '').trim().toLowerCase() === me);
    }
    return candidates[0];
}
