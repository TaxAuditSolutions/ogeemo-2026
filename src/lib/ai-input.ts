/**
 * Cleaning what the browser sends to the AI endpoints (pure; see tests/ai-input.test.ts).
 *
 * Everything from the browser is untrusted: a message can be huge (it is billed per token), a history can be
 * hundreds of turns, and any text that reaches the system prompt can carry instructions or line breaks.
 */

/** One line of plain text, at most `max` characters: control characters and line breaks become spaces. */
export function oneLine(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export type PromptCheck = { ok: true; text: string } | { ok: false; error: string };

/** A user message or prompt: some text, and not longer than `max` characters. */
export function checkPrompt(value: unknown, max: number): PromptCheck {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return { ok: false, error: 'Please type a message first.' };
  if (text.length > max) return { ok: false, error: `Please keep it under ${max.toLocaleString('en-US')} characters.` };
  return { ok: true, text };
}

/** True for a page inside Ogeemo. "//host" and "/\\host" are read by browsers as ANOTHER website. */
export function isInternalPath(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\');
}

/**
 * Fills {{{name}}} placeholders. A plain String.replace treats $&, $' and $` in the replacement as patterns,
 * so a knowledge file or an organization name containing them would corrupt the prompt; a function
 * replacement inserts the text exactly as written.
 */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\{(\w+)\}\}\}/g, (whole, key: string) => (key in values ? values[key] : whole));
}

export interface HistoryLimits {
  maxMessages?: number;
  maxChars?: number;
  maxTotalChars?: number;
}

const textFrom = (item: any): string => {
  if (typeof item?.content === 'string') return item.content;
  if (Array.isArray(item?.content)) {
    return item.content.slice(0, 5).map((part: any) => (typeof part === 'string' ? part : typeof part?.text === 'string' ? part.text : '')).join('\n');
  }
  return typeof item?.message === 'string' ? item.message : '';
};

/**
 * The most recent turns that fit: at most `maxMessages` turns, each cut to `maxChars`, within `maxTotalChars` in
 * all (newest kept first). Empty turns are dropped, because the model rejects a turn with no text. Only the
 * role, the text and a stored action survive; nothing else the browser attached is passed on.
 */
export function limitHistory(raw: unknown, limits: HistoryLimits = {}): Array<{ role: string; content: string; action?: unknown }> {
  const { maxMessages = 20, maxChars = 4000, maxTotalChars = 40000 } = limits;
  if (!Array.isArray(raw)) return [];
  const kept: Array<{ role: string; content: string; action?: unknown }> = [];
  let total = 0;
  for (const item of raw.slice(-maxMessages).reverse()) {
    if (!item || typeof item !== 'object') continue;
    const text = textFrom(item).slice(0, maxChars);
    if (!text.trim()) continue;
    if (total + text.length > maxTotalChars) break;
    total += text.length;
    const role = oneLine(item.role, 20).toLowerCase() || 'user';
    kept.push({ role, content: text, ...(item.action && typeof item.action === 'object' ? { action: item.action } : {}) });
  }
  return kept.reverse();
}

export interface LocalContact {
  id: string;
  name: string;
  businessName?: string;
  email?: string;
}

/** The "Personal Data Bridge" list from the browser: at most 200 contacts, text fields only, each cut short. */
export function cleanLocalContacts(value: unknown): LocalContact[] {
  if (!Array.isArray(value)) return [];
  const out: LocalContact[] = [];
  for (const item of value.slice(0, 200)) {
    const id = oneLine(item?.id, 128);
    const name = oneLine(item?.name, 120);
    if (!id || !name) continue;
    const businessName = oneLine(item?.businessName, 120);
    const email = oneLine(item?.email, 120);
    out.push({ id, name, ...(businessName ? { businessName } : {}), ...(email ? { email } : {}) });
  }
  return out;
}
