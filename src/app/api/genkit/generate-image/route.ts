
import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/ai/flows/generate-image-flow';

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
        }

        const result = await generateImage({ prompt });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Error in generate-image route handler:", error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
