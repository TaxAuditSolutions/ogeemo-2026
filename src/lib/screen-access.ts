/**
 * Whether the person may be taken to a screen by the Co-Pilot or the search box (pure; see tests/screen-access.test.ts).
 *
 * The sidebar menu hides screens in three ways: an administrator-only flag, a master-tenant-only flag, and a per-person
 * allow or block list an administrator sets. The search box applied them to its menu list, but a typed "open tenant
 * manager" went around them, because the command processor knows nothing about who is asking. Firestore does not enforce
 * the allow and block lists (only the menu does), so without this a person whose administrator hid a screen could still
 * open it by typing its name. This applies the SAME rules, in one place, before anything is opened.
 *
 * It decides only about opening a screen. It does not replace the checks each page makes for itself.
 */
import { canAccessUserManager } from '@/core/rbac';
import { menuAllows, type SidebarAccessLike } from '@/lib/ai-menu-access';
import { allMenuItems, type MenuItem } from '@/lib/menu-items';

export interface ScreenAccessWho {
  /** The role from the sign-in token. */
  accessLevel?: string | null;
  /** The role from the saved profile; covers people whose token never got one (the menu does the same). */
  profileAccessLevel?: string | null;
  isMasterTenant?: boolean;
  sidebarAccess?: SidebarAccessLike | null;
}

export type ScreenAccess = { ok: true } | { ok: false; reason: 'admin' | 'owner' | 'hidden'; label: string; message: string };

/**
 * Screens that are not in the menu but are reached from one that is (a card, a button). They follow the menu screen they
 * live under, so hiding Settings from someone also closes Planning Rituals. `null` means they are open to every
 * signed-in person (the page itself decides what it shows).
 */
const PARENT_SCREEN: Record<string, string | null> = {
  '/settings/rituals': '/settings',
  '/settings/site-images': '/settings',
  '/calendar/reminders': '/calendar',
  '/inventory-manager/pos': '/inventory-manager/track',
  '/idea-board/organize': '/idea-board',
  '/change-password': null,
  '/help': null,
};

const pathOf = (target: string): string => {
  const at = target.search(/[?#]/);
  return (at < 0 ? target : target.slice(0, at)).replace(/\/+$/, '') || '/';
};

/** The menu entry for a target: the exact entry first (a ledger tab has its own), then the one with the same path. */
export function menuItemFor(target: string): MenuItem | undefined {
  const exact = allMenuItems.find((item) => item.href === target);
  if (exact) return exact;
  const path = pathOf(target);
  return allMenuItems.find((item) => pathOf(item.href) === path);
}

const DENIED = {
  admin: (label: string) => `${label} is for administrators, and your role does not include it. Ask an administrator if you need it.`,
  owner: (label: string) => `${label} is only available to the Ogeemo owner account.`,
  hidden: (label: string) => `${label} is not available in your menu. Ask an administrator if you need it.`,
} as const;

/** Applies the menu's own rules to one menu entry. */
function checkItem(item: MenuItem, who: ScreenAccessWho): ScreenAccess {
  const isAdmin = canAccessUserManager(who.accessLevel as never) || canAccessUserManager(who.profileAccessLevel as never);
  if (item.adminOnly && !isAdmin) return { ok: false, reason: 'admin', label: item.label, message: DENIED.admin(item.label) };
  if (item.masterTenantOnly && !(who.isMasterTenant === true || who.accessLevel === 'super_admin')) {
    return { ok: false, reason: 'owner', label: item.label, message: DENIED.owner(item.label) };
  }
  if (!menuAllows(who.sidebarAccess, item.href)) return { ok: false, reason: 'hidden', label: item.label, message: DENIED.hidden(item.label) };
  return { ok: true };
}

/**
 * Whether `target` (a path inside Ogeemo, with or without a query) may be opened for this person. Anything that is not a
 * known screen (an external link, a screen no rule names) is not decided here: it is allowed.
 */
export function canOpenScreen(target: string, who: ScreenAccessWho): ScreenAccess {
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//')) return { ok: true };
  const item = menuItemFor(target);
  if (item) return checkItem(item, who);
  const parent = PARENT_SCREEN[pathOf(target)];
  if (parent) {
    const parentItem = menuItemFor(parent);
    if (parentItem) return checkItem(parentItem, who);
  }
  return { ok: true };
}
