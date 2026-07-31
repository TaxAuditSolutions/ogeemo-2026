import { NextRequest, NextResponse } from "next/server";
import { ogeemoAgent, ogeemoGeneralKnowledgeFallbackAgent } from '@/ai/flows/ogeemo-chat';

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
                decisionPath: 'functions_primary',
                functionsRefusal: functionsMetadata?.refusal ?? null,
                refusalReason: functionsMetadata?.refusalReason ?? null,
                genkitAttempted: false,
            });
            return NextResponse.json({ answer: functionsAnswer }, { status: 200 });
        }

        console.info('/api/ogeemo-assistant fallback-triggered', {
            reason: fallbackDecision.reason,
            decisionPath: 'functions_miss_trigger_fallback',
            functionsRefusal: functionsMetadata?.refusal ?? null,
            refusalReason: functionsMetadata?.refusalReason ?? null,
        });

        let operationalOutcome: 'accepted' | 'empty_reply' | 'refusal_pattern' | 'error' = 'error';
        try {
            console.info('/api/ogeemo-assistant genkit-operational-attempt', {
                decisionPath: 'genkit_operational_attempt',
                reason: fallbackDecision.reason,
            });

            const genkitResult = await ogeemoAgent({
                message: question,
                history,
                clientUserId: sessionId || 'ogeemo-guest',
            });

            const genkitAnswer = normalizeAnswerText(genkitResult?.reply);
            if (genkitAnswer && !hasLegacyRefusalPattern(genkitAnswer)) {
                console.info('/api/ogeemo-assistant source', {
                    source: 'genkit_operational_accepted',
                    reason: fallbackDecision.reason,
                    decisionPath: 'functions_miss->genkit_operational_accepted',
                    functionsRefusal: functionsMetadata?.refusal ?? null,
                    refusalReason: functionsMetadata?.refusalReason ?? null,
                    genkitAttempted: true,
                    genkitOperationalOutcome: 'accepted',
                });
                return NextResponse.json({ answer: genkitAnswer }, { status: 200 });
            }

            operationalOutcome = genkitAnswer ? 'refusal_pattern' : 'empty_reply';
            console.info('/api/ogeemo-assistant genkit-operational-miss', {
                decisionPath: 'functions_miss->genkit_operational_miss',
                reason: fallbackDecision.reason,
                genkitOperationalOutcome: operationalOutcome,
            });
        } catch (fallbackError) {
            operationalOutcome = 'error';
            console.warn('/api/ogeemo-assistant genkit fallback failed', fallbackError);
        }

        let generalOutcome: 'accepted' | 'empty_reply' | 'refusal_pattern' | 'error' = 'error';
        try {
            console.info('/api/ogeemo-assistant genkit-general-knowledge-attempt', {
                decisionPath: 'genkit_general_knowledge_attempt',
                reason: fallbackDecision.reason,
            });

            const generalResult = await ogeemoGeneralKnowledgeFallbackAgent({
                message: question,
                history,
                clientUserId: sessionId || 'ogeemo-guest',
            });

            const generalAnswer = normalizeAnswerText(generalResult?.reply);
            if (generalAnswer && !hasLegacyRefusalPattern(generalAnswer)) {
                console.info('/api/ogeemo-assistant source', {
                    source: 'genkit_general_knowledge_accepted',
                    reason: fallbackDecision.reason,
                    decisionPath: 'functions_miss->genkit_operational_miss->genkit_general_knowledge_accepted',
                    functionsRefusal: functionsMetadata?.refusal ?? null,
                    refusalReason: functionsMetadata?.refusalReason ?? null,
                    genkitAttempted: true,
                    genkitOperationalOutcome: operationalOutcome,
                    genkitGeneralKnowledgeOutcome: 'accepted',
                });
                return NextResponse.json({ answer: generalAnswer }, { status: 200 });
            }

            generalOutcome = generalAnswer ? 'refusal_pattern' : 'empty_reply';
            console.info('/api/ogeemo-assistant genkit-general-knowledge-miss', {
                decisionPath: 'functions_miss->genkit_operational_miss->genkit_general_knowledge_miss',
                reason: fallbackDecision.reason,
                genkitGeneralKnowledgeOutcome: generalOutcome,
            });
        } catch (fallbackError) {
            generalOutcome = 'error';
            console.warn('/api/ogeemo-assistant genkit general knowledge fallback failed', fallbackError);
        }

        console.info('/api/ogeemo-assistant source', {
            source: 'functions_fallback_both_miss',
            reason: functionsAnswer ? 'genkit_no_better_answer' : fallbackDecision.reason,
            decisionPath: 'functions_miss->genkit_operational_miss->genkit_general_knowledge_miss->return_functions',
            functionsRefusal: functionsMetadata?.refusal ?? null,
            refusalReason: functionsMetadata?.refusalReason ?? null,
            genkitAttempted: true,
            genkitOperationalOutcome: operationalOutcome,
            genkitGeneralKnowledgeOutcome: generalOutcome,
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
