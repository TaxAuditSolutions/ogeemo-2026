
'use server';

import { adminDb as db, getAdminStorage } from '@/lib/firebase-admin';

const DIALOG_SETTINGS_COLLECTION = 'dialogSettings';
const VISIONARIES_DIALOG_DOC_ID = 'visionaries_dialog_settings';
const FILES_COLLECTION = 'files';

function checkDb() {
    if (!db) throw new Error("Firestore is not initialized.");
}

export async function getVisionariesDialogImageUrl(userId: string): Promise<string | null> {
    checkDb();
    
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
        const bucket = getAdminStorage().bucket();
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
    checkDb();
    
    // The document ID is user-specific.
    const settingsDocRef = db.collection(DIALOG_SETTINGS_COLLECTION).doc(userId);
    
    // Use set with merge: true to create the document if it doesn't exist,
    // or update it if it does.
    await settingsDocRef.set({ imageId: imageId }, { merge: true });
}
