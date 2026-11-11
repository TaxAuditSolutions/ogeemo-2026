/**
 * What a contact change looks like, and how it is described to the user (pure; see tests/ai-contact-update.test.ts).
 *
 * A change is only PLANNED first. Nothing is written until the user has said yes (src/ai/agent-contact-update-tool.ts).
 */
import { oneLine } from '@/lib/ai-input';
import { canCreateTasks } from '@/lib/ai-task';

/** The same roles that may add a contact may change one: an editor or above. */
export const canUpdateContacts = canCreateTasks;

/** Plain text fields: [key, longest allowed, the words the user sees]. Notes are not here on purpose. */
export const EDITABLE_TEXT_FIELDS: ReadonlyArray<readonly [string, number, string]> = [
  ['businessName', 120, 'company'],
  ['businessPhone', 40, 'business phone'],
  ['cellPhone', 40, 'cell phone'],
  ['homePhone', 40, 'home phone'],
  ['website', 200, 'website'],
  ['streetAddress', 160, 'street address'],
  ['city', 80, 'city'],
  ['provinceState', 80, 'province or state'],
  ['postalCode', 20, 'postal code'],
  ['country', 80, 'country'],
];

/** Fields that may be blanked. The name and the folder may not: a contact always has both. */
export const CLEARABLE_FIELDS: readonly string[] = ['email', ...EDITABLE_TEXT_FIELDS.map(([key]) => key)];

export const FIELD_LABELS: Readonly<Record<string, string>> = {
  name: 'name',
  email: 'email',
  folderId: 'folder',
  ...Object.fromEntries(EDITABLE_TEXT_FIELDS.map(([key, , label]) => [key, label])),
};

export interface AiContactUpdateInput {
  contactId?: string;
  name?: string;
  email?: string;
  /** A contact folder name in this workspace. */
  folder?: string;
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
  /** Fields to blank, from CLEARABLE_FIELDS. */
  clearFields?: string[];
  /** Only after the user said to go ahead although the change makes it match another contact. */
  allowDuplicate?: boolean;
}

/** What is stored now, as text ('' when empty). */
export interface CurrentContact {
  name: string;
  email: string;
  folderId: string;
  folderName: string;
  [field: string]: string;
}

export interface ContactChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

export interface ContactUpdatePlan {
  contactId: string;
  contactName: string;
  changes: ContactChange[];
  /** The fields to write, by their stored names (the folder as folderId). */
  patch: Record<string, string>;
  allowDuplicate: boolean;
}

export type ContactUpdateResult = { ok: true; plan: ContactUpdatePlan } | { ok: false; error: string };

const clip = (value: string) => (value.length > 80 ? `${value.slice(0, 80)}...` : value);
const shown = (value: string) => (value ? `"${clip(value)}"` : '(empty)');

/** What the user is shown. It must keep the sentence "Nothing has changed yet": the server looks for it in the reply. */
export function describeContactPlan(plan: ContactUpdatePlan): string {
  const parts = plan.changes.map((change) => `${change.label} from ${shown(change.from)} to ${shown(change.to)}`);
  return `Ready to change ${oneLine(plan.contactName, 80)}: ${parts.join('; ')}. Nothing has changed yet.`;
}

export function describeContactDone(plan: ContactUpdatePlan): string {
  const parts = plan.changes.map((change) => (change.to ? `${change.label} is now "${clip(change.to)}"` : `${change.label} cleared`));
  return `Updated ${oneLine(plan.contactName, 80)}: ${parts.join('; ')}.`;
}
