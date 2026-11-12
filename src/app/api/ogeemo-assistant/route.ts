import { NextRequest, NextResponse } from "next/server";
import { ogeemoAgent, ogeemoGeneralKnowledgeFallbackAgent, orchestrateContactCapability } from '@/ai/flows/ogeemo-chat';
import { buildDeterministicContactDraft, reconcileContactDraftAction, resolveAssistantCapabilityActionWithRepair, type AssistantMessageAction } from '@/ai/assistant-actions';
import { getCurrentSessionContext } from '@/app/actions';
import { getAdminDb } from '@/core/firebase-admin';
import { assistantLimiter, tooManyRequests } from '@/lib/ai-limits';
import { checkPrompt, limitHistory } from '@/lib/ai-input';
import { recentUserText, selectCatalogContacts, trustedRuntimeContext } from '@/lib/ai-runtime';
import { openActionFor, openedFormNote } from '@/lib/ai-open-record';
import { fallbackAnswer } from '@/lib/ai-fallback-note';

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
    "don't have specific instructions in my current guides",
    "don't have specific instructions",
    'missing details on modifying an existing contact',
    'missing details on modifying',
];

function normalizeAnswerText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function hasLegacyRefusalPattern(answer: string): boolean {
    const normalized = answer.toLowerCase();
    return FUNCTIONS_REFUSAL_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/**
 * Last-resort draft builder: runs the deterministic contact extractor and
 * validates the result against the tenant folder allowlist. Returns the
 * degraded API response payload, or undefined when the message contains no
 * extractable contact.
 */
function buildDeterministicDraftResponse(question: string, tenantFolders: Array<{ id: string; name: string; parentId?: string | null }>) {
    if (tenantFolders.length === 0) return undefined;
    const draftAction = buildDeterministicContactDraft(question, tenantFolders);
    if (!draftAction) return undefined;
    const action = resolveAssistantCapabilityActionWithRepair(draftAction, tenantFolders);
    if (action?.type !== 'open_contact_form') return undefined;
    const draft = action.draft;
    const detail = [draft.name, draft.email, draft.cellPhone, draft.businessPhone, draft.homePhone].filter(Boolean).join(' • ');
    return {
        action,
        answer: `I prepared a draft contact for you${detail ? ` (${detail})` : ''}. It's open now — select the folder, add any extra details, and save when you're ready.`,
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);

        // Who is asking, which workspace and what role come from the signed-in SESSION. The browser used to be
        // trusted for all of them, so any client could claim another workspace or the super_admin role.
        const session = await getCurrentSessionContext();
        if (!session) return NextResponse.json({ error: 'Please sign in to use the Co-Pilot.' }, { status: 401 });

        const limit = assistantLimiter.check(session.userId);
        if (!limit.ok) {
            return NextResponse.json({ error: tooManyRequests(limit.retryAfterSeconds) }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } });
        }

        const prompt = checkPrompt(body?.question ?? body?.message, 4000);
        if (!prompt.ok) return NextResponse.json({ error: prompt.error }, { status: 400 });
        const question = prompt.text;
        const history = limitHistory(body?.history);
        const runtimeContext = trustedRuntimeContext(session, body?.runtimeContext, '/co-pilot');

        let tenantFolders: Array<{ id: string; name: string; parentId?: string | null }> = [];
        let tenantContacts: Array<{ id: string; name: string; email?: string; businessName?: string; folderId?: string }> = [];
        try {
            const sessionContext = session;
            if (sessionContext) {
                const db = getAdminDb();
                const [folderSnapshot, contactSnapshot] = db && sessionContext.orgId
                    ? await Promise.all([
                        db.collection('contactFolders').where('orgId', '==', sessionContext.orgId).get(),
                        db.collection('contacts').where('orgId', '==', sessionContext.orgId).get(),
                    ])
                    : [null, null];
                tenantFolders = folderSnapshot?.docs.map((folderDoc) => {
                    const folderData = folderDoc.data();
                    return {
                        id: folderDoc.id,
                        name: String(folderData.name || ''),
                        parentId: typeof folderData.parentId === 'string' ? folderData.parentId : null,
                    };
                }).filter((folder) => folder.name) ?? [];

                tenantContacts = contactSnapshot?.docs.map((contactDoc) => {
                    const data = contactDoc.data();
                    return {
                        id: contactDoc.id,
                        name: String(data.name || ''),
                        email: typeof data.email === 'string' ? data.email : undefined,
                        businessName: typeof data.businessName === 'string' ? data.businessName : undefined,
                        folderId: typeof data.folderId === 'string' ? data.folderId : undefined,
                    };
                }).filter((c) => c.name) ?? [];

                const capabilityResult = await orchestrateContactCapability({
                    message: question,
                    history,
                    userId: sessionContext.userId,
                    orgId: sessionContext.orgId,
                    accessLevel: sessionContext.accessLevel,
                    folders: tenantFolders,
                    contacts: selectCatalogContacts(tenantContacts, recentUserText(history, question)),
                });

                if (capabilityResult.handled) {
                    let action: AssistantMessageAction | undefined;
                    const rawAction = reconcileContactDraftAction({
                        action: capabilityResult.action,
                        snapshot: capabilityResult.draftSnapshot,
                        history,
                        folders: tenantFolders,
                        contacts: tenantContacts,
                        userMessage: question,
                    });
                    if (rawAction) {
                        action = resolveAssistantCapabilityActionWithRepair(rawAction, tenantFolders);
                        if (!action) {
                            console.warn('/api/ogeemo-assistant capability action dropped by strict validation', {
                                rawAction,
                                tenantFolderIds: tenantFolders.map((folder) => folder.id),
                            });
                        }
                    }
                    const answer = capabilityResult.reply.trim() || 'I can help you with that contact.';

                    return NextResponse.json({ answer, ...(action ? { action } : {}) }, { status: 200 });
                }

                // Declined: not a Contacts Hub form conversation, or the user wants a contact added. The main assistant answers,
                // and it adds a contact itself with its createContact tool.
            }
        } catch (capabilityError) {
            console.warn('/api/ogeemo-assistant contact-capability-error', capabilityError);

            // Deterministic fallback: keep the core "fill the contact form from my
            // sentence" UX alive even when the AI capability flow is unavailable.
            const deterministic = buildDeterministicDraftResponse(question, tenantFolders);
            if (deterministic) {
                console.info('/api/ogeemo-assistant source', {
                    source: 'deterministic_contact_fallback',
                    reason: 'contact_capability_error',
                    decisionPath: 'contact_capability_error->deterministic_contact_fallback',
                });
                return NextResponse.json({ ...deterministic, degraded: true }, { status: 200 });
            }
        }

        // The Genkit assistant answers. A separate guide-based Cloud Function used to be asked first and Genkit only
        // ran when it missed; that function is retired, so the operational assistant is tried first and the
        // general-knowledge one second.
        let operationalOutcome: 'accepted' | 'empty_reply' | 'refusal_pattern' | 'error' = 'error';
        try {
            const genkitResult = await ogeemoAgent({
                message: question,
                history,
                runtimeContext,
            });

            const genkitAnswer = normalizeAnswerText(genkitResult?.reply);
            if (genkitAnswer && !hasLegacyRefusalPattern(genkitAnswer)) {
                console.info('/api/ogeemo-assistant source', { source: 'genkit_operational_accepted' });
                // A contact or project saved while answering opens its own form, so the person can check it and add details.
                const opened = openActionFor(genkitResult?.saved);
                const note = openedFormNote(genkitResult?.saved);
                return NextResponse.json({
                    answer: note ? `${genkitAnswer}\n\n${note}` : genkitAnswer,
                    ...(opened ? { action: opened } : {}),
                    // Which screens' data changed, so an open screen reloads instead of showing the old data.
                    ...(genkitResult?.changed?.length ? { changed: genkitResult.changed } : {}),
                }, { status: 200 });
            }

            operationalOutcome = genkitAnswer ? 'refusal_pattern' : 'empty_reply';
            console.info('/api/ogeemo-assistant genkit-operational-miss', { genkitOperationalOutcome: operationalOutcome });
        } catch (fallbackError) {
            operationalOutcome = 'error';
            console.warn('/api/ogeemo-assistant genkit operational assistant failed', fallbackError);
        }

        let generalOutcome: 'accepted' | 'empty_reply' | 'refusal_pattern' | 'error' = 'error';
        try {
            const generalResult = await ogeemoGeneralKnowledgeFallbackAgent({
                message: question,
                history,
                runtimeContext,
            });

            const generalAnswer = normalizeAnswerText(generalResult?.reply);
            if (generalAnswer && !hasLegacyRefusalPattern(generalAnswer)) {
                console.info('/api/ogeemo-assistant source', {
                    source: 'genkit_general_knowledge_accepted',
                    genkitOperationalOutcome: operationalOutcome,
                });
                // The fallback has no tools. When the main assistant did not answer, say so in the server's own words, so a
                // reply like "Requested to save the changes" can never leave someone believing something was saved.
                return NextResponse.json({ answer: fallbackAnswer(generalAnswer, operationalOutcome) }, { status: 200 });
            }

            generalOutcome = generalAnswer ? 'refusal_pattern' : 'empty_reply';
            console.info('/api/ogeemo-assistant genkit-general-knowledge-miss', { genkitGeneralKnowledgeOutcome: generalOutcome });
        } catch (fallbackError) {
            generalOutcome = 'error';
            console.warn('/api/ogeemo-assistant genkit general knowledge assistant failed', fallbackError);
        }

        return NextResponse.json(
            {
                error: 'Ogeemo Assistant could not provide an answer.',
                details: {
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
