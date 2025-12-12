
import {NextRequest, NextResponse} from 'next/server';
import {ogeemoAgent} from '@/ai/flows/ogeemo-chat'; // Ensure we import the new wrapper function
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

    // Call the exported wrapper function, which will in turn run the Genkit flow.
    const result = await ogeemoAgent({userId, message, history: history || []});
    
    // The result is now guaranteed to be a JSON-serializable object.
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error("[Ogeemo Agent API Error]", error);
    return NextResponse.json({error: error.message || 'An unexpected error occurred.'}, {status: 500});
  }
}
