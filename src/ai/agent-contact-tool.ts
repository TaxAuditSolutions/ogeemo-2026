/**
 * The createContact tool of the Co-Pilot agent (see tests/ai-contact.test.ts).
 *
 * The contact is saved by the server on behalf of the signed-in user: who they are, their workspace and their role come
 * from the session (never from the model), the folder must belong to that workspace, and a contact that looks like an
 * existing one is not added until the user has said so.
 */
import { oneLine } from '@/lib/ai-input';
import { buildAiContact, canCreateContacts, type AiContactInput } from '@/lib/ai-contact';
import { duplicateMessage, findPossibleDuplicates } from '@/lib/contact-clean';
import type { ToolContext } from '@/lib/ai-runtime';
import type { DbLike } from '@/ai/agent-tools';

export async function createContactHandler(db: DbLike | null, ctx: ToolContext, input: AiContactInput, now: Date = new Date()) {
  if (!ctx.userId || !ctx.orgId) return { success: false, message: 'User or workspace not authenticated, so no contact was added.' };
  if (!canCreateContacts(ctx.accessLevel)) {
    return { success: false, message: 'Your role can view this workspace but not add contacts. Ask an editor or administrator.' };
  }
  if (!db) return { success: false, message: 'The database is not available, so the contact was NOT added.' };

  try {
    const folderSnap = await db.collection('contactFolders').where('orgId', '==', ctx.orgId).get();
    const folders = folderSnap.docs
      .map((doc: any) => ({ id: doc.id as string, name: String(doc.data()?.name ?? ''), isSystem: doc.data()?.isSystem === true }))
      .filter((folder: { name: string }) => folder.name);

    const built = buildAiContact(input, { userId: ctx.userId, orgId: ctx.orgId, now }, folders);
    if (!built.ok) return { success: false, message: built.error };
    const contact = built.contact as Record<string, any>;

    if (input.allowDuplicate !== true) {
      const existing = await db.collection('contacts').where('orgId', '==', ctx.orgId).get();
      const matches = findPossibleDuplicates(
        existing.docs.map((doc: any) => ({ id: doc.id as string, name: doc.data()?.name, email: doc.data()?.email })),
        { name: contact.name, email: contact.email }
      );
      if (matches.length > 0) {
        return {
          success: false,
          message: `${duplicateMessage(matches)} Nothing was added. Tell the user, and ask whether to add another contact anyway; only if they say yes, call createContact again with allowDuplicate set to true.`,
        };
      }
    }

    const ref = await db.collection('contacts').add(contact);
    return { success: true, contactId: ref.id as string, message: `Added "${oneLine(contact.name, 80)}" to the ${built.folderName} folder.` };
  } catch (error: any) {
    return { success: false, message: `The contact could not be saved: ${oneLine(error?.message, 160)}` };
  }
}
