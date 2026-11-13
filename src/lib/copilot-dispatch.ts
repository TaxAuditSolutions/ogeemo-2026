/**
 * What the Co-Pilot says and does when a typed request resolves to a screen ("open contacts hub", "go to the
 * calendar"). Pure; see tests/copilot-dispatch.test.ts.
 *
 * It used to answer "X is ready. Click 'X' below to open it." and wait for a click. It now opens the screen straight
 * away AND keeps the button in the reply, so a blocked or failed navigation still leaves a way in.
 *
 * A reply the command processor wrote on purpose ("You can create a contact in Contacts Hub. Click ... to open it") is
 * advice, so it is a button only: the person has not asked to leave the chat.
 *
 * A link to ANOTHER site (a Google app) cannot be opened from here. A browser only lets a page open a new tab during
 * the instant of the person's keypress, and by the time the chat has saved the message that instant is gone, so the tab
 * was blocked and only the button was left. The chat now opens the tab FIRST, at the keypress, before anything is
 * saved (see `externalTabTarget` and `sendMessage`), and this file only words the reply: "Opening ... in a new tab"
 * when the tab opened, the button when the browser blocked it.
 */
import { isInternalPath } from '@/lib/ai-input';

export interface DispatchCommand {
  label?: string;
  assistantMessage?: string;
  isExternal?: boolean;
  target?: string;
}

/**
 * The address to open in a new tab at the keypress, or null when nothing should be opened that way. Only an
 * https address of a command that is marked as another site; advice replies and Ogeemo's own screens are never opened here.
 */
export function externalTabTarget(command: DispatchCommand | null | undefined): string | null {
  if (!command || !command.isExternal || command.assistantMessage) return null;
  const target = typeof command.target === 'string' ? command.target.trim() : '';
  return /^https:\/\/[^\s/]+/i.test(target) ? target : null;
}

/** What `window.open` gives back: a handle to the new tab, or null when the browser blocked it. */
export type OpenedTab = { opener: unknown } | null;

/**
 * Opens `url` in a new tab and says whether it opened. Called at the keypress, before any waiting, because a browser
 * only allows a new tab during that instant. The new tab is cut off from this page (`opener = null`) so the other
 * site cannot reach back into Ogeemo. A blocked tab, or any error, is simply `false`: the reply then keeps its button.
 */
export function openExternalTab(url: string, openWindow: (url: string, target: string) => OpenedTab): boolean {
  try {
    const tab = openWindow(url, '_blank');
    if (!tab) return false;
    try {
      tab.opener = null;
    } catch {
      // Some browsers do not allow it; the tab is already open and the address is a fixed, trusted one.
    }
    return true;
  } catch {
    return false;
  }
}

export interface DispatchReply {
  /** What the Co-Pilot says. Never claims the screen is open: it says it is opening it. */
  content: string;
  /** Whether to navigate now. */
  autoOpen: boolean;
}

export function describeDispatch(command: DispatchCommand, options: { openedNewTab?: boolean } = {}): DispatchReply {
  const label = (command.label || 'Requested destination').trim() || 'Requested destination';
  if (command.assistantMessage) return { content: command.assistantMessage, autoOpen: false };
  if (command.isExternal && options.openedNewTab) {
    return { content: `Opening ${label} in a new tab. If it does not open, click '${label}' below.`, autoOpen: false };
  }
  if (command.isExternal) return { content: `${label} is ready. Click '${label}' below to open it.`, autoOpen: false };
  return { content: `Opening ${label}. If it does not open, click '${label}' below.`, autoOpen: true };
}

/** The path and query of a target, without the origin. */
function parts(target: string): { path: string; query: string } {
  const at = target.indexOf('?');
  const path = (at < 0 ? target : target.slice(0, at)).replace(/\/+$/, '') || '/';
  return { path, query: at < 0 ? '' : target.slice(at + 1) };
}

/**
 * The place to navigate to, or null when nothing should happen: not allowed to auto-open, not a path inside Ogeemo,
 * or the person is already there (a link with a query, such as ?startTimer=true, still goes: it asks for something).
 */
export function autoOpenTarget(reply: DispatchReply, target: string, currentPath: string): string | null {
  if (!reply.autoOpen || typeof target !== 'string' || !isInternalPath(target)) return null;
  const wanted = parts(target);
  if (!wanted.query && wanted.path === parts(currentPath || '/').path) return null;
  return target;
}
