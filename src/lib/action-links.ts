/**
 * Shortcut links (pure; see tests/action-links.test.ts).
 *
 * A My Shortcuts chip is either a page inside Ogeemo or a web address. The Custom URL box used to accept
 * anything that started with "/", but "//evil.example" starts with "/" too and a browser reads it as a
 * link to another site, not a page here. It also never checked that an https address was an address at
 * all ("https://" alone passed), and it accepted a label of only spaces. The rules here decide what a
 * link is, so a shortcut always goes where its label says.
 */

export type LinkKind = 'internal' | 'external';

export type LinkCheck =
  | { ok: true; href: string; kind: LinkKind }
  | { ok: false; error: string };

const MAX_LABEL = 40;
const MAX_URL = 2000;

/** A label shown on the button: trimmed, one line, not blank, not so long it cannot fit. */
export function checkChipLabel(value: unknown): { ok: true; label: string } | { ok: false; error: string } {
  const label = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!label) return { ok: false, error: 'Enter a label for the shortcut.' };
  if (label.length > MAX_LABEL) return { ok: false, error: `A label can have at most ${MAX_LABEL} characters.` };
  return { ok: true, label };
}

/**
 * What a custom link is. A path inside Ogeemo starts with a single slash. A web address is http or https
 * with a real host. Everything else (javascript:, data:, //other-site, a bare word) is refused.
 */
export function checkCustomLink(value: unknown): LinkCheck {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return { ok: false, error: 'Enter a web address or a page path.' };
  if (raw.length > MAX_URL) return { ok: false, error: 'That link is too long.' };
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return { ok: false, error: 'A link cannot contain spaces or line breaks.' };

  if (raw.startsWith('/')) {
    // "//host" and "/\host" are read by browsers as another website, not a page here.
    if (raw.startsWith('//') || raw.startsWith('/\\')) {
      return { ok: false, error: 'That looks like a link to another site. Start it with https:// for a website, or use a path like /contacts.' };
    }
    if (raw.includes('\\')) return { ok: false, error: 'A page path cannot contain a backslash.' };
    return { ok: true, href: raw, kind: 'internal' };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'Enter a full web address such as https://example.com, or a page path such as /contacts.' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, error: 'Only http and https links are allowed.' };
  }
  if (!url.hostname || !url.hostname.includes('.') && url.hostname !== 'localhost') {
    return { ok: false, error: 'That web address has no valid site name.' };
  }
  if (url.username || url.password) {
    return { ok: false, error: 'A link cannot contain a user name or password.' };
  }
  return { ok: true, href: url.toString(), kind: 'external' };
}

/**
 * The href of a stored chip as plain text, for deciding how to open it. Older chips may hold an object
 * with a pathname and a query.
 */
export function chipHref(href: string | { pathname: string; query?: Record<string, string> } | null | undefined): string {
  if (!href) return '';
  if (typeof href === 'string') return href;
  const query = href.query ? new URLSearchParams(href.query).toString() : '';
  return query ? `${href.pathname}?${query}` : href.pathname;
}

/** How a stored chip should open: 'external' in a new tab, 'internal' in the app, or 'none' when it is unsafe or empty. */
export function openModeFor(href: string | { pathname: string; query?: Record<string, string> } | null | undefined): { mode: LinkKind | 'none'; target: string } {
  const text = chipHref(href).trim();
  if (!text) return { mode: 'none', target: '' };
  const checked = checkCustomLink(text);
  if (!checked.ok) return { mode: 'none', target: '' };
  return { mode: checked.kind, target: checked.href };
}

export interface ChipLike {
  id: string;
  label: string;
  href: string | { pathname: string; query?: Record<string, string> };
}

/** A shortcut that already points at this link (so the same page is not added twice). */
export function findDuplicateChip(
  chips: readonly ChipLike[],
  href: string,
  excludeId?: string
): ChipLike | undefined {
  const wanted = href.trim().toLowerCase().replace(/\/+$/, '');
  return chips.find((chip) => chip.id !== excludeId && chipHref(chip.href).trim().toLowerCase().replace(/\/+$/, '') === wanted);
}
