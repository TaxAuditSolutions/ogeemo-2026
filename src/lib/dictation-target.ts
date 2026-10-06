/**
 * Target picking for the global voice-dictation mic (GlobalDictation).
 *
 * Beta feedback: per-field mic buttons were not intuitive — the user selects a
 * field (mouse/tab, or by simply having used it) and dictates into it. Pure,
 * DOM-shape-based so it can be unit-tested outside a browser.
 */

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel']);

type MaybeEl = object | null | undefined;

function isConnectedOk(el: object): boolean {
    const v = (el as { isConnected?: unknown }).isConnected;
    return typeof v === 'boolean' ? v : true;
}

/** True for elements a user can type prose into: textareas and text-like inputs. */
export function isTextEntry(el: MaybeEl): boolean {
    if (!el || typeof el !== 'object') return false;
    if (!isConnectedOk(el)) return false;
    const tagName = (el as { tagName?: unknown }).tagName;
    if (tagName === 'TEXTAREA') return true;
    if (tagName === 'INPUT') {
        const type = (el as { type?: unknown }).type;
        const normalized = typeof type === 'string' && type ? type.toLowerCase() : 'text';
        return TEXT_INPUT_TYPES.has(normalized);
    }
    return false;
}

/**
 * Resolve where dictation should land, in order:
 * 1. the focused field (user clicked/tabbed into it),
 * 2. the last field the user touched (mic-first flows; clicking the mic must
 *    not steal focus from that field),
 * 3. a page fallback (the Activity Manager Details field).
 * Returns the first text-entry candidate, or null when nothing sensible is
 * available so the caller can prompt the user instead of dropping words.
 */
export function pickDictationField<T>(active: MaybeEl, lastFocused: MaybeEl, fallback: MaybeEl): T | null {
    for (const candidate of [active, lastFocused, fallback]) {
        if (isTextEntry(candidate)) return candidate as T;
    }
    return null;
}
