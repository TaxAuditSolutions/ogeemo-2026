import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/core/firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const { idToken } = await req.json();
        if (!idToken) {
            return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
        }
        
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const adminAuth = getAdminAuth();
        
        let sessionCookie: string;
        
        if (!adminAuth) {
            console.warn("[Auth API] Admin Auth not initialized. Using developer fallback session.");
            try {
                // Safely extract the user ID from the client's JWT without verifying the signature.
                const base64Url = idToken.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
                const decoded = JSON.parse(jsonPayload);
                sessionCookie = `dev_mock_${decoded.user_id}`;
            } catch (error) {
                console.warn("[Auth API] Failed to parse ID token, using generic dev mock session.");
                sessionCookie = 'dev_mock_developer';
            }
        } else {
            sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        }
        
        const options = {
            name: 'session',
            value: sessionCookie,
            maxAge: expiresIn / 1000,
            httpOnly: true,
            secure: req.nextUrl.protocol === 'https:',
            path: '/',
            sameSite: 'lax' as const,
        };

        const response = NextResponse.json({ status: 'success' }, { status: 200 });
        response.cookies.set(options);
        
        return response;

    } catch (error: any) {
        console.error('Error creating session cookie:', error);
        return NextResponse.json({ error: 'Unauthorized', details: error.message }, { status: 401 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const options = {
            name: 'session',
            value: '',
            maxAge: -1,
            path: '/',
        };
        const response = NextResponse.json({ status: 'success' }, { status: 200 });
        response.cookies.set(options);
        return response;
    } catch (error: any) {
         console.error('Error deleting session cookie:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
