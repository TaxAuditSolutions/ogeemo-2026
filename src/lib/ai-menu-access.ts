/**
 * Whether a person's menu access lets them see a screen (pure; see tests/ai-menu-access.test.ts).
 *
 * An administrator can limit a person's menu to chosen items ("allowlist") or hide some ("blocklist"). Firestore does
 * not enforce that, only the app's menu and search do, so a tool that reads the same records for the Co-Pilot has to
 * apply it too, or the Co-Pilot would show a person data the app hides from them.
 */
export interface SidebarAccessLike {
  mode?: string;
  allowedMenuItems?: unknown;
  hiddenMenuItems?: unknown;
}

const list = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

/** True when the screen at `href` is available to the person; nothing set means it is (the role decides). */
export function menuAllows(access: SidebarAccessLike | null | undefined, href: string): boolean {
  if (!access || typeof access !== 'object') return true;
  if (access.mode === 'allowlist') return list(access.allowedMenuItems).includes(href);
  if (access.mode === 'blocklist') return !list(access.hiddenMenuItems).includes(href);
  return true;
}
