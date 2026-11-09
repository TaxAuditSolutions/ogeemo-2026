/**
 * Building a contact the AI assistant adds (pure; see tests/ai-contact.test.ts).
 *
 * The assistant used to only fill in the Contacts Hub form and wait for a click. A contact it saves itself is built
 * here with every field the app expects (workspace, creator, folder, search keywords) and refused if the input is not
 * sound. Employees and Contractors are not created this way (they are added on the Workers page), because the app also
 * builds their Document Manager folder and pay setup; the SIN, pay rate and dates are never accepted.
 */
import { oneLine } from '@/lib/ai-input';
import { canCreateTasks } from '@/lib/ai-task';
import { checkContactName, cleanContactInput } from '@/lib/contact-clean';
import { findMatchingContactFolder, resolveDefaultContactFolderId, type ContactFolderOption } from '@/lib/contact-folders';
import { generateContactKeywords } from '@/lib/contact-keywords';

/** The same roles that may create tasks may add contacts: an editor or above. */
export const canCreateContacts = canCreateTasks;

export interface AiContactInput {
  name?: string;
  folder?: string;
  email?: string;
  businessName?: string;
  businessPhone?: string;
  cellPhone?: string;
  homePhone?: string;
  website?: string;
  streetAddress?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  /** Only after the user has said to add a contact that looks like an existing one. */
  allowDuplicate?: boolean;
}

export interface AiContactContext {
  userId: string;
  orgId: string;
  now: Date;
}

export type AiContactResult =
  | { ok: true; contact: Record<string, unknown>; folderName: string }
  | { ok: false; error: string };

const TEXT_FIELDS: ReadonlyArray<[keyof AiContactInput, number]> = [
  ['businessName', 120],
  ['businessPhone', 40],
  ['cellPhone', 40],
  ['homePhone', 40],
  ['website', 200],
  ['streetAddress', 160],
  ['city', 80],
  ['provinceState', 80],
  ['postalCode', 20],
  ['country', 80],
  ['notes', 1000],
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WORKER_FOLDERS = new Set(['employees', 'contractors']);

export function buildAiContact(input: AiContactInput, ctx: AiContactContext, folders: readonly ContactFolderOption[]): AiContactResult {
  const name = oneLine(input.name, 120).replace(/\s+/g, ' ');
  const nameProblem = checkContactName(name);
  if (nameProblem) return { ok: false, error: nameProblem };

  const email = oneLine(input.email, 200).toLowerCase();
  if (email && !EMAIL.test(email)) return { ok: false, error: `"${email}" does not look like an email address. Ask the user for the right one, or leave it out.` };

  if (folders.length === 0) {
    return { ok: false, error: 'This workspace has no contact folders yet. Open Contacts Hub (/contacts) once so they are set up, then try again.' };
  }

  const wanted = oneLine(input.folder, 120);
  let folder: ContactFolderOption | undefined;
  if (wanted) {
    folder = findMatchingContactFolder(wanted, folders);
    if (!folder) {
      const names = folders.map((f) => f.name).slice(0, 15).join(', ');
      return { ok: false, error: `There is no folder called "${wanted}" in this workspace. The folders are: ${names}. Ask which one to use, or leave the folder out for the default.` };
    }
  } else {
    const defaultId = resolveDefaultContactFolderId(folders);
    folder = folders.find((f) => f.id === defaultId);
  }
  if (!folder) return { ok: false, error: 'No folder could be chosen for this contact. Open Contacts Hub (/contacts) to add it.' };
  if (WORKER_FOLDERS.has(folder.name.trim().toLowerCase())) {
    return {
      ok: false,
      error: 'Employees and Contractors need pay and document setup, so add them on the Workers page (/workers) with Add Worker.',
    };
  }

  const fields: Record<string, unknown> = { name, ...(email ? { email } : {}) };
  for (const [key, max] of TEXT_FIELDS) {
    const value = oneLine(input[key], max);
    if (value) fields[key] = value;
  }
  const cleaned = cleanContactInput(fields);

  return {
    ok: true,
    folderName: folder.name,
    contact: {
      ...cleaned,
      folderId: folder.id,
      userId: ctx.userId,
      orgId: ctx.orgId,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
      createdAt: ctx.now,
      updatedAt: ctx.now,
      keywords: generateContactKeywords(cleaned),
    },
  };
}
