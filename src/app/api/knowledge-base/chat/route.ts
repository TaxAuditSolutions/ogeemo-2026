import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSessionContext } from '@/app/actions';
import { knowledgeBaseChat } from '@/ai/flows/knowledge-base-chat';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getCurrentSessionContext();
  if (!session) return NextResponse.json({ error: 'Please sign in to use the Knowledge Base.' }, { status: 401 });

  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return NextResponse.json({ error: 'A question is required.' }, { status: 400 });
    if (message.length > 2000) return NextResponse.json({ error: 'Please keep questions under 2,000 characters.' }, { status: 400 });

    const currentPath = typeof body.currentPath === 'string' && body.currentPath.startsWith('/')
      ? body.currentPath.slice(0, 200)
      : '/knowledge-base';
    const result = await knowledgeBaseChat({
      message,
      history: Array.isArray(body.history) ? body.history.slice(-12) : [],
      currentPath,
      accessLevel: session.accessLevel,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Knowledge Base API]', error?.message ?? error);
    return NextResponse.json({ error: 'The Knowledge Base could not answer right now. Please try again.' }, { status: 500 });
  }
}
