import { NextRequest, NextResponse } from 'next/server';
import { ogeemoAgent } from '@/ai/flows/ogeemo-chat';
import { getCurrentSessionContext } from '@/app/actions';
import { assistantLimiter, tooManyRequests } from '@/lib/ai-limits';
import { checkPrompt, limitHistory } from '@/lib/ai-input';
import { trustedRuntimeContext } from '@/lib/ai-runtime';

/**
 * The plain operational agent (no contact workflow). Who is asking, the workspace and the role come from the
 * signed-in session; the request body supplies only the message, the history and the page.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session) return NextResponse.json({ error: 'Please sign in to use the Co-Pilot.' }, { status: 401 });

    const limit = assistantLimiter.check(session.userId);
    if (!limit.ok) {
      return NextResponse.json({ error: tooManyRequests(limit.retryAfterSeconds) }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
    }

    const body = await req.json().catch(() => null);
    const prompt = checkPrompt(body?.message, 4000);
    if (!prompt.ok) return NextResponse.json({ error: prompt.error }, { status: 400 });

    const result = await ogeemoAgent({
      message: prompt.text,
      history: limitHistory(body?.history),
      runtimeContext: trustedRuntimeContext(session, body?.runtimeContext, '/co-pilot'),
    });
    return NextResponse.json(result);
  } catch (error: any) {
    // The detail goes to the server log; the browser gets a message that cannot leak internals.
    console.error('[Genkit Chat API Error]', error);
    return NextResponse.json({ error: 'The assistant could not answer right now. Please try again.' }, { status: 500 });
  }
}
