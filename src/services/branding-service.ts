'use client';

import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
    deleteField,
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { getCurrentOrgId } from '@/core/user-profile-service';
import { logoStoragePath, validateLogoFile } from '@/lib/branding-utils';

const ORGANIZATIONS_COLLECTION = 'organizations';

/** Company branding stored on the workspace (organization) document. */
export interface OrgBranding {
    logoUrl: string | null;
    logoStoragePath: string | null;
}

/** Resolves the caller's workspace id, returning null when unavailable (never throws). */
export async function resolveOrgId(): Promise<string | null> {
    try {
        return await getCurrentOrgId();
    } catch {
        return null;
    }
}

/** Live-subscribes to the workspace's document-logo fields. */
export function subscribeToOrgBranding(
    orgId: string,
    onChange: (branding: OrgBranding) => void,
    onError?: (error: unknown) => void
): Unsubscribe {
    const { db } = getFirebaseServices();
    return onSnapshot(
        doc(db, ORGANIZATIONS_COLLECTION, orgId),
        (snapshot) => {
            const data = snapshot.data();
            onChange({
                logoUrl: typeof data?.logoUrl === 'string' && data.logoUrl ? data.logoUrl : null,
                logoStoragePath:
                    typeof data?.logoStoragePath === 'string' && data.logoStoragePath ? data.logoStoragePath : null,
            });
        },
        (error) => onError?.(error)
    );
}

async function saveOrgLogo(orgId: string, url: string, path: string): Promise<void> {
    const { db, auth } = getFirebaseServices();
    await updateDoc(doc(db, ORGANIZATIONS_COLLECTION, orgId), {
        logoUrl: url,
        logoStoragePath: path,
        logoUpdatedAt: serverTimestamp(),
        logoUpdatedBy: auth.currentUser?.uid ?? null,
    });
}

/**
 * Uploads a validated logo for the workspace and records it on the org document.
 * Firestore rules restrict the doc write to org admins - permission errors
 * surface to the caller for a friendly message (brandingErrorMessage).
 */
export async function uploadOrgLogo(orgId: string, file: File): Promise<{ url: string; path: string }> {
    const validation = validateLogoFile(file);
    if (validation === 'unsupported-type') {
        throw new Error('Please choose a PNG, JPEG, WebP or GIF image.');
    }
    if (validation === 'too-large') {
        throw new Error('That image is larger than 5 MB. Please use a smaller file.');
    }

    const { storage } = getFirebaseServices();
    const path = logoStoragePath(orgId, file.name || 'logo');
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: file.type, cacheControl: 'public, max-age=3600' });
    const url = await getDownloadURL(storageRef);
    await saveOrgLogo(orgId, url, path);
    return { url, path };
}

/** Removes the workspace's document logo (storage file + org fields). */
export async function removeOrgLogo(orgId: string): Promise<void> {
    const { db, auth } = getFirebaseServices();
    const orgRef = doc(db, ORGANIZATIONS_COLLECTION, orgId);
    const snapshot = await getDoc(orgRef);
    const currentPath = snapshot.data()?.logoStoragePath;

    if (typeof currentPath === 'string' && currentPath) {
        try {
            await deleteObject(ref(storage, currentPath));
        } catch (error: unknown) {
            const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : '';
            if (code !== 'storage/object-not-found') {
                console.error('Document logo: storage delete failed', error);
            }
        }
    }

    await updateDoc(orgRef, {
        logoUrl: deleteField(),
        logoStoragePath: deleteField(),
        logoUpdatedAt: serverTimestamp(),
        logoUpdatedBy: auth.currentUser?.uid ?? null,
    });
}
