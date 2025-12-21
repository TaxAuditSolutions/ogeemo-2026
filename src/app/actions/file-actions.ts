// src/app/actions/file-actions.ts
'use server';

import { getAdminFileContentFromStorage } from '@/lib/firebase-admin';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

/**
 * A server action to securely fetch the content of a file from Firebase Storage.
 */
export async function fetchFileContent(fileId: string): Promise<{ content?: string; error?: string }> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
        return { error: 'Authentication required. Please log in.' };
    }

    try {
        const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        const userId = decodedToken.uid;
        
        const fileDocRef = adminDb.collection('files').doc(fileId);
        const fileDoc = await fileDocRef.get();

        if (!fileDoc.exists || fileDoc.data()?.userId !== userId) {
            return { error: 'File not found or access denied.' };
        }
        
        const storagePath = fileDoc.data()?.storagePath;
        if (!storagePath) {
             return { error: 'File has no content associated with it.' };
        }

        const content = await getAdminFileContentFromStorage(storagePath);
        return { content };

    } catch (error: any) {
        console.error('Server Action Error fetching file content:', error);
        if (error.code === 'auth/session-cookie-expired') {
             return { error: 'Your session has expired. Please log in again.' };
        }
        return { error: error.message || 'An unexpected error occurred.' };
    }
}
