
'use server';

import { adminDb as db, getAdminStorage } from '@/lib/firebase-admin';

const PLACEHOLDERS_COLLECTION = 'imagePlaceholders';
const FILES_COLLECTION = 'files';

function checkDb() {
    if (!db) throw new Error("Firestore is not initialized.");
}

// Sanitizes a hint string to be a valid Firestore document ID
const sanitizeHint = (hint: string) => hint.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

export async function getImageUrlForHint(hint: string): Promise<string | null> {
    checkDb();
    const sanitizedHint = sanitizeHint(hint);
    const placeholderDocRef = db.collection(PLACEHOLDERS_COLLECTION).doc(sanitizedHint);
    const placeholderDoc = await placeholderDocRef.get();

    if (!placeholderDoc.exists) {
        return null;
    }

    const fileId = placeholderDoc.data()?.fileId;
    if (!fileId) {
        return null;
    }
    
    const fileDocRef = db.collection(FILES_COLLECTION).doc(fileId);
    const fileDoc = await fileDocRef.get();

    if (!fileDoc.exists) {
        console.error(`Placeholder hint "${hint}" points to a non-existent file ID: ${fileId}`);
        return null;
    }

    const storagePath = fileDoc.data()?.storagePath;
    if (!storagePath) {
        console.error(`File document ${fileId} is missing a storagePath.`);
        return null;
    }
    
    try {
        const bucket = getAdminStorage().bucket();
        const file = bucket.file(storagePath);
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15-minute expiry
        });
        return url;
    } catch (error) {
        console.error(`Error getting signed URL for ${storagePath}:`, error);
        return null;
    }
}


export async function setFileForHint(hint: string, fileId: string): Promise<void> {
    checkDb();
    const sanitizedHint = sanitizeHint(hint);
    const placeholderDocRef = db.collection(PLACEHOLDERS_COLLECTION).doc(sanitizedHint);
    
    // Check if the file exists before setting the reference
    const fileDocRef = db.collection(FILES_COLLECTION).doc(fileId);
    const fileDoc = await fileDocRef.get();
    if (!fileDoc.exists) {
        throw new Error(`Cannot set hint: File with ID ${fileId} does not exist.`);
    }

    await placeholderDocRef.set({ fileId: fileId }, { merge: true });
}
