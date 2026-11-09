/**
 * Document Manager folder and file rules (pure; see tests/document-folder-rules.test.ts).
 *
 * Folders form a tree through parentId and files sit in a folder through folderId. Anything that points at a
 * missing folder, or a loop of folders, drops out of the tree and cannot be found again, so these rules keep
 * the tree whole: no moves into your own subfolder, no files on "All Files", no folder names that look like a
 * system folder (system folders are merged by name), and deleting a folder moves what is inside it up one level
 * instead of leaving it behind. System-folder and worker-folder planning is in document-folder-system.ts.
 */
import { checkFolderName, descendantFolderIds, type FolderLike } from '@/lib/contact-folder-rules';

/** The mandated system folders, parents first. `parent` is another system folder's name. */
export const DOCUMENT_SYSTEM_FOLDERS: readonly { name: string; parent: string | null }[] = [
  { name: 'Workers', parent: null },
  { name: 'Employees', parent: 'Workers' },
  { name: 'Contractors', parent: 'Workers' },
  { name: 'Clients', parent: null },
  { name: 'Prospects', parent: null },
  { name: 'Suppliers', parent: null },
  { name: 'Family', parent: null },
  { name: 'Friends', parent: null },
  { name: 'Miscellaneous', parent: null },
  { name: 'Ogeemo Users', parent: null },
  { name: 'Images', parent: null },
  { name: 'Marketing', parent: null },
  { name: 'Ogeemo Notes', parent: null },
  { name: 'Knowledge Base', parent: null },
];

const norm = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

/** The name as it is stored: trimmed, with runs of spaces collapsed. */
export const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ');

/** Why this folder name cannot be used here, or null. */
export function checkDocumentFolderName(
  name: string,
  parentId: string | null | undefined,
  folders: readonly FolderLike[],
  excludeId?: string
): string | null {
  return checkFolderName(name, parentId, folders, excludeId, DOCUMENT_SYSTEM_FOLDERS);
}

/** Why this file name cannot be used, or null. Several files may share a name, so there is no duplicate check. */
export function checkFileName(name: string): string | null {
  const clean = cleanName(name);
  if (!clean) return 'Enter a file name.';
  if (clean.length > 200) return 'A file name can have at most 200 characters.';
  if (/[\u0000-\u001f\u007f]/.test(clean)) return 'A file name cannot contain control characters.';
  return null;
}

/** Why a folder cannot be moved under `newParentId` (null is the top level), or null. */
export function folderMoveProblem(folders: readonly FolderLike[], folderId: string, newParentId: string | null): string | null {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return 'That folder no longer exists.';
  if (folder.isSystem) return `"${folder.name}" is a system folder and cannot be moved.`;
  if (newParentId) {
    if (!folders.some((f) => f.id === newParentId)) return 'The folder you dropped it on no longer exists.';
    if (descendantFolderIds(folders, folderId).includes(newParentId)) {
      return 'A folder cannot be moved into itself or one of its own subfolders.';
    }
  }
  if ((folder.parentId || null) === (newParentId || null)) return null;
  const clash = folders.find(
    (f) => f.id !== folderId && (f.parentId || null) === (newParentId || null) && norm(f.name) === norm(folder.name)
  );
  return clash ? `There is already a folder named "${clash.name}" there.` : null;
}

/** Why a file cannot be dropped here, or null. `targetFolderId` is null when it was dropped on All Files. */
export function fileMoveProblem(folders: readonly FolderLike[], targetFolderId: string | null): string | null {
  if (!targetFolderId) return 'Drop a file on a folder. All Files shows every folder together; it is not a place to keep files.';
  return folders.some((f) => f.id === targetFolderId) ? null : 'That folder no longer exists.';
}
