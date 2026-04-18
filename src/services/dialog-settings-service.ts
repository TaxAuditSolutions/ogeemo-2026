'use server';

import { getAdminDb, getAdminStorage } from '@/core/firebase-admin';

const DIALOG_SETTINGS_COLLECTION = 'dialogSettings';
const FILES_COLLECTION = 'files';

export async function getVisionariesDialogImageUrl(userId: string): Promise<string | null> {
    const db = getAdminDb();
    const storage = getAdminStorage();
    
    if (!db || !storage) {
        console.warn("[Dialog Service] Admin SDK not available. Returning null.");
        return null;
    }
    
    // The document ID is now user-specific to support multiple users.
    const settingsDocRef = db.collection(DIALOG_SETTINGS_COLLECTION).doc(userId);
    const settingsDoc = await settingsDocRef.get();

    if (!settingsDoc.exists) {
        return null;
    }

    const data = settingsDoc.data();
    const imageId = data?.imageId;
    if (!imageId) {
        return null;
    }

    const fileDocRef = db.collection(FILES_COLLECTION).doc(imageId);
    const fileDoc = await fileDocRef.get();

    if (!fileDoc.exists) {
        console.error(`File with id ${imageId} not found for visionaries dialog.`);
        return null;
    }

    const fileData = fileDoc.data();
    if (!fileData?.storagePath) {
        console.error(`File with id ${imageId} is missing a storage path.`);
        return null;
    }

    try {
        const bucket = storage.bucket();
        const file = bucket.file(fileData.storagePath);
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        });
        return url;
    } catch (error) {
        console.error("Error getting signed URL for visionaries dialog image:", error);
        return null;
    }
}

export async function setVisionariesDialogImage(userId: string, imageId: string): Promise<void> {
    const db = getAdminDb();
    if (!db) {
        console.warn("[Dialog Service] Admin SDK not available. Cannot set image.");
        return;
    }
    
    // The document ID is user-specific.
    const settingsDocRef = db.collection(DIALOG_SETTINGS_COLLECTION).doc(userId);
    
    // Use set with merge: true to create the document if it doesn't exist,
    // or update it if it does.
    await settingsDocRef.set({ imageId: imageId }, { merge: true });
}
