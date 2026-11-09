/**
 * Which folders and files with no workspace are safe to delete (pure; see tests/data-cleanup-unscoped.test.ts).
 *
 * Used by scripts/clean-access-data.ts. The app loads folders and files by workspace, so a record with no `orgId` is
 * never shown. It is still kept if anything that DOES belong to a workspace points at it: a folder that holds or
 * parents a workspace record, or a record in any other collection that names it. A kept folder also keeps the folders
 * above it, so no tree is left with a missing parent.
 */

export interface FolderRow {
  id: string;
  parentId?: string | null;
  orgId?: string | null;
}

export interface FileRow {
  id: string;
  folderId?: string | null;
  orgId?: string | null;
}

export interface UnscopedPlan {
  deleteFolders: string[];
  deleteFiles: string[];
  kept: { kind: 'folder' | 'file'; id: string; reason: string }[];
}

export function planUnscopedCleanup(
  folders: readonly FolderRow[],
  files: readonly FileRow[],
  /** Every id named by a record in some OTHER collection. */
  namedElsewhere: ReadonlySet<string>
): UnscopedPlan {
  const folderById = new Map(folders.map((f) => [f.id, f]));
  const keptFolders = new Map<string, string>();
  const keptFiles = new Map<string, string>();
  const keepFolder = (id: string | null | undefined, reason: string) => {
    const folder = id ? folderById.get(id) : undefined;
    if (folder && !folder.orgId && !keptFolders.has(folder.id)) keptFolders.set(folder.id, reason);
  };

  for (const folder of folders) {
    if (folder.orgId) keepFolder(folder.parentId, 'a folder in a workspace sits inside it');
    else if (namedElsewhere.has(folder.id)) keepFolder(folder.id, 'a record in a workspace names it');
  }
  for (const file of files) {
    if (file.orgId) keepFolder(file.folderId, 'a file in a workspace sits inside it');
    else if (namedElsewhere.has(file.id)) {
      keptFiles.set(file.id, 'a record in a workspace names it');
      keepFolder(file.folderId, 'a kept file sits inside it');
    }
  }
  // Walk up: a kept folder keeps its parents.
  for (let grew = true; grew; ) {
    grew = false;
    for (const id of [...keptFolders.keys()]) {
      const parent = folderById.get(id)?.parentId;
      if (parent && folderById.get(parent) && !folderById.get(parent)!.orgId && !keptFolders.has(parent)) {
        keptFolders.set(parent, 'a kept folder sits inside it');
        grew = true;
      }
    }
  }

  return {
    deleteFolders: folders.filter((f) => !f.orgId && !keptFolders.has(f.id)).map((f) => f.id),
    deleteFiles: files.filter((f) => !f.orgId && !keptFiles.has(f.id)).map((f) => f.id),
    kept: [
      ...[...keptFolders].map(([id, reason]) => ({ kind: 'folder' as const, id, reason })),
      ...[...keptFiles].map(([id, reason]) => ({ kind: 'file' as const, id, reason })),
    ],
  };
}
