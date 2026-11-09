/**
 * Contact folder rules (pure; see tests/contact-folder-rules.test.ts).
 *
 * Folders form a tree through parentId. A folder that points at a missing parent, or a loop of
 * folders that point at each other, drops out of the tree entirely and takes its contacts with it,
 * so the rules here keep the tree whole: no moves into your own descendant, no deleting a folder
 * without re-homing what is inside it, and no folder named like a system folder (the system
 * folders are merged by name, so a look-alike would be merged away).
 */

/** The mandated system folders, in the order they are created. `parent` is another system folder's name. */
export const SYSTEM_FOLDERS: readonly { name: string; parent: string | null }[] = [
  { name: 'Admin', parent: null },
  { name: 'Workers', parent: null },
  { name: 'Employees', parent: 'Workers' },
  { name: 'Contractors', parent: 'Workers' },
  { name: 'Suppliers', parent: null },
  { name: 'Clients', parent: null },
  { name: 'Prospects', parent: null },
  { name: 'Family', parent: null },
  { name: 'Friends', parent: null },
  { name: 'Miscellaneous', parent: null },
];

export interface FolderLike {
  id: string;
  name: string;
  parentId?: string | null;
  isSystem?: boolean;
}

const norm = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

/** The folder and everything under it. Safe on bad data: a loop is visited once, never forever. */
export function descendantFolderIds(folders: readonly FolderLike[], folderId: string): string[] {
  const seen = new Set<string>([folderId]);
  const queue = [folderId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const folder of folders) {
      if (folder.parentId === current && !seen.has(folder.id)) {
        seen.add(folder.id);
        queue.push(folder.id);
      }
    }
  }
  return [...seen];
}

/** True when moving `folderId` under `newParentId` would put a folder inside itself. */
export function wouldCreateCycle(folders: readonly FolderLike[], folderId: string, newParentId: string | null): boolean {
  if (!newParentId) return false;
  return descendantFolderIds(folders, folderId).includes(newParentId);
}

/** Why this folder name cannot be used here, or null. Siblings are the other folders under the same parent. */
export function checkFolderName(
  name: string,
  parentId: string | null | undefined,
  folders: readonly FolderLike[],
  excludeId?: string,
  systemFolders: readonly { name: string }[] = SYSTEM_FOLDERS
): string | null {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) return 'Enter a folder name.';
  if (clean.length > 60) return 'A folder name can have at most 60 characters.';
  if (/[\/\\]/.test(clean)) return 'A folder name cannot contain / or \\.';
  const key = norm(clean);

  const systemMatch = systemFolders.find((system) => norm(system.name) === key);
  const existingSystem = folders.find((folder) => folder.isSystem && norm(folder.name) === key);
  if (systemMatch && (!excludeId || existingSystem?.id !== excludeId)) {
    return `"${systemMatch.name}" is a system folder name. Choose a different name.`;
  }

  const sibling = folders.find(
    (folder) => folder.id !== excludeId && (folder.parentId || null) === (parentId || null) && norm(folder.name) === key
  );
  if (sibling) return `There is already a folder named "${sibling.name}" here.`;
  return null;
}

export type FolderDeletePlan =
  | { error: string }
  | {
      error: null;
      /** Where contacts that sat directly in the deleted folder go. */
      contactsTo: string;
      /** Where its subfolders go (null means the top level). */
      childrenTo: string | null;
      /** Subfolders that will be re-parented. */
      childIds: string[];
    };

/**
 * How to delete a folder without losing anything inside it: its contacts move up to the parent
 * folder (or to Miscellaneous at the top level) and its subfolders move up one level.
 */
export function planFolderDelete(folders: readonly FolderLike[], folderId: string): FolderDeletePlan {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return { error: 'That folder no longer exists.' };
  if (folder.isSystem) return { error: `"${folder.name}" is a system folder and cannot be deleted.` };

  const parent = folder.parentId ? folders.find((f) => f.id === folder.parentId) : undefined;
  const miscellaneous = folders.find((f) => f.isSystem && norm(f.name) === 'miscellaneous');
  const contactsTo = parent?.id ?? miscellaneous?.id;
  if (!contactsTo) return { error: 'There is no folder to move its contacts into. Reload and try again.' };

  return {
    error: null,
    contactsTo,
    childrenTo: parent?.id ?? null,
    childIds: folders.filter((f) => f.parentId === folderId).map((f) => f.id),
  };
}
