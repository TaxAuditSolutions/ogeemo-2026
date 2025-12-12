import { NextRequest, NextResponse } from 'next/server';
import { generateFlowchart } from '@/ai/flows/generate-flowchart-flow';

export async function POST(req: NextRequest) {
    try {
        const { description } = await req.json();

        if (!description) {
            return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
        }

        const result = await generateFlowchart({ description });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Error in generate-flowchart route handler:", error);
        return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
