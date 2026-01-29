import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/ai/flows/image-generation-flow';
import { getCurrentUserId } from '@/app/actions';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const result = await generateImage({ prompt });
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error("[Image Generation API Error]", error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
