/**
 * Reading one contact and the folders around it for updateContact (see tests/agent-contact-update-rules.test.ts).
 *
 * Only a contact of the signed-in person's own workspace is returned: another workspace's contact and an id that does
 * not exist are the same answer, so the tool cannot be used to find out what exists elsewhere.
 */
import type { ContactFolderOption } from '@/lib/contact-folders';
import type { CurrentContact } from '@/lib/ai-contact-update-types';
import type { DbLike } from '@/ai/agent-tools';

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const PLAIN_FIELDS = ['businessName', 'businessPhone', 'cellPhone', 'homePhone', 'website', 'streetAddress', 'city', 'provinceState', 'postalCode', 'country'] as const;

export interface LoadedContact {
  stored: Record<string, any>;
  current: CurrentContact;
  folders: ContactFolderOption[];
}

/** The contact, as stored and as plain text, with this workspace's folders; null when it is not in this workspace. */
export async function loadContact(db: DbLike, orgId: string, contactId: string): Promise<LoadedContact | null> {
  if (!contactId) return null;
  const snap = await db.collection('contacts').doc(contactId).get();
  const stored = (snap.exists ? snap.data() : null) as Record<string, any> | null;
  if (!stored || stored.orgId !== orgId) return null;

  const folderSnap = await db.collection('contactFolders').where('orgId', '==', orgId).get();
  const folders: ContactFolderOption[] = folderSnap.docs
    .map((doc: any) => ({ id: doc.id as string, name: asText(doc.data()?.name), isSystem: doc.data()?.isSystem === true }))
    .filter((folder: { name: string }) => folder.name);
  const folderName = folders.find((folder) => folder.id === stored.folderId)?.name ?? '';

  const current: CurrentContact = {
    name: asText(stored.name),
    email: asText(stored.email),
    folderId: asText(stored.folderId),
    folderName,
    ...Object.fromEntries(PLAIN_FIELDS.map((key) => [key, asText(stored[key])])),
  };
  return { stored, current, folders };
}
