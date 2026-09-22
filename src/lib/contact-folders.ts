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
