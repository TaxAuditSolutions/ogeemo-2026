/**
 * Per-user localStorage map recording the "bring the welcome doors back"
 * override for the Welcome page. Written from two places: the Welcome page
 * itself ("Show the getting-started doors" / "Back to your workflow") and
 * the Workflows page ("Set as standard", which clears the override so a
 * saved standard workflow always wins over a previous restore choice).
 */
const DOORS_SHOWN_KEY = 'ogeemo-welcome-doors';

/** Reads the restore override for one user; safe under blocked storage. */
export function readDoorsOverride(uid: string): boolean {
  try {
    const raw = window.localStorage.getItem(DOORS_SHOWN_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    return all[uid] === true;
  } catch {
    return false;
  }
}

/** Persists the restore override for one user (true = doors shown). */
export function writeDoorsOverride(uid: string, shown: boolean): void {
  try {
    const raw = window.localStorage.getItem(DOORS_SHOWN_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    all[uid] = shown;
    window.localStorage.setItem(DOORS_SHOWN_KEY, JSON.stringify(all));
  } catch (error) {
    console.error('Failed to save welcome door preference:', error);
  }
}
