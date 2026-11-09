/**
 * Which contacts without a valid folder are safe to delete (pure; see tests/orphan-contacts.test.ts).
 *
 * Used by scripts/clean-orphaned-contacts.ts. It is the same rule the app's delete guard applies, plus
 * a hold-back for worker and HR data, because deleting a person's pay record is not a clean-up task.
 */

export interface OrphanContact {
  id: string;
  name?: string;
  orgId?: string;
  folderId?: string | null;
  workerType?: string | null;
  payType?: string | null;
  payRate?: number | null;
  sin?: string | null;
  employeeNumber?: string | null;
}

export interface FolderRef {
  id: string;
  orgId?: string;
}

export type OrphanKind = 'missing-folder' | 'no-folder' | 'foreign-folder';

export interface OrphanRow {
  id: string;
  name: string;
  orgId: string;
  kind: OrphanKind;
  action: 'delete' | 'keep';
  reason: string;
}

const present = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '' && value !== 0;

export function hasWorkerData(contact: OrphanContact): boolean {
  return present(contact.workerType) || present(contact.payType) || present(contact.payRate) || present(contact.sin) || present(contact.employeeNumber);
}

function useText(counts: Record<string, number>): string {
  return Object.entries(counts).map(([collection, n]) => `${n} ${collection}`).join(', ');
}

/**
 * Every contact whose folder is missing, blank or in another workspace, with what to do about it.
 * Only a contact whose folder was DELETED ('missing-folder') can be deleted, and only when nothing needs it.
 */
export function classifyOrphans(
  contacts: readonly OrphanContact[],
  folders: readonly FolderRef[],
  workLinks: Readonly<Record<string, Record<string, number>>>,
  linkedUsers: Readonly<Record<string, string>>
): OrphanRow[] {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const rows: OrphanRow[] = [];

  for (const contact of contacts) {
    const folderId = typeof contact.folderId === 'string' ? contact.folderId.trim() : '';
    const folder = folderId ? folderById.get(folderId) : undefined;
    let kind: OrphanKind | null = null;
    if (!folderId) kind = 'no-folder';
    else if (!folder) kind = 'missing-folder';
    else if (folder.orgId && contact.orgId && folder.orgId !== contact.orgId) kind = 'foreign-folder';
    if (!kind) continue;

    const base = { id: contact.id, name: contact.name ?? '', orgId: contact.orgId ?? '(no workspace)', kind };
    if (kind !== 'missing-folder') {
      rows.push({ ...base, action: 'keep', reason: kind === 'no-folder' ? 'no folder was ever set; review by hand' : 'its folder belongs to another workspace; review by hand' });
      continue;
    }
    const counts = workLinks[contact.id];
    if (counts && Object.keys(counts).length > 0) {
      rows.push({ ...base, action: 'keep', reason: `still used by ${useText(counts)}` });
    } else if (linkedUsers[contact.id]) {
      rows.push({ ...base, action: 'keep', reason: `linked to sign-in account ${linkedUsers[contact.id]}` });
    } else if (hasWorkerData(contact)) {
      rows.push({ ...base, action: 'keep', reason: 'carries worker or HR data; decide by hand' });
    } else {
      rows.push({ ...base, action: 'delete', reason: '' });
    }
  }
  return rows.sort((a, b) => a.orgId.localeCompare(b.orgId) || a.name.localeCompare(b.name));
}
