
// This environment variable MUST be set before any other Firebase modules are loaded.
process.env.GRPC_SSL_CIPHER_SUITES = process.env.GRPC_SSL_CIPHER_SUITES ?? 'HIGH+ECDSA';

import { NextResponse } from 'next/server';
import { getAdminStorage } from '@/lib/firebase-admin';

// Helper to convert data URI to Buffer
const dataUriToBuffer = (dataUri: string) => {
  const base64 = dataUri.split(',')[1];
  if (!base64) {
    throw new Error('Invalid data URI');
  }
  return Buffer.from(base64, 'base64');
};

// Increase the body size limit for this specific API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export async function POST(req: Request) {
  try {
    const { dataUri, fileName } = await req.json();

    if (!dataUri || !fileName) {
      return NextResponse.json({ error: 'Missing dataUri or fileName' }, { status: 400 });
    }

    const buffer = dataUriToBuffer(dataUri);
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
        throw new Error("Storage bucket name not configured in environment variables.");
    }
    const bucket = getAdminStorage().bucket(bucketName);

    const filePath = `site-images/${fileName}`;
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: dataUri.split(';')[0].split(':')[1],
      },
    });

    await file.makePublic();

    return NextResponse.json({ publicUrl: file.publicUrl() });
  } catch (error: any) {
    console.error("Error in upload-image API route:", error);
    // Special check for body size error, which might happen if a file exceeds the new 4mb limit
    if (error.type === 'entity.too.large') {
        return NextResponse.json({ error: 'Image file is too large. Please use an image under 4MB.' }, { status: 413 });
    }
    return NextResponse.json({ error: `Failed to upload image: ${error.message}` }, { status: 500 });
  }
}
