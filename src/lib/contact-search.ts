/**
 * Contact list search (pure; see tests/contact-folder-rules.test.ts).
 *
 * Every word typed must match somewhere in the contact's name, email, company, phone numbers,
 * city or notes, so "bob barrie" finds Bob Smith of Barrie. Digits in a phone number match however
 * the number was punctuated. Sensitive HR fields such as the SIN are never searched.
 */

export interface SearchableContact {
  name?: string;
  email?: string;
  businessName?: string;
  businessPhone?: string;
  cellPhone?: string;
  homePhone?: string;
  city?: string;
  jobRole?: string;
  notes?: string;
}

const lower = (value: unknown) => (typeof value === 'string' ? value.toLowerCase() : '');
const digits = (value: unknown) => (typeof value === 'string' ? value.replace(/\D/g, '') : '');

export function contactMatchesQuery(contact: SearchableContact, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const text = [contact.name, contact.email, contact.businessName, contact.city, contact.jobRole, contact.notes]
    .map(lower)
    .join(' \n ');
  const phones = [contact.businessPhone, contact.cellPhone, contact.homePhone].map(digits);

  return words.every((word) => {
    if (text.includes(word)) return true;
    const wordDigits = word.replace(/\D/g, '');
    // Only a real run of digits is a phone search, so "a1" does not match every number.
    return wordDigits.length >= 3 && wordDigits === word.replace(/[\s().+-]/g, '') && phones.some((phone) => phone.includes(wordDigits));
  });
}

export function filterContacts<T extends SearchableContact>(contacts: readonly T[], query: string): T[] {
  if (!query.trim()) return [...contacts];
  return contacts.filter((contact) => contactMatchesQuery(contact, query));
}
