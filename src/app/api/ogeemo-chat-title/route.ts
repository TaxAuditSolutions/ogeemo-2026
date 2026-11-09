import { NextRequest, NextResponse } from "next/server";
import { generateChatTitle } from '@/ai/flows/generate-chat-title';
import { getCurrentSessionContext } from '@/app/actions';
import { tooManyRequests, titleLimiter } from '@/lib/ai-limits';

export async function POST(request: NextRequest) {
    try {
        // Every title is a billed model call, so it needs a signed-in user and a rate limit.
        const session = await getCurrentSessionContext();
        if (!session) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
        const limit = titleLimiter.check(session.userId);
        if (!limit.ok) return NextResponse.json({ error: tooManyRequests(limit.retryAfterSeconds) }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });

        const body = await request.json().catch(() => null);
        const userMessage = typeof body?.userMessage === 'string' ? body.userMessage.trim().slice(0, 2000) : '';
        const assistantReply = typeof body?.assistantReply === 'string' ? body.assistantReply.trim().slice(0, 2000) : '';

        if (!userMessage) {
            return NextResponse.json(
                { error: 'userMessage is required to generate a chat title.' },
                { status: 400 }
            );
        }

        const result = await generateChatTitle({
            userMessage,
            assistantReply: assistantReply || undefined,
        });

        return NextResponse.json({ title: result.title }, { status: 200 });
    } catch (error) {
        console.error("/api/ogeemo-chat-title error", error);
        return NextResponse.json(
            { error: "Internal server error while generating a chat title." },
            { status: 500 }
        );
    }
}
