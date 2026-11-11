/**
 * Planning a change to an existing contact for the AI assistant (pure; see tests/ai-contact-update.test.ts).
 *
 * The Contacts Hub edits in the browser; the assistant works on the server, so the rules the Hub enforces are written
 * out here. Only plain contact details can be changed. These are left to the form on purpose:
 *   - notes (a replacement would overwrite whatever text is already there),
 *   - the SIN, pay, employment dates and emergency contacts (confidential, and chat history is kept),
 *   - the name or folder of an Employee or Contractor (the app also keeps their Document Manager folder in step, and a
 *     server write cannot do that).
 */
import { oneLine } from '@/lib/ai-input';
import { checkContactName } from '@/lib/contact-clean';
import { findMatchingContactFolder, type ContactFolderOption } from '@/lib/contact-folders';
import {
  CLEARABLE_FIELDS,
  EDITABLE_TEXT_FIELDS,
  FIELD_LABELS,
  type AiContactUpdateInput,
  type ContactChange,
  type ContactUpdateResult,
  type CurrentContact,
} from '@/lib/ai-contact-update-types';

export * from '@/lib/ai-contact-update-types';

const FIRESTORE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WORKER_FOLDERS = new Set(['employees', 'contractors']);

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const fail = (error: string): ContactUpdateResult => ({ ok: false, error });

export function buildContactUpdate(input: AiContactUpdateInput, current: CurrentContact, folders: readonly ContactFolderOption[]): ContactUpdateResult {
  const contactId = text(input.contactId);
  if (!FIRESTORE_ID.test(contactId)) return fail('Say which contact. Search for the contact first (searchContacts) and use the id it gives.');

  const clear = Array.isArray(input.clearFields) ? input.clearFields.map((field) => String(field)) : [];
  for (const field of clear) {
    if (field === 'name' || field === 'folder' || field === 'folderId') {
      return fail('A contact always has a name and a folder, so those cannot be cleared. Ask what to change them to instead.');
    }
    if (!CLEARABLE_FIELDS.includes(field)) return fail(`"${oneLine(field, 30)}" is not a detail that can be cleared here. The ones that can are: ${CLEARABLE_FIELDS.join(', ')}.`);
  }

  const inWorkerFolder = WORKER_FOLDERS.has(current.folderName.trim().toLowerCase());
  const patch: Record<string, string> = {};
  const changes: ContactChange[] = [];
  const propose = (field: string, from: string, to: string, shownFrom = from, shownTo = to) => {
    if (from === to) return;
    patch[field] = to;
    changes.push({ field, label: FIELD_LABELS[field] ?? field, from: shownFrom, to: shownTo });
  };

  if (input.name !== undefined) {
    const name = oneLine(input.name, 120).replace(/\s+/g, ' ');
    const problem = checkContactName(name);
    if (problem) return fail(problem);
    if (inWorkerFolder && name !== current.name) return fail('That contact is an Employee or Contractor. Renaming one also renames their document folder, so change the name on the Workers page (/workers).');
    propose('name', current.name, name);
  }

  if (input.email !== undefined) {
    const email = oneLine(input.email, 200).toLowerCase();
    if (!email) return fail('To remove the email address, use clearFields with "email". Otherwise give the new address.');
    if (!EMAIL.test(email)) return fail(`"${email}" does not look like an email address. Ask the user for the right one.`);
    if (clear.includes('email')) return fail('The email cannot be both changed and cleared. Do one or the other.');
    propose('email', current.email, email);
  }

  if (input.folder !== undefined) {
    const wanted = oneLine(input.folder, 120);
    const folder = wanted ? findMatchingContactFolder(wanted, folders) : undefined;
    if (!folder) {
      const names = folders.map((f) => f.name).slice(0, 15).join(', ');
      return fail(`There is no folder called "${wanted}" in this workspace. The folders are: ${names}. Ask which one to use.`);
    }
    const toWorker = WORKER_FOLDERS.has(folder.name.trim().toLowerCase());
    if ((toWorker || inWorkerFolder) && folder.id !== current.folderId) {
      return fail('Moving a contact into or out of Employees or Contractors changes their pay and document setup, so use the Workers page (/workers).');
    }
    propose('folderId', current.folderId, folder.id, current.folderName, folder.name);
  }

  for (const [key, max] of EDITABLE_TEXT_FIELDS) {
    const given = (input as Record<string, unknown>)[key];
    if (given === undefined) continue;
    const value = oneLine(given, max);
    if (!value) return fail(`To remove the ${FIELD_LABELS[key]}, use clearFields with "${key}". Otherwise give the new value.`);
    if (clear.includes(key)) return fail(`The ${FIELD_LABELS[key]} cannot be both changed and cleared. Do one or the other.`);
    propose(key, text(current[key]), value);
  }

  for (const field of clear) propose(field, text(current[field]), '');

  if (changes.length === 0) return fail('That contact already has those details, so nothing needs to change.');
  return { ok: true, plan: { contactId, contactName: current.name, changes, patch, allowDuplicate: input.allowDuplicate === true } };
}
