/**
 * Helpers for deciding which folder a contact belongs to when the user has not
 * chosen one explicitly.
 *
 * "Miscellaneous" is a mandated system folder (see `ensureSystemFolders`) and it
 * doubles as the neutral "not filed yet" bucket — the Files module already
 * treats it that way. Positional fallbacks are wrong here: `getFolders` returns
 * folders sorted by name, so "the first folder" is normally "Admin", which would
 * silently file unmatched contacts into an unrelated folder.
 */

export const DEFAULT_CONTACT_FOLDER_NAME = 'Miscellaneous';

export interface ContactFolderOption {
    id: string;
    name: string;
    isSystem?: boolean;
}

/**
 * Returns the id of the folder a new contact should default to, or `undefined`
 * when the tenant has no folders at all.
 *
 * Precedence: the system "Miscellaneous" folder, then any folder named
 * "Miscellaneous", then the first folder in the supplied list.
 */
export function resolveDefaultContactFolderId(
    folders: ReadonlyArray<ContactFolderOption>,
): string | undefined {
    if (folders.length === 0) return undefined;

    const wanted = DEFAULT_CONTACT_FOLDER_NAME.toLowerCase();
    const isNamedDefault = (folder: ContactFolderOption) => folder.name.trim().toLowerCase() === wanted;
    const systemMatch = folders.find((folder) => folder.isSystem === true && isNamedDefault(folder));

    return (systemMatch ?? folders.find(isNamedDefault) ?? folders[0]).id;
}

/**
 * Resolves any folder reference (folder ID, folder name, or hierarchical path)
 * to the exact tenant folder option.
 */
export function findMatchingContactFolder(
    wanted: unknown,
    folders: ReadonlyArray<ContactFolderOption>,
): ContactFolderOption | undefined {
    if (!wanted || typeof wanted !== 'string') return undefined;
    const normalized = wanted.trim().toLowerCase();
    if (!normalized) return undefined;

    // 1. Exact or case-insensitive match on folder id
    const byId = folders.find((f) => f.id.toLowerCase() === normalized);
    if (byId) return byId;

    // 2. Exact or case-insensitive match on full folder name
    const byName = folders.find((f) => f.name.trim().toLowerCase() === normalized);
    if (byName) return byName;

    // 3. Match on the last segment of hierarchical paths (e.g. "Workers / Employees" -> "Employees")
    const lastSegment = normalized.split('/').pop()?.trim();
    if (lastSegment) {
        const bySegment = folders.find((f) => f.name.trim().toLowerCase() === lastSegment);
        if (bySegment) return bySegment;
    }

    return undefined;
}

/**
 * Resolves a folder reference (ID, name, path) to a folder ID from the list,
 * or keeps the original trimmed string if non-empty, or returns undefined.
 */
export function resolveContactFolderId(
    wanted: unknown,
    folders: ReadonlyArray<ContactFolderOption>,
): string | undefined {
    if (!wanted || typeof wanted !== 'string') return undefined;
    const trimmed = wanted.trim();
    if (!trimmed) return undefined;
    const matched = findMatchingContactFolder(trimmed, folders);
    return matched ? matched.id : trimmed;
}
