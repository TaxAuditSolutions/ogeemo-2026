import { NextRequest, NextResponse } from "next/server";
import { ogeemoAgent } from '@/ai/flows/ogeemo-chat';

const DEFAULT_ASSISTANT_URL = "https://ogeemoassistant-qsckasljxq-uc.a.run.app";

type AssistantRefusalReason = 'none' | 'no_guide_match' | 'insufficient_guide_detail' | 'policy_refusal';

type UpstreamAssistantMetadata = {
    answeredFromGuides?: boolean;
    refusal?: boolean;
    refusalReason?: AssistantRefusalReason;
    answerSource?: 'deterministic_identity' | 'exact_intent_structured' | 'gemini_generated';
    questionType?: 'identity_or_navigation' | 'procedural_or_other';
    contextChunkCount?: number;
    responseMode?: 'chat' | 'verification';
};

type FallbackDecision = {
    shouldFallback: boolean;
    reason:
    | 'metadata_refusal_true'
    | 'metadata_answered_from_guides_false'
    | 'metadata_refusal_reason_no_guide_match'
    | 'metadata_refusal_reason_insufficient_guide_detail'
    | 'legacy_refusal_pattern_match'
    | 'functions_empty_answer'
    | 'functions_answer_accepted';
};

const FUNCTIONS_REFUSAL_PATTERNS = [
    'provided guide context does not contain',
    'does not contain a direct definition',
    'cannot tell you based on the information provided',
    'the provided context does not contain',
    'the provided guide context does not contain',
    'i cannot tell you what',
    'i cannot answer',
    "can't answer",
    'outside the provided guide context',
    'outside the guide context',
    'not in the provided context',
    'no relevant guide context',
    'i do not have enough context',
    'insufficient context',
];

function normalizeAnswerText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function hasLegacyRefusalPattern(answer: string): boolean {
    const normalized = answer.toLowerCase();
    return FUNCTIONS_REFUSAL_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function parseUpstreamMetadata(value: unknown): UpstreamAssistantMetadata | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    return value as UpstreamAssistantMetadata;
}

function determineFallbackDecision(answer: string, metadata?: UpstreamAssistantMetadata): FallbackDecision {
    if (metadata) {
        if (metadata.refusal === true) {
            return { shouldFallback: true, reason: 'metadata_refusal_true' };
        }

        if (metadata.answeredFromGuides === false) {
            return { shouldFallback: true, reason: 'metadata_answered_from_guides_false' };
        }

        if (metadata.refusalReason === 'no_guide_match') {
            return { shouldFallback: true, reason: 'metadata_refusal_reason_no_guide_match' };
        }

        if (metadata.refusalReason === 'insufficient_guide_detail') {
            return { shouldFallback: true, reason: 'metadata_refusal_reason_insufficient_guide_detail' };
        }

        return { shouldFallback: false, reason: 'functions_answer_accepted' };
    }

    if (!answer) {
        return { shouldFallback: true, reason: 'functions_empty_answer' };
    }

    if (hasLegacyRefusalPattern(answer)) {
        return { shouldFallback: true, reason: 'legacy_refusal_pattern_match' };
    }

    return { shouldFallback: false, reason: 'functions_answer_accepted' };
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
        const functionsMetadata = parseUpstreamMetadata(upstreamJson?._metadata);
        const fallbackDecision = determineFallbackDecision(functionsAnswer, functionsMetadata);

        if (functionsAnswer && !fallbackDecision.shouldFallback) {
            console.info('/api/ogeemo-assistant source', {
                source: 'functions_primary',
                reason: fallbackDecision.reason,
                decisionPath: 'metadata_or_legacy_primary',
                functionsRefusal: functionsMetadata?.refusal ?? null,
                refusalReason: functionsMetadata?.refusalReason ?? null,
                genkitAttempted: false,
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
            if (genkitAnswer && !hasLegacyRefusalPattern(genkitAnswer)) {
                console.info('/api/ogeemo-assistant source', {
                    source: 'genkit_fallback',
                    reason: fallbackDecision.reason,
                    decisionPath: 'genkit_fallback_accepted',
                    functionsRefusal: functionsMetadata?.refusal ?? null,
                    refusalReason: functionsMetadata?.refusalReason ?? null,
                    genkitAttempted: true,
                });
                return NextResponse.json({ answer: genkitAnswer }, { status: 200 });
            }
        } catch (fallbackError) {
            console.warn('/api/ogeemo-assistant genkit fallback failed', fallbackError);
        }

        console.info('/api/ogeemo-assistant source', {
            source: 'functions_fallback_after_genkit_miss',
            reason: functionsAnswer ? 'genkit_no_better_answer' : fallbackDecision.reason,
            decisionPath: 'genkit_fallback_miss_return_functions',
            functionsRefusal: functionsMetadata?.refusal ?? null,
            refusalReason: functionsMetadata?.refusalReason ?? null,
            genkitAttempted: true,
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
