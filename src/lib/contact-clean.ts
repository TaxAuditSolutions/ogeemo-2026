/**
 * Contact data cleaning and checks (pure; see tests/contact-clean.test.ts).
 *
 * Whitespace is trimmed before a contact is saved, so "  Bob " and "Bob" are one person and an
 * email typed with capitals still matches the same address in lower case. A SIN is checked with
 * the same check-digit test the government uses, so a mistyped number is caught before payroll
 * relies on it.
 */

type Values = Record<string, unknown>;

/** Trims every text field; collapses repeated spaces in the name; stores the email in lower case. */
export function cleanContactInput<T extends Values>(data: T): T {
  const out: Values = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'string') {
      out[key] = value;
      continue;
    }
    const trimmed = value.trim();
    if (key === 'name') out[key] = trimmed.replace(/\s+/g, ' ');
    else if (key === 'email') out[key] = trimmed.toLowerCase();
    else out[key] = trimmed;
  }
  return out as T;
}

/** A contact needs a real name: at least 2 characters once trimmed. */
export function checkContactName(name: unknown): string | null {
  const text = typeof name === 'string' ? name.trim() : '';
  if (text.length < 2) return 'Enter the contact\'s full name (at least 2 characters).';
  return null;
}

export type SinCheck = { ok: true; sin: string } | { ok: false; error: string };

/** Blank is allowed (not every contact is a worker). Otherwise 9 digits that pass the check-digit test. */
export function validateSin(value: unknown): SinCheck {
  const digits = typeof value === 'string' ? value.replace(/[\s-]/g, '') : '';
  if (!digits) return { ok: true, sin: '' };
  if (!/^\d{9}$/.test(digits)) return { ok: false, error: 'A SIN has 9 digits (spaces and dashes are fine).' };
  if (/^(\d)\1{8}$/.test(digits)) return { ok: false, error: 'That is not a valid SIN.' };

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = Number(digits[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  if (sum % 10 !== 0) return { ok: false, error: 'That SIN does not pass the check-digit test. Check for a mistyped digit.' };
  return { ok: true, sin: digits };
}

export interface DuplicateCandidate {
  id?: string;
  name?: string;
  email?: string;
  businessName?: string;
}

export interface PossibleDuplicate {
  id: string;
  name: string;
  reason: 'email' | 'name';
}

const normName = (value: unknown) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : '');
const normEmail = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/** Existing contacts that look like the same person: the same email, or the same name. */
export function findPossibleDuplicates(
  existing: readonly DuplicateCandidate[],
  candidate: DuplicateCandidate,
  excludeId?: string
): PossibleDuplicate[] {
  const email = normEmail(candidate.email);
  const name = normName(candidate.name);
  const found: PossibleDuplicate[] = [];
  for (const other of existing) {
    if (!other.id || other.id === excludeId) continue;
    if (email && normEmail(other.email) === email) {
      found.push({ id: other.id, name: other.name || email, reason: 'email' });
    } else if (name && normName(other.name) === name) {
      found.push({ id: other.id, name: other.name || name, reason: 'name' });
    }
  }
  return found;
}

/** One sentence for the "save anyway?" prompt. */
export function duplicateMessage(matches: readonly PossibleDuplicate[]): string {
  if (matches.length === 0) return '';
  const first = matches[0];
  const sameEmail = first.reason === 'email';
  if (matches.length === 1) {
    return `"${first.name}" already has ${sameEmail ? 'the same email address' : 'the same name'}.`;
  }
  return `"${first.name}" and ${matches.length - 1} more already match (same ${sameEmail ? 'email address' : 'name'}).`;
}