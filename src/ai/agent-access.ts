/**
 * The menu-access check the Co-Pilot's record-reading tools share (see tests/agent-invoice-tool.test.ts).
 *
 * Returns null when the person may see the screen, or a message to give them when they may not. If the profile cannot
 * be read it refuses, because these tools show money.
 */
import { menuAllows } from '@/lib/ai-menu-access';
import { oneLine } from '@/lib/ai-input';
import type { ToolContext } from '@/lib/ai-runtime';
import type { DbLike } from '@/ai/agent-tools';

const FIRESTORE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** The client's name when `id` is a contact of this workspace, or a message to give the model when it is not. */
export async function workspaceClient(db: DbLike, orgId: string, id: string): Promise<{ name: string } | { error: string }> {
  if (!FIRESTORE_ID.test(id)) return { error: 'That contact id is not valid. Search for the contact first and use its id.' };
  const contact = await db.collection('contacts').doc(id).get();
  if (!(contact.exists && contact.data()?.orgId === orgId)) {
    return { error: 'That contact was not found in this workspace. Search for the contact first and use the id it returns.' };
  }
  return { name: oneLine(contact.data()?.name, 80) };
}

export async function screenAccessProblem(db: DbLike, ctx: ToolContext, href: string, screen: string): Promise<string | null> {
  try {
    const profile = await db.collection('users').doc(ctx.userId as string).get();
    if (profile.exists && !menuAllows(profile.data()?.sidebarAccess, href)) {
      return `Your menu access does not include ${screen}, so I cannot show it. An administrator can change that under Team & Authority.`;
    }
    return null;
  } catch {
    return `Your access to ${screen} could not be checked, so nothing was read.`;
  }
}
