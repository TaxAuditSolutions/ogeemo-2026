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
        const runtimeContext = body?.runtimeContext && typeof body.runtimeContext === 'object' ? body.runtimeContext : undefined;

        if (!question) {
            return NextResponse.json({ error: "Missing question in request body." }, { status: 400 });
        }

        const assistantUrl = process.env.OGEEMO_ASSISTANT_URL || DEFAULT_ASSISTANT_URL;

        let upstreamResponse: Response | null = null;
        let upstreamJson: any = null;
        let upstreamStatus: number | null = null;
        let upstreamContentType: string | null = null;
        let upstreamFailureKind: 'none' | 'fetch_error' | 'non_json' | 'http_error' = 'none';

        try {
            const controller = new AbortController();
            const timeoutMs = 10000;
            const timeout = setTimeout(() => controller.abort(), timeoutMs);

            upstreamResponse = await fetch(assistantUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ question, history, sessionId }),
                cache: "no-store",
                signal: controller.signal,
            });

            clearTimeout(timeout);

            upstreamStatus = upstreamResponse.status;
            upstreamContentType = upstreamResponse.headers.get('content-type');

            const upstreamText = await upstreamResponse.text();
            if (upstreamText) {
                try {
                    upstreamJson = JSON.parse(upstreamText);
                } catch {
                    upstreamFailureKind = 'non_json';
                    console.warn('/api/ogeemo-assistant upstream-non-json', {
                        upstreamStatus,
                        upstreamContentType,
                        bodyPreview: upstreamText.slice(0, 200),
                    });
                }
            }

            if (!upstreamResponse.ok && upstreamFailureKind === 'none') {
                upstreamFailureKind = 'http_error';
                console.warn('/api/ogeemo-assistant upstream-http-error', {
                    upstreamStatus,
                    upstreamContentType,
                    upstreamError: upstreamJson?.error ?? upstreamJson?.details ?? null,
                });
            }
        } catch (upstreamError) {
            upstreamFailureKind = 'fetch_error';
            const message = upstreamError instanceof Error ? upstreamError.message : String(upstreamError);
            console.warn('/api/ogeemo-assistant upstream-fetch-error', {
                message,
                assistantUrl,
            });
        }

        const functionsAnswer = normalizeAnswerText(upstreamJson?.answer);
        const functionsMetadata = parseUpstreamMetadata(upstreamJson?._metadata);
        const fallbackDecision = determineFallbackDecision(functionsAnswer, functionsMetadata);

        const shouldForceFallbackFromUpstreamFailure = upstreamFailureKind !== 'none';

        if (functionsAnswer && !fallbackDecision.shouldFallback && !shouldForceFallbackFromUpstreamFailure) {
            console.info('/api/ogeemo-assistant source', {
                source: 'functions_primary',
                reason: fallbackDecision.reason,
                decisionPath: 'functions_primary',
                functionsRefusal: functionsMetadata?.refusal ?? null,
                refusalReason: functionsMetadata?.refusalReason ?? null,
                genkitAttempted: false,
                upstreamFailureKind,
            });
            return NextResponse.json({ answer: functionsAnswer }, { status: 200 });
        }

        console.info('/api/ogeemo-assistant fallback-triggered', {
            reason: shouldForceFallbackFromUpstreamFailure ? upstreamFailureKind : fallbackDecision.reason,
            decisionPath: 'functions_miss_trigger_fallback',
            functionsRefusal: functionsMetadata?.refusal ?? null,
            refusalReason: functionsMetadata?.refusalReason ?? null,
            upstreamStatus,
            upstreamContentType,
            upstreamFailureKind,
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
                runtimeContext: {
                    userId: runtimeContext?.userId || sessionId,
                    orgId: runtimeContext?.orgId,
                    accessLevel: runtimeContext?.accessLevel,
                    isMasterTenant: runtimeContext?.isMasterTenant,
                    currentPath: runtimeContext?.currentPath || new URL(request.url).pathname,
                    activeOrgName: runtimeContext?.activeOrgName,
                },
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
                    upstreamFailureKind,
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
                runtimeContext: {
                    userId: runtimeContext?.userId || sessionId,
                    orgId: runtimeContext?.orgId,
                    accessLevel: runtimeContext?.accessLevel,
                    isMasterTenant: runtimeContext?.isMasterTenant,
                    currentPath: runtimeContext?.currentPath || new URL(request.url).pathname,
                    activeOrgName: runtimeContext?.activeOrgName,
                },
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
                    upstreamFailureKind,
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
            upstreamFailureKind,
            upstreamStatus,
        });

        if (functionsAnswer) {
            return NextResponse.json({ answer: functionsAnswer }, { status: 200 });
        }

        const terminalError =
            upstreamFailureKind === 'non_json'
                ? 'Ogeemo Assistant returned a non-JSON response and fallback could not provide an answer.'
                : upstreamFailureKind === 'http_error'
                    ? 'Ogeemo Assistant upstream error and fallback could not provide an answer.'
                    : upstreamFailureKind === 'fetch_error'
                        ? 'Could not reach Ogeemo Assistant upstream and fallback could not provide an answer.'
                        : 'No answer returned from Ogeemo Assistant or fallback.';

        return NextResponse.json(
            {
                error: terminalError,
                details: {
                    upstreamFailureKind,
                    upstreamStatus,
                    genkitOperationalOutcome: operationalOutcome,
                    genkitGeneralKnowledgeOutcome: generalOutcome,
                },
            },
            { status: 502 }
        );
    } catch (error) {
        console.error("/api/ogeemo-assistant error", error);
        return NextResponse.json(
            { error: "Internal server error while contacting Ogeemo Assistant." },
            { status: 500 }
        );
    }
}
