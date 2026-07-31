import { NextRequest, NextResponse } from "next/server";
import { ogeemoAgent } from '@/ai/flows/ogeemo-chat';

const DEFAULT_ASSISTANT_URL = "https://ogeemoassistant-qsckasljxq-uc.a.run.app";

const FUNCTIONS_REFUSAL_PATTERNS = [
    'provided guide context does not contain',
    'does not contain a direct definition',
    'cannot tell you based on the information provided',
    'the provided context does not contain',
    'the provided guide context does not contain',
    'i cannot tell you what',
];

function normalizeAnswerText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function shouldFallbackToGenkit(answer: string): boolean {
    const normalized = answer.toLowerCase();
    return FUNCTIONS_REFUSAL_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const question = (body?.question ?? body?.message ?? "").toString().trim();
        const history = Array.isArray(body?.history) ? body.history : [];
        const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : undefined;

        if (!question) {
            return NextResponse.json({ error: "Missing question in request body." }, { status: 400 });
        }

        const assistantUrl = process.env.OGEEMO_ASSISTANT_URL || DEFAULT_ASSISTANT_URL;

        const upstreamResponse = await fetch(assistantUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ question, history, sessionId }),
            cache: "no-store",
        });

        let upstreamJson: any = null;
        try {
            upstreamJson = await upstreamResponse.json();
        } catch {
            return NextResponse.json(
                { error: "Ogeemo Assistant returned a non-JSON response." },
                { status: 502 }
            );
        }

        if (!upstreamResponse.ok) {
            return NextResponse.json(
                {
                    error:
                        upstreamJson?.error ||
                        upstreamJson?.details ||
                        "Ogeemo Assistant request failed.",
                },
                { status: upstreamResponse.status }
            );
        }

        const functionsAnswer = normalizeAnswerText(upstreamJson?.answer);
        if (functionsAnswer && !shouldFallbackToGenkit(functionsAnswer)) {
            console.info('/api/ogeemo-assistant source', {
                source: 'functions_primary',
                reason: 'functions_answer_accepted',
            });
            return NextResponse.json({ answer: functionsAnswer }, { status: 200 });
        }

        try {
            const genkitResult = await ogeemoAgent({
                message: question,
                history,
                clientUserId: sessionId || 'ogeemo-guest',
            });

            const genkitAnswer = normalizeAnswerText(genkitResult?.reply);
            if (genkitAnswer && !shouldFallbackToGenkit(genkitAnswer)) {
                console.info('/api/ogeemo-assistant source', {
                    source: 'genkit_fallback',
                    reason: 'guide_context_missing',
                });
                return NextResponse.json({ answer: genkitAnswer }, { status: 200 });
            }
        } catch (fallbackError) {
            console.warn('/api/ogeemo-assistant genkit fallback failed', fallbackError);
        }

        console.info('/api/ogeemo-assistant source', {
            source: 'functions_fallback_after_genkit_miss',
            reason: functionsAnswer ? 'genkit_no_better_answer' : 'functions_empty_answer',
        });

        return NextResponse.json({ answer: functionsAnswer }, { status: 200 });
    } catch (error) {
        console.error("/api/ogeemo-assistant error", error);
        return NextResponse.json(
            { error: "Internal server error while contacting Ogeemo Assistant." },
            { status: 500 }
        );
    }
}
