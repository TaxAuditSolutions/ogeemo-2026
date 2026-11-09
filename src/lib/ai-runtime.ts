/**
 * The operating context the AI is given for one request (pure; see tests/ai-runtime.test.ts).
 *
 * Who the user is, which workspace they are in and what their role allows come from the SERVER session, never
 * from the request body: the model reads the role as a fact and the tools act on the workspace, so a browser
 * that could choose its own orgId or accessLevel could read or write another workspace.
 */
import { oneLine } from '@/lib/ai-input';
import { describeNow, validTimeZone } from '@/lib/ai-time';

export type AccessLevel = 'super_admin' | 'org_admin' | 'editor' | 'viewer';

export interface SessionLike {
  userId: string;
  orgId?: string;
  accessLevel?: AccessLevel;
  isMasterTenant?: boolean;
}

export interface TrustedRuntimeContext {
  userId: string;
  orgId?: string;
  accessLevel?: AccessLevel;
  isMasterTenant: boolean;
  currentPath: string;
  activeOrgName?: string;
  timeZone: string;
}

/** Identity from the session; only the page, the organization's display name and the time zone come from the browser, cleaned. */
export function trustedRuntimeContext(session: SessionLike, client: unknown, fallbackPath: string): TrustedRuntimeContext {
  const raw = client && typeof client === 'object' ? (client as Record<string, unknown>) : {};
  const path = oneLine(raw.currentPath, 200);
  const currentPath = path.startsWith('/') && !path.startsWith('//') ? path : fallbackPath;
  const activeOrgName = oneLine(raw.activeOrgName, 100);
  return {
    userId: session.userId,
    ...(session.orgId ? { orgId: session.orgId } : {}),
    ...(session.accessLevel ? { accessLevel: session.accessLevel } : {}),
    isMasterTenant: session.isMasterTenant === true,
    currentPath,
    ...(activeOrgName ? { activeOrgName } : {}),
    timeZone: validTimeZone(raw.timeZone),
  };
}

/** The "Runtime Operating Context" block of the system prompt, one clean line per fact, with the user's local time. */
export function describeRuntime(
  context: Partial<TrustedRuntimeContext> | undefined,
  userId: string | undefined,
  now: Date = new Date()
): string {
  const zone = describeNow(context?.timeZone, now);
  return [
    `userId: ${oneLine(context?.userId || userId || 'unknown', 128)}`,
    `orgId: ${oneLine(context?.orgId || 'unknown', 128)}`,
    `accessLevel: ${oneLine(context?.accessLevel || 'unknown', 20)}`,
    `isMasterTenant: ${context?.isMasterTenant ? 'true' : 'false'}`,
    `currentPath: ${oneLine(context?.currentPath || '/co-pilot', 200)}`,
    `activeOrgName: ${oneLine(context?.activeOrgName || 'unknown', 100)}`,
    `timeZone: ${zone.timeZone}`,
    `currentDateTime: ${zone.iso} (${zone.weekday})`,
  ].join('\n');
}

export interface CatalogContact {
  id: string;
  name: string;
  email?: string;
  businessName?: string;
}

/**
 * The contacts listed to the model. A workspace with up to `max` contacts is sent whole (as before); a bigger one is
 * narrowed to the contacts named in the recent conversation, so the prompt does not grow with the address book.
 */
export function selectCatalogContacts<T extends CatalogContact>(contacts: readonly T[], recentText: string, max = 200): T[] {
  if (contacts.length <= max) return [...contacts];
  const words = recentText.toLowerCase().split(/[^a-z0-9@.]+/).filter((word) => word.length >= 3);
  if (words.length === 0) return [];
  return contacts
    .filter((contact) => {
      const haystack = `${contact.name} ${contact.email ?? ''} ${contact.businessName ?? ''}`.toLowerCase();
      return words.some((word) => haystack.includes(word));
    })
    .slice(0, max);
}

/** The user's last few messages plus the new one, as one string for matching. */
export function recentUserText(history: ReadonlyArray<{ role?: string; content?: unknown }>, question: string): string {
  const earlier = history
    .filter((item) => item.role !== 'model' && item.role !== 'assistant')
    .slice(-3)
    .map((item) => (typeof item.content === 'string' ? item.content : ''));
  return [...earlier, question].join(' ');
}

export interface ToolContext {
  userId?: string;
  orgId?: string;
  accessLevel?: string;
  timeZone: string;
}

/**
 * What a tool may act on, read from the context the SERVER gave the flow (never from the model's arguments).
 * Missing or odd values come back as undefined so a tool can refuse instead of guessing.
 */
export function readToolContext(context: unknown): ToolContext {
  const raw = context && typeof context === 'object' ? (context as Record<string, unknown>) : {};
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
  return {
    userId: text(raw.userId),
    orgId: text(raw.orgId),
    accessLevel: text(raw.accessLevel),
    timeZone: validTimeZone(raw.timeZone),
  };
}
