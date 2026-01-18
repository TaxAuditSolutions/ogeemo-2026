
// This environment variable MUST be set before any other Firebase modules are loaded.
process.env.GRPC_SSL_CIPHER_SUITES = process.env.GRPC_SSL_CIPHER_SUITES ?? 'HIGH+ECDSA';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb, getAdminStorage } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

// Ensure admin app is initialized eagerly
getAdminApp();

export async function POST(req: NextRequest) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
        return NextResponse.json({ error: 'Unauthorized: No session cookie.' }, { status: 401 });
    }

    try {
        await getAdminAuth().verifySessionCookie(sessionCookie, true);
    } catch (error) {
        console.error("Session verification error:", error);
        return NextResponse.json({ error: 'Unauthorized: Invalid session.' }, { status: 401 });
    }
    
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const imageId = formData.get('imageId') as string | null;

        if (!file || !imageId) {
            return NextResponse.json({ error: 'File or imageId missing' }, { status: 400 });
        }

        const bucket = getAdminStorage().bucket();
        
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const storagePath = `site-images/${imageId}.${fileExtension}`;
        const fileRef = bucket.file(storagePath);
        
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        await fileRef.save(fileBuffer, {
            metadata: {
                contentType: file.type,
                cacheControl: 'public, max-age=31536000', // Cache for 1 year
            },
        });
        
        await fileRef.makePublic();
        const publicUrl = fileRef.publicUrl();

        const db = getAdminDb();
        const imageDocRef = db.collection('siteImages').doc(imageId);
        await imageDocRef.set({ url: publicUrl }, { merge: true });

        return NextResponse.json({ success: true, url: publicUrl });

    } catch (error: any) {
        console.error('Image upload API error:', error);
        return NextResponse.json({ error: `Failed to upload image: ${error.message}` }, { status: 500 });
    }
}
