import {NextRequest, NextResponse} from 'next/server';
import {ogeemoAgent} from '@/ai/flows/ogeemo-chat';
import {getCurrentUserId} from '@/app/actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {message, history: rawHistory, clientUserId, localContext} = body;
    
    // 1. Total Auth Immunity in Development
    let userId = 'ogeemo-guest';
    if (process.env.NODE_ENV === 'production') {
        try {
            const serverUserId = await getCurrentUserId();
            if (serverUserId) userId = serverUserId;
        } catch (authError: any) {
            console.warn("[AI Auth] Production server auth check failed.");
        }
    } else {
        userId = clientUserId || 'ogeemo-guest';
    }

    if (!message) {
      return NextResponse.json({error: 'Message is required.'}, {status: 400});
    }

    // 2. Strict History Mapping (Critical Fix)
    // We manually map every message to ensure it matches the AI's strict Zod schema.
    const mappedHistory = Array.isArray(rawHistory) ? rawHistory.map((msg: any) => {
        // If message is already model/user role-based
        const role = msg.role === 'model' || msg.role === 'assistant' ? 'model' : 'user';
        let content = [];
        if (typeof msg.content === 'string') {
            content = [{ text: msg.content }];
        } else if (Array.isArray(msg.content)) {
            content = msg.content.map((c: any) => ({ text: c.text || c.toString() }));
        } else {
            content = [{ text: msg.message || '' }];
        }
        return { role, content };
    }) : [];

    // 3. Dispatch to AI Agent with Enhanced Catching
    console.log(`[AI Dispatch] Processing signal for User: ${userId}`);
    try {
        const result = await ogeemoAgent({
            message, 
            history: mappedHistory, 
            clientUserId: userId,
            localContext // Pass the "Pulse" data to the flow
        });
        
        console.log(`[AI Dispatch] Request Success for User: ${userId}`);
        return NextResponse.json(result);
    } catch (agentError: any) {
        console.error("[Ogeemo Agent ERROR]:", agentError);
        throw agentError; // Let the outer catch handle the JSON response
    }
    
  } catch (error: any) {
    // Diagnostic logging to console (safe for both local and production)
    console.error("[Ogeemo Final Fix API Error]", error);

    return NextResponse.json({
        error: 'Intelligence Dispatch Error',
        details: error.message || 'The AI Engine encountered an unexpected signal state.',
        code: error.code || 'ENGINE_ERROR'
    }, {status: 500});
  }
}
