import {NextRequest, NextResponse} from 'next/server';
import {ogeemoAgent} from '@/ai/flows/ogeemo-chat';
import {getCurrentUserId} from '@/app/actions';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const {message, history} = await req.json();

    if (!message) {
      return NextResponse.json({error: 'Message is required.'}, {status: 400});
    }

    // Call the ogeemoAgent wrapper function
    const result = await ogeemoAgent({userId, message, history: history || []});
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error("[Ogeemo Agent API Error]", error);
    // Return specific error details to the frontend
    return NextResponse.json({
        error: 'Agent communication error.',
        details: error.message || 'An unexpected error occurred during the AI interaction.',
        code: error.code || 'UNKNOWN'
    }, {status: 500});
  }
}
