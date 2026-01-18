
'use server';

import { getAdminStorage } from '@/lib/firebase-admin';

// This is a helper function to convert a data URI to a Buffer.
const dataUriToBuffer = (dataUri: string) => {
  const base64 = dataUri.split(',')[1];
  if (!base64) {
    throw new Error('Invalid data URI');
  }
  return Buffer.from(base64, 'base64');
};

/**
 * A server action to upload an image from a data URI to Firebase Storage.
 * @param dataUri The data URI of the image to upload.
 * @param fileName The desired file name for the image in storage.
 * @returns The public URL of the uploaded image.
 */
export async function uploadImageFromDataUri(
  dataUri: string,
  fileName: string
): Promise<{ publicUrl: string }> {
    try {
        const buffer = dataUriToBuffer(dataUri);
        const bucket = getAdminStorage().bucket();

        // We use a consistent path to make it easy to find images later
        const filePath = `site-images/${fileName}`;
        const file = bucket.file(filePath);

        await file.save(buffer, {
            metadata: {
                contentType: dataUri.split(';')[0].split(':')[1], // Extracts MIME type e.g., 'image/png'
            },
        });

        // Make the file public so it can be accessed by a URL
        await file.makePublic();

        return { publicUrl: file.publicUrl() };

    } catch (error: any) {
        console.error("Error uploading image from data URI:", error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }
}
