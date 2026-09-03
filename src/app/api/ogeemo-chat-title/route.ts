import { NextRequest, NextResponse } from "next/server";
import { generateChatTitle } from '@/ai/flows/generate-chat-title';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);
        const userMessage = typeof body?.userMessage === 'string' ? body.userMessage.trim() : '';
        const assistantReply = typeof body?.assistantReply === 'string' ? body.assistantReply.trim() : '';

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
