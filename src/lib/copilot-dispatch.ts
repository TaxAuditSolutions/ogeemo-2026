/**
 * What the Co-Pilot says and does when a typed request resolves to a screen ("open contacts hub", "go to the
 * calendar"). Pure; see tests/copilot-dispatch.test.ts.
 *
 * It used to answer "X is ready. Click 'X' below to open it." and wait for a click. It now opens the screen straight
 * away AND keeps the button in the reply, so a blocked or failed navigation still leaves a way in.
 *
 * Two cases are left as a button only, because opening the page would be wrong:
 *   - a reply the command processor wrote on purpose ("You can create a contact in Contacts Hub. Click ... to open
 *     it"): that is advice, and the person has not asked to leave the chat;
 *   - a link to another site (it would be a pop-up, which browsers block, and it leaves Ogeemo).
 */
import { isInternalPath } from '@/lib/ai-input';

export interface DispatchCommand {
  label?: string;
  assistantMessage?: string;
  isExternal?: boolean;
}

export interface DispatchReply {
  /** What the Co-Pilot says. Never claims the screen is open: it says it is opening it. */
  content: string;
  /** Whether to navigate now. */
  autoOpen: boolean;
}

export function describeDispatch(command: DispatchCommand): DispatchReply {
  const label = (command.label || 'Requested destination').trim() || 'Requested destination';
  if (command.assistantMessage) return { content: command.assistantMessage, autoOpen: false };
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
