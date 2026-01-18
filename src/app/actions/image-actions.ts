
'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { getCurrentUserId } from '@/app/actions';

/**
 * A server action to securely update a site image URL in Firestore.
 */
export async function updateSiteImageUrl(imageId: string, url: string): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'Authentication required.' };
  }

  try {
    const db = getAdminDb();
    const imageDocRef = db.collection('siteImages').doc(imageId);
    
    // Use set with merge to create the document if it doesn't exist.
    await imageDocRef.set({ url: url }, { merge: true });

    return { success: true };
  } catch (error: any) {
    console.error('Server Action Error updating site image URL:', error);
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}
