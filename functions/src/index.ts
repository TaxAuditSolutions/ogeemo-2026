// Redundant source file removed.
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Firebase Admin once.
if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();
const VECTOR_DIMENSIONS = 768;

const MODULE_HINTS: Record<string, string[]> = {
    reports: ["report", "reports", "export", "analytics"],
    payroll: ["payroll", "pay", "salary", "wage", "timesheet"],
    accounting: ["journal", "ledger", "invoice", "expense", "accounting", "reconciliation"],
    contacts: ["contact", "client", "customer", "lead", "crm"],
    files: ["file", "document", "upload", "folder", "evidence"],
    settings: ["settings", "permission", "role", "admin", "configuration"],
    tasks: ["task", "tasks", "action", "chip", "action chip", "quick action"],
};

const AUDIENCE_HINTS: Record<string, string[]> = {
    admin: ["admin", "administrator", "owner"],
    accountant: ["accountant", "bookkeeper", "finance"],
    consultant: ["consultant", "advisor"],
    lawyer: ["lawyer", "legal", "paralegal"],
    "virtual-assistant": ["assistant", "virtual assistant", "va"],
};

const CHUNK_TYPE_ORDER: Record<string, number> = {
    prerequisites: 1,
    overview: 2,
    steps: 3,
    validations: 4,
    troubleshooting: 5,
    faq: 6,
};

function isMissingVectorIndexError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    const message = "message" in error && typeof (error as { message?: string }).message === "string"
        ? (error as { message: string }).message
        : "";

    const details = "details" in error && typeof (error as { details?: string }).details === "string"
        ? (error as { details: string }).details
        : "";

    const combined = `${message}\n${details}`.toLowerCase();
    return combined.includes("missing vector index configuration");
}

function toFixedVector(values: unknown): number[] {
    if (!Array.isArray(values)) {
        return [];
    }

    return values
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
        .slice(0, VECTOR_DIMENSIONS);
}

function inferHint(text: string, hints: Record<string, string[]>) {
    const normalized = text.toLowerCase();
    for (const [label, keywords] of Object.entries(hints)) {
        if (keywords.some((keyword) => normalized.includes(keyword))) {
            return label;
        }
    }
    return undefined;
}

function compareByChunkPriority(
    a: { chunkType?: string; chunkIndex?: number },
    b: { chunkType?: string; chunkIndex?: number }
) {
    const priorityA = CHUNK_TYPE_ORDER[a.chunkType ?? ""] ?? 999;
    const priorityB = CHUNK_TYPE_ORDER[b.chunkType ?? ""] ?? 999;
    if (priorityA !== priorityB) {
        return priorityA - priorityB;
    }

    const indexA = typeof a.chunkIndex === "number" ? a.chunkIndex : 999;
    const indexB = typeof b.chunkIndex === "number" ? b.chunkIndex : 999;
    return indexA - indexB;
}

function compareSemverDescending(a?: string, b?: string): number {
    const parse = (value?: string) =>
        (value ?? "0.0.0")
            .split(".")
            .map((part) => Number.parseInt(part, 10))
            .map((part) => (Number.isFinite(part) ? part : 0));

    const left = parse(a);
    const right = parse(b);
    const maxLength = Math.max(left.length, right.length);

    for (let index = 0; index < maxLength; index += 1) {
        const leftPart = left[index] ?? 0;
        const rightPart = right[index] ?? 0;
        if (leftPart !== rightPart) {
            return rightPart - leftPart;
        }
    }

    return 0;
}

function dedupeToLatestGuideChunks<
    TItem extends {
        doc: any;
        data: {
            guideId?: string;
            chunkType?: string;
            chunkIndex?: number;
            version?: string;
        };
    }
>(docs: TItem[]): TItem[] {
    const latestByChunk = new Map<string, TItem>();

    for (const item of docs) {
        const key = [
            item.data.guideId ?? item.doc.id,
            item.data.chunkType ?? "legacy",
            typeof item.data.chunkIndex === "number" ? item.data.chunkIndex : "na",
        ].join("::");

        const existing = latestByChunk.get(key);
        if (!existing) {
            latestByChunk.set(key, item);
            continue;
        }

        if (compareSemverDescending(item.data.version, existing.data.version) < 0) {
            latestByChunk.set(key, item);
        }
    }

    return [...latestByChunk.values()];
}

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 1);
}

function getQueryPhrases(question: string): string[] {
    const normalized = question.toLowerCase();
    const phrases: string[] = [];

    if (normalized.includes("action chip") || normalized.includes("action-chip")) {
        phrases.push("action chip");
    }
    if (normalized.includes("permission error") || normalized.includes("access denied")) {
        phrases.push("permission error");
    }
    if (normalized.includes("permission") && normalized.includes("denied")) {
        phrases.push("permission denied");
    }

    return phrases;
}

function scorePhraseMatch(phrases: string[], data: { title?: string; intent?: string; keywords?: string[]; chunkText?: string }): number {
    if (phrases.length === 0) {
        return 0;
    }

    const haystack = [
        data.title ?? "",
        data.intent ?? "",
        (data.keywords ?? []).join(" "),
        data.chunkText ?? "",
    ]
        .join(" ")
        .toLowerCase();

    let score = 0;
    for (const phrase of phrases) {
        if (haystack.includes(phrase)) {
            score += 8;
        }
    }

    return score;
}

function scoreDocumentAgainstQuestion(
    question: string,
    data: {
        title?: string;
        intent?: string;
        module?: string;
        keywords?: string[];
        chunkText?: string;
        description?: string;
    }
): number {
    const queryTokens = new Set(tokenize(question));
    if (queryTokens.size === 0) {
        return 0;
    }

    const keywordTokens = new Set(tokenize((data.keywords ?? []).join(" ")));
    const intentTokens = new Set(tokenize(data.intent ?? ""));
    const titleTokens = new Set(tokenize(data.title ?? ""));
    const moduleTokens = new Set(tokenize(data.module ?? ""));
    const chunkTokens = new Set(tokenize(data.chunkText ?? ""));
    const descriptionTokens = new Set(tokenize(data.description ?? ""));

    let score = 0;
    for (const token of queryTokens) {
        if (intentTokens.has(token)) score += 5;
        if (titleTokens.has(token)) score += 4;
        if (keywordTokens.has(token)) score += 4;
        if (moduleTokens.has(token)) score += 2;
        if (chunkTokens.has(token)) score += 2;
        if (descriptionTokens.has(token)) score += 1;
    }

    return score;
}

function inferIntentFromQuestion(question: string): string | undefined {
    const normalized = question.toLowerCase();

    const rules: Array<{ intent: string; required: string[] }> = [
        { intent: "link-document-to-contact", required: ["link", "document", "contact"] },
        { intent: "recover-missing-document", required: ["recover", "missing", "document"] },
        { intent: "validate-export", required: ["validate", "export"] },
        { intent: "reconcile-transactions", required: ["reconcile", "transactions"] },
        { intent: "reconcile-transactions", required: ["reconcile", "transaction"] },
        { intent: "correct-payroll-error", required: ["correct", "payroll", "error"] },
        { intent: "create-worker-profile", required: ["create", "worker", "profile"] },
        { intent: "convert-lead", required: ["convert", "lead"] },
        { intent: "merge-duplicates", required: ["merge", "duplicate"] },
        { intent: "fix-action-chip-permission-error", required: ["fix", "action", "chip", "permission", "error"] },
        { intent: "fix-action-chip-permission-error", required: ["action", "chip", "permission", "denied"] },
    ];

    for (const rule of rules) {
        if (rule.required.every((term) => normalized.includes(term))) {
            return rule.intent;
        }
    }

    return undefined;
}

export const ogeemoAssistant = onRequest(
    { cors: true, region: "us-central1", secrets: ["GOOGLE_API_KEY"] },
    async (req, res) => {
        try {
            if (req.method !== "POST") {
                res.status(405).json({ error: "Method not allowed. Use POST." });
                return;
            }

            const apiKey = process.env.GOOGLE_API_KEY;
            if (!apiKey) {
                logger.error("GOOGLE_API_KEY is missing in environment.");
                res.status(500).json({ error: "Server misconfiguration." });
                return;
            }

            const question = (req.body?.question ?? "").toString().trim();
            if (!question) {
                res.status(400).json({ error: "Missing question in request body." });
                return;
            }

            const genAI = new GoogleGenerativeAI(apiKey);

            // 1) Embed user question
            const embeddingModel = genAI.getGenerativeModel({
                model: "gemini-embedding-001",
            });

            const embeddingResult = await embeddingModel.embedContent(question);
            const queryEmbeddingArray = toFixedVector(embeddingResult.embedding.values);

            if (queryEmbeddingArray.length === 0) {
                logger.error("Embedding model returned empty vector.");
                res.status(500).json({ error: "Failed to generate embedding." });
                return;
            }

            // 2) Firestore vector search with optional metadata hints and fallback
            const moduleHint = inferHint(question, MODULE_HINTS);
            const audienceHint = inferHint(question, AUDIENCE_HINTS);

            const runSearch = async (useHints: boolean) => {
                let queryRef: any = db.collection("help_guides");

                if (useHints && moduleHint) {
                    queryRef = queryRef.where("module", "==", moduleHint);
                }
                if (useHints && audienceHint) {
                    queryRef = queryRef.where("targetAudience", "==", audienceHint);
                }

                const vectorQuery = queryRef.findNearest(
                    "embedding",
                    FieldValue.vector(queryEmbeddingArray),
                    { limit: 8, distanceMeasure: "COSINE" }
                );

                return vectorQuery.get();
            };

            let snapshot;
            try {
                snapshot = await runSearch(true);
            } catch (error) {
                if (isMissingVectorIndexError(error)) {
                    logger.warn("Hinted vector search index missing; falling back to unfiltered vector search.");
                    snapshot = await runSearch(false);
                } else {
                    throw error;
                }
            }

            if (snapshot.empty) {
                snapshot = await runSearch(false);
            }

            const intentHint = inferIntentFromQuestion(question);
            if (intentHint) {
                const intentSnapshot = await db
                    .collection("help_guides")
                    .where("intent", "==", intentHint)
                    .limit(8)
                    .get();

                if (!intentSnapshot.empty) {
                    const seen = new Set(snapshot.docs.map((doc: any) => doc.id));
                    // Prioritize exact-intent docs first, then fill from vector-nearest docs.
                    const mergedDocs = [...intentSnapshot.docs];
                    for (const doc of intentSnapshot.docs) {
                        seen.add(doc.id);
                    }
                    for (const doc of snapshot.docs) {
                        if (!seen.has(doc.id)) {
                            mergedDocs.push(doc);
                            seen.add(doc.id);
                        }
                    }

                    snapshot = {
                        ...snapshot,
                        docs: mergedDocs,
                    } as typeof snapshot;
                }
            }

            // 3) Build context from retrieved docs
            const queryPhrases = getQueryPhrases(question);

            const scoredDocs = [...snapshot.docs]
                .map((doc) => {
                    const data = doc.data() as {
                        guideId?: string;
                        title?: string;
                        intent?: string;
                        module?: string;
                        keywords?: string[];
                        chunkText?: string;
                        description?: string;
                        chunkType?: string;
                        chunkIndex?: number;
                        version?: string;
                    };

                    return {
                        doc,
                        data,
                        isExactIntentMatch:
                            typeof data.intent === "string" &&
                            typeof intentHint === "string" &&
                            data.intent === intentHint,
                        lexicalScore: scoreDocumentAgainstQuestion(question, data),
                        phraseScore: scorePhraseMatch(queryPhrases, data),
                    };
                })
                .filter((item) => Boolean(item.data.intent || item.data.chunkText || item.data.title));

            const latestDocs = dedupeToLatestGuideChunks(scoredDocs);

            const rankedDocs = latestDocs
                .sort((a, b) => {
                    if (a.isExactIntentMatch !== b.isExactIntentMatch) {
                        return a.isExactIntentMatch ? -1 : 1;
                    }
                    if (b.phraseScore !== a.phraseScore) {
                        return b.phraseScore - a.phraseScore;
                    }
                    if (b.lexicalScore !== a.lexicalScore) {
                        return b.lexicalScore - a.lexicalScore;
                    }
                    return compareByChunkPriority(a.data, b.data);
                })
                .slice(0, 8);

            // If exact intent chunks exist, return a deterministic procedural answer.
            const exactIntentDocs = rankedDocs
                .filter((item) => item.isExactIntentMatch)
                .sort((a, b) => compareByChunkPriority(a.data, b.data));

            if (exactIntentDocs.length > 0) {
                const firstData = exactIntentDocs[0].data;
                const sectionByType = new Map<string, string>();

                for (const item of exactIntentDocs) {
                    const type = item.data.chunkType ?? "legacy";
                    const text = (item.data.chunkText ?? "").trim();
                    if (!text) {
                        continue;
                    }
                    if (!sectionByType.has(type)) {
                        sectionByType.set(type, text);
                    }
                }

                const overview = sectionByType.get("overview") ?? "";
                const prerequisites = sectionByType.get("prerequisites") ?? "";
                const steps = sectionByType.get("steps") ?? "";
                const troubleshooting = sectionByType.get("troubleshooting") ?? "";
                const validations = sectionByType.get("validations") ?? "";
                const answerTitle = (firstData.title && firstData.title.trim().length > 0)
                    ? firstData.title.trim()
                    : ((firstData.intent ?? "workflow")
                        .split("-")
                        .filter((part) => part.length > 0)
                        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(" "));

                const deterministicAnswer = [
                    `${answerTitle} (${firstData.module ?? "general"}):`,
                    "",
                    prerequisites ? "Prerequisites:\n" + prerequisites : "",
                    steps ? "Steps:\n" + steps : "",
                    troubleshooting ? "Troubleshooting:\n" + troubleshooting : "",
                    validations ? "Validation:\n" + validations : "",
                    overview ? "Reference:\n" + overview : "",
                ]
                    .filter(Boolean)
                    .join("\n\n")
                    .trim();

                if (deterministicAnswer.length > 0) {
                    res.status(200).json({ answer: deterministicAnswer });
                    return;
                }
            }

            const contextChunks: string[] = [];

            const orderedDocs = rankedDocs.map((item) => item.doc);

            orderedDocs.forEach((doc, i) => {
                const data = doc.data() as {
                    chunkType?: string;
                    chunkIndex?: number;
                    chunkText?: string;
                    module?: string;
                    intent?: string;
                    title?: string;
                    steps?: string[];
                    targetAudience?: string;
                    description?: string;
                };

                const title = data.title ?? "Untitled Guide";
                const module = data.module ?? "general";
                const intent = data.intent ?? "general-workflow";
                const targetAudience = data.targetAudience ?? "General";
                const description = data.description ?? "";
                const chunkType = data.chunkType ?? "legacy";
                const steps = Array.isArray(data.steps) ? data.steps : [];
                const chunkText = typeof data.chunkText === "string" ? data.chunkText : "";

                const stepText =
                    steps.length > 0
                        ? steps.map((s, idx) => `${idx + 1}. ${s}`).join("\n")
                        : "No explicit steps.";

                const contentBody = chunkText || stepText;

                contextChunks.push(
                    [
                        `Guide ${i + 1}: ${title}`,
                        `Module: ${module}`,
                        `Intent: ${intent}`,
                        `Target Audience: ${targetAudience}`,
                        `Chunk Type: ${chunkType}`,
                        description ? `Description: ${description}` : "",
                        "Content:",
                        contentBody,
                    ]
                        .filter(Boolean)
                        .join("\n")
                );
            });

            const context =
                contextChunks.length > 0
                    ? contextChunks.join("\n\n---\n\n")
                    : "No relevant guide context found.";

            // 4) Ask Gemini to answer using only retrieved context
            const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = [
                "You are Ogeemo Assistant.",
                "Answer the user's question using ONLY the provided guide context.",
                "If the context does not contain enough information, say that clearly and suggest what is missing.",
                "",
                "Guide context:",
                context,
                "",
                `User question: ${question}`,
            ].join("\n");

            const answerResult = await textModel.generateContent(prompt);
            const answer = answerResult.response.text().trim();

            res.status(200).json({ answer });
        } catch (error) {
            logger.error("ogeemoAssistant error", error);
            res.status(500).json({
                error: "Internal server error while processing the request.",
            });
        }
    }
);