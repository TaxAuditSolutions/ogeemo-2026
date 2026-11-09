/**
 * The search keywords saved on every contact (pure; see tests/ai-contact.test.ts).
 *
 * Shared by the Contacts Hub save (src/services/contact-service.ts) and the Co-Pilot's createContact tool, so a contact
 * made by either is found by the same words.
 */
export interface KeywordSource {
  name?: unknown;
  email?: unknown;
  businessName?: unknown;
  employeeNumber?: unknown;
  sin?: unknown;
}

export function generateContactKeywords(data: KeywordSource): string[] {
  const keywords = new Set<string>();

  const addValue = (value: unknown) => {
    if (!value || typeof value !== 'string') return;
    const lowerCaseValue = value.toLowerCase();
    keywords.add(lowerCaseValue);
    lowerCaseValue.split(/[\s@.-]+/).forEach((part) => {
      if (part) keywords.add(part);
    });
  };

  addValue(data.name);
  addValue(data.email);
  addValue(data.businessName);
  addValue(data.employeeNumber);
  addValue(data.sin);

  return Array.from(keywords);
}
