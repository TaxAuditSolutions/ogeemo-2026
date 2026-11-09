/**
 * Links stored on Document Manager folders and files (pure; see tests/drive-links.test.ts).
 *
 * A link is opened in a new tab, so anything but a plain web address is refused. javascript: and data: links
 * would run code in the page that opened them, and a link with a user name and password is a phishing trick.
 */
export type DriveLinkCheck = { ok: true; href: string } | { ok: false; error: string };

const MAX_LINK = 2000;

export function checkDriveLink(value: unknown): DriveLinkCheck {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return { ok: false, error: 'Enter a web address.' };
  if (raw.length > MAX_LINK) return { ok: false, error: 'That link is too long.' };
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return { ok: false, error: 'A link cannot contain spaces or line breaks.' };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'Enter a full web address, such as https://drive.google.com/...' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, error: 'Only http and https links are allowed.' };
  if (!url.hostname || (!url.hostname.includes('.') && url.hostname !== 'localhost')) {
    return { ok: false, error: 'That web address has no valid site name.' };
  }
  if (url.username || url.password) return { ok: false, error: 'A link cannot contain a user name or password.' };
  return { ok: true, href: url.toString() };
}

/** Like checkDriveLink, but a blank value is fine (it means "no link"). */
export function checkOptionalDriveLink(value: unknown): { ok: true; href: string | null } | { ok: false; error: string } {
  if (typeof value !== 'string' || !value.trim()) return { ok: true, href: null };
  const result = checkDriveLink(value);
  return result.ok ? { ok: true, href: result.href } : result;
}

/** The address to open for a stored link, or null when it is not a safe web address. */
export function safeDriveHref(value: unknown): string | null {
  const result = checkDriveLink(value);
  return result.ok ? result.href : null;
}
