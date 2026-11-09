import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/ai/flows/image-generation-flow';
import { getCurrentUserId } from '@/app/actions';
import { checkPrompt } from '@/lib/ai-input';
import { imageLimiter, tooManyRequests } from '@/lib/ai-limits';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const limit = imageLimiter.check(userId);
    if (!limit.ok) return NextResponse.json({ error: tooManyRequests(limit.retryAfterSeconds) }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });

    const body = await req.json().catch(() => null);
    const prompt = checkPrompt(body?.prompt, 1000);
    if (!prompt.ok) return NextResponse.json({ error: prompt.error }, { status: 400 });

    const result = await generateImage({ prompt: prompt.text });
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("[Image Generation API Error]", error);

    if (error.message?.includes('429') || error.message?.includes('Resource exhausted')) {
        return NextResponse.json({
            error: 'Visualizer over capacity.',
            details: 'The image generation service is temporarily busy due to high traffic. Please try again in a minute.',
            code: 'QUOTA_EXHAUSTED'
        }, { status: 429 });
    }

    return NextResponse.json({ error: 'The image could not be generated right now. Please try again.' }, { status: 500 });
  }
}
