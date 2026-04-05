import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const { idToken } = await req.json();
        if (!idToken) {
            return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
        }
        
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const adminAuth = getAdminAuth();
        if (!adminAuth) {
            console.warn("[Auth API] Admin Auth not initialized. Sessions are disabled.");
            return NextResponse.json({ error: 'Auth service unavailable in development' }, { status: 401 });
        }
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        
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
