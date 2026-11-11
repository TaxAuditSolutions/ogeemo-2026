/**
 * The updateContact tool of the Co-Pilot agent (see tests/agent-contact-update-*.test.ts).
 *
 * Changes plain details of ONE existing contact in the signed-in person's workspace. It follows the same two steps as
 * changeEvent, which the model cannot shortcut: the first call only PREVIEWS and saves the plan; the change is applied
 * only when the SERVER read the person's next message as a plain yes, the call is exactly the saved plan, the plan is
 * recent and was made before this turn began, and the contact still holds the values the preview started from.
 *
 * The rules of the Contacts Hub are kept (src/lib/ai-contact-update.ts): the name needs two characters, a contact
 * always keeps a name and a folder, a change that makes the contact match another one is held back until the user says
 * so, and the Employee and Contractor details that carry pay and a document folder are left to the Workers page.
 */
import { oneLine } from '@/lib/ai-input';
import { duplicateMessage, findPossibleDuplicates } from '@/lib/contact-clean';
import { generateContactKeywords } from '@/lib/contact-keywords';
import { buildContactUpdate, canUpdateContacts, describeContactDone, describeContactPlan, type AiContactUpdateInput } from '@/lib/ai-contact-update';
import type { ToolContext } from '@/lib/ai-runtime';
import { loadContact } from '@/ai/agent-contact-load';
import { PENDING_COLLECTION, beforeValues, matchesPendingContact, toPendingContact, type PendingContactChange } from '@/ai/agent-contact-pending';
import type { DbLike } from '@/ai/agent-tools';

export type ContactChangeStatus = 'preview' | 'done' | 'refused';

/**
 * `message` is what the MODEL is told (it may include instructions to it). `userText`, when given, is the user-facing
 * part, shown word for word for a preview or a finished change (see src/lib/ai-tool-reply.ts).
 */
const result = (status: ContactChangeStatus, message: string, userText?: string) => ({ success: status === 'done', status, message, ...(userText ? { userText } : {}) });

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export async function updateContactHandler(
  db: DbLike | null,
  ctx: ToolContext,
  input: AiContactUpdateInput,
  opts: { confirmed?: boolean; turnStartedAt?: Date; now?: Date } = {}
) {
  const now = opts.now ?? new Date();
  if (!ctx.userId || !ctx.orgId) return result('refused', 'User or workspace not authenticated, so no contact was changed.');
  if (!canUpdateContacts(ctx.accessLevel)) return result('refused', 'Your role can view this workspace but not change contacts. Ask an editor or administrator.');
  if (!db) return result('refused', 'The database is not available, so no contact was changed.');
  const userId = ctx.userId;
  const orgId = ctx.orgId;

  try {
    const contactId = asText(input.contactId);
    const loaded = await loadContact(db, orgId, contactId);
    if (!loaded) return result('refused', 'That contact was not found in this workspace. Search for the contact first (searchContacts) and use the id it gives.');
    const { stored, current, folders } = loaded;

    const built = buildContactUpdate(input, current, folders);
    if (!built.ok) return result('refused', built.error);
    const plan = built.plan;

    if (!plan.allowDuplicate && (plan.patch.name || plan.patch.email)) {
      const everyone = await db.collection('contacts').where('orgId', '==', orgId).get();
      const matches = findPossibleDuplicates(
        everyone.docs.map((doc: any) => ({ id: doc.id as string, name: doc.data()?.name, email: doc.data()?.email })),
        { name: plan.patch.name ?? '', email: plan.patch.email ?? '' },
        contactId
      );
      if (matches.length > 0) {
        return result('refused', `${duplicateMessage(matches)} Nothing was changed. Tell the user, and ask whether to make the change anyway; only if they say yes, call updateContact again with allowDuplicate set to true.`);
      }
    }

    const fresh = toPendingContact(plan, orgId, stored, now);
    const pendingRef = db.collection(PENDING_COLLECTION).doc(userId);
    const saved = (await pendingRef.get()).data() as Partial<PendingContactChange> | undefined;
    const madeBeforeThisTurn = opts.turnStartedAt !== undefined && typeof saved?.createdAt === 'number' && saved.createdAt < opts.turnStartedAt.getTime();

    if (!(opts.confirmed === true && madeBeforeThisTurn && matchesPendingContact(saved, fresh, now))) {
      await pendingRef.set(fresh);
      const shown = describeContactPlan(plan);
      return result('preview', `${shown} The user will be shown exactly this and asked whether to go ahead, so do not repeat it. Do not call updateContact again until they have replied.`, shown);
    }

    // Confirmed. The fields must still hold what they held when the preview was made.
    if (fresh.before !== saved?.before) {
      await pendingRef.delete();
      return result('refused', 'That contact changed after I showed you the plan, so nothing was changed. Ask again if you still want it.');
    }

    const patch: Record<string, unknown> = { ...plan.patch, updatedBy: userId, updatedAt: now, keywords: generateContactKeywords({ ...stored, ...plan.patch }) };
    await db.collection('contacts').doc(contactId).update(patch);
    await pendingRef.delete();
    const shown = describeContactDone(plan);
    return result('done', shown, shown);
  } catch (error: any) {
    return result('refused', `The contact could not be changed, so assume nothing changed: ${oneLine(error?.message, 160)}`);
  }
}
