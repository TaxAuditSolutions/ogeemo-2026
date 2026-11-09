/**
 * Deleting a Document Manager folder, finding a folder's path, and sorting files (pure; see
 * tests/document-folder-rules.test.ts).
 */
import type { FolderLike } from '@/lib/contact-folder-rules';

const norm = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

export type DocumentFolderDeletePlan =
  | { error: string }
  | { error: null; filesTo: string | null; childrenTo: string | null; fileIds: string[]; childIds: string[] };

/**
 * How to delete a folder without losing anything inside it: its files move up to the parent folder (or to
 * Miscellaneous at the top level) and its subfolders move up one level.
 */
export function planDocumentFolderDelete(
  folders: readonly FolderLike[],
  files: readonly { id: string; folderId?: string | null }[],
  folderId: string
): DocumentFolderDeletePlan {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return { error: 'That folder no longer exists.' };
  if (folder.isSystem) return { error: `"${folder.name}" is a system folder and cannot be deleted.` };

  const parent = folder.parentId ? folders.find((f) => f.id === folder.parentId) : undefined;
  const miscellaneous = folders.find((f) => f.isSystem && norm(f.name) === 'miscellaneous');
  const fileIds = files.filter((f) => f.folderId === folderId).map((f) => f.id);
  const filesTo = parent?.id ?? miscellaneous?.id ?? null;
  if (fileIds.length > 0 && !filesTo) {
    return { error: 'There is no folder to move its files into. Reload and try again.' };
  }
  return {
    error: null,
    filesTo,
    childrenTo: parent?.id ?? null,
    fileIds,
    childIds: folders.filter((f) => f.parentId === folderId).map((f) => f.id),
  };
}

/** The folder and every folder above it, root first: the path to expand. Safe on a loop. */
export function pathToFolder(folders: readonly FolderLike[], folderId: string): string[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: string[] = [];
  const seen = new Set<string>();
  let current: string | null | undefined = folderId;
  while (current && byId.has(current) && !seen.has(current)) {
    seen.add(current);
    path.unshift(current);
    current = byId.get(current)?.parentId;
  }
  return path;
}

export type FileSortKey = 'name' | 'modifiedAt';

/** A sorted copy (never the original), names compared without regard to case and with numbers in order. */
export function sortFiles<T extends { name: string; modifiedAt?: Date | string | number | null }>(
  files: readonly T[],
  key: FileSortKey,
  direction: 'asc' | 'desc'
): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
  const time = (f: T) => (f.modifiedAt ? new Date(f.modifiedAt).getTime() || 0 : 0);
  const sign = direction === 'asc' ? 1 : -1;
  return [...files].sort((a, b) => (key === 'name' ? byName(a, b) : time(a) - time(b) || byName(a, b)) * sign);
}
