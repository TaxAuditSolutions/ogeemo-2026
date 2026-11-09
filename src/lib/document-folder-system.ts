/**
 * System folders and worker folders in the Document Manager (pure; see tests/document-folder-system.test.ts).
 */
import type { FolderLike } from '@/lib/contact-folder-rules';

const norm = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

export interface MasterCandidate extends FolderLike {
  createdAt?: Date | null;
}

/**
 * Which of several same-named folders is THE system folder: one already marked system, then one under the
 * right parent, then the oldest. A look-alike nested somewhere else never takes over.
 */
export function pickMasterFolder<T extends MasterCandidate>(matches: readonly T[], expectedParentId: string | null): T | undefined {
  const time = (f: T) => (f.createdAt ? new Date(f.createdAt).getTime() : Number.MAX_SAFE_INTEGER);
  return [...matches].sort((a, b) => {
    const system = Number(!!b.isSystem) - Number(!!a.isSystem);
    if (system !== 0) return system;
    const parent = Number((b.parentId || null) === expectedParentId) - Number((a.parentId || null) === expectedParentId);
    if (parent !== 0) return parent;
    return time(a) - time(b) || a.id.localeCompare(b.id);
  })[0];
}

/**
 * A stable id for a system folder, so two sign-ins creating it at the same moment write the same record
 * instead of two copies (two "Clients" folders were found created in the same second).
 */
export function systemFolderId(orgId: string, name: string): string {
  return `sys_${orgId}_${norm(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

/** The system folders a duplicate leaves behind: everything but the master, with where its contents go. */
export function planDuplicateMerge<T extends FolderLike>(
  folders: readonly T[],
  files: readonly { id: string; folderId?: string | null }[],
  masterId: string,
  duplicateIds: readonly string[]
): { fileIds: string[]; childIds: string[] } {
  const dupes = new Set(duplicateIds);
  dupes.delete(masterId);
  return {
    fileIds: files.filter((f) => f.folderId && dupes.has(f.folderId)).map((f) => f.id),
    // A subfolder of a deleted duplicate would lose its parent and drop out of the tree, so it moves to the master.
    childIds: folders.filter((f) => f.parentId && dupes.has(f.parentId) && !dupes.has(f.id)).map((f) => f.id),
  };
}

export type WorkerFolderAction =
  | { action: 'keep'; folderId: string }
  | { action: 'update'; folderId: string; name?: string; parentId?: string }
  | { action: 'create'; name: string; parentId: string };

/**
 * What to do with a worker's document folder when the contact is saved. A contact that already has a folder
 * keeps it: the folder is renamed or moved to the new role instead of a new empty one being made, which
 * used to leave every file behind in a folder the contact no longer pointed at.
 */
export function planWorkerFolder(input: {
  name: string;
  roleParentId: string;
  existingFolder?: { id: string; name: string; parentId: string | null } | null;
  siblings: readonly { id: string; name: string }[];
}): WorkerFolderAction {
  const name = input.name.trim().replace(/\s+/g, ' ');
  const { existingFolder, roleParentId, siblings } = input;
  if (existingFolder) {
    const sameName = norm(existingFolder.name) === norm(name);
    const sameParent = existingFolder.parentId === roleParentId;
    if (sameName && sameParent) return { action: 'keep', folderId: existingFolder.id };
    const taken = siblings.some((s) => s.id !== existingFolder.id && norm(s.name) === norm(name));
    return {
      action: 'update',
      folderId: existingFolder.id,
      // A name already used by another worker's folder is not taken over: the folder keeps its own name.
      name: sameName || taken ? undefined : name,
      parentId: sameParent ? undefined : roleParentId,
    };
  }
  const match = siblings.find((s) => norm(s.name) === norm(name));
  return match ? { action: 'keep', folderId: match.id } : { action: 'create', name, parentId: roleParentId };
}

/**
 * What to bring back into view: files whose folder no longer exists go to Miscellaneous, and folders whose
 * parent no longer exists go to the top level. Both are invisible in the folder tree until they are re-homed.
 */
export function planOrphanRepair(
  folders: readonly FolderLike[],
  files: readonly { id: string; folderId?: string | null }[],
  miscellaneousId: string | null
): { fileIds: string[]; folderIds: string[] } {
  const ids = new Set(folders.map((f) => f.id));
  return {
    fileIds: miscellaneousId ? files.filter((f) => !f.folderId || !ids.has(f.folderId)).map((f) => f.id) : [],
    folderIds: folders.filter((f) => f.parentId && !ids.has(f.parentId)).map((f) => f.id),
  };
}
