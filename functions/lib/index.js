"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ogeemoAssistant = void 0;
// Redundant source file removed.
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const generative_ai_1 = require("@google/generative-ai");
// Initialize Firebase Admin once.
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)();
const VECTOR_DIMENSIONS = 768;
const MODULE_HINTS = {
    reports: ["report", "reports", "export", "analytics"],
    payroll: ["payroll", "pay", "salary", "wage", "timesheet"],
    accounting: ["journal", "ledger", "invoice", "expense", "accounting", "reconciliation"],
    contacts: ["contact", "client", "customer", "lead", "crm"],
    files: ["file", "document", "upload", "folder", "evidence"],
    settings: ["settings", "permission", "role", "admin", "configuration"],
    tasks: ["task", "tasks", "action", "chip", "action chip", "quick action"],
};
const AUDIENCE_HINTS = {
    admin: ["admin", "administrator", "owner"],
    accountant: ["accountant", "bookkeeper", "finance"],
    consultant: ["consultant", "advisor"],
    lawyer: ["lawyer", "legal", "paralegal"],
    "virtual-assistant": ["assistant", "virtual assistant", "va"],
};
const CHUNK_TYPE_ORDER = {
    prerequisites: 1,
    overview: 2,
    steps: 3,
    validations: 4,
    troubleshooting: 5,
    faq: 6,
};
function isMissingVectorIndexError(error) {
    if (typeof error !== "object" || error === null) {
        return false;
    }
    const message = "message" in error && typeof error.message === "string"
        ? error.message
        : "";
    const details = "details" in error && typeof error.details === "string"
        ? error.details
        : "";
    const combined = `${message}\n${details}`.toLowerCase();
    return combined.includes("missing vector index configuration");
}
function toFixedVector(values) {
    if (!Array.isArray(values)) {
        return [];
    }
    return values
        .filter((v) => typeof v === "number" && Number.isFinite(v))
        .slice(0, VECTOR_DIMENSIONS);
}
function inferHint(text, hints) {
    const normalized = text.toLowerCase();
    for (const [label, keywords] of Object.entries(hints)) {
        if (keywords.some((keyword) => normalized.includes(keyword))) {
            return label;
        }
    }
    return undefined;
}
function compareByChunkPriority(a, b) {
    var _a, _b, _c, _d;
    const priorityA = (_b = CHUNK_TYPE_ORDER[(_a = a.chunkType) !== null && _a !== void 0 ? _a : ""]) !== null && _b !== void 0 ? _b : 999;
    const priorityB = (_d = CHUNK_TYPE_ORDER[(_c = b.chunkType) !== null && _c !== void 0 ? _c : ""]) !== null && _d !== void 0 ? _d : 999;
    if (priorityA !== priorityB) {
        return priorityA - priorityB;
    }
    const indexA = typeof a.chunkIndex === "number" ? a.chunkIndex : 999;
    const indexB = typeof b.chunkIndex === "number" ? b.chunkIndex : 999;
    return indexA - indexB;
}
function compareSemverDescending(a, b) {
    var _a, _b;
    const parse = (value) => (value !== null && value !== void 0 ? value : "0.0.0")
        .split(".")
        .map((part) => Number.parseInt(part, 10))
        .map((part) => (Number.isFinite(part) ? part : 0));
    const left = parse(a);
    const right = parse(b);
    const maxLength = Math.max(left.length, right.length);
    for (let index = 0; index < maxLength; index += 1) {
        const leftPart = (_a = left[index]) !== null && _a !== void 0 ? _a : 0;
        const rightPart = (_b = right[index]) !== null && _b !== void 0 ? _b : 0;
        if (leftPart !== rightPart) {
            return rightPart - leftPart;
        }
    }
    return 0;
}
function dedupeToLatestGuideChunks(docs) {
    var _a, _b;
    const latestByChunk = new Map();
    for (const item of docs) {
        const key = [
            (_a = item.data.guideId) !== null && _a !== void 0 ? _a : item.doc.id,
            (_b = item.data.chunkType) !== null && _b !== void 0 ? _b : "legacy",
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
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 1);
}
function getQueryPhrases(question) {
    const normalized = question.toLowerCase();
    const phrases = [];
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
function scorePhraseMatch(phrases, data) {
    var _a, _b, _c, _d;
    if (phrases.length === 0) {
        return 0;
    }
    const haystack = [
        (_a = data.title) !== null && _a !== void 0 ? _a : "",
        (_b = data.intent) !== null && _b !== void 0 ? _b : "",
        ((_c = data.keywords) !== null && _c !== void 0 ? _c : []).join(" "),
        (_d = data.chunkText) !== null && _d !== void 0 ? _d : "",
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
function scoreDocumentAgainstQuestion(question, data) {
    var _a, _b, _c, _d, _e, _f;
    const queryTokens = new Set(tokenize(question));
    if (queryTokens.size === 0) {
        return 0;
    }
    const keywordTokens = new Set(tokenize(((_a = data.keywords) !== null && _a !== void 0 ? _a : []).join(" ")));
    const intentTokens = new Set(tokenize((_b = data.intent) !== null && _b !== void 0 ? _b : ""));
    const titleTokens = new Set(tokenize((_c = data.title) !== null && _c !== void 0 ? _c : ""));
    const moduleTokens = new Set(tokenize((_d = data.module) !== null && _d !== void 0 ? _d : ""));
    const chunkTokens = new Set(tokenize((_e = data.chunkText) !== null && _e !== void 0 ? _e : ""));
    const descriptionTokens = new Set(tokenize((_f = data.description) !== null && _f !== void 0 ? _f : ""));
    let score = 0;
    for (const token of queryTokens) {
        if (intentTokens.has(token))
            score += 5;
        if (titleTokens.has(token))
            score += 4;
        if (keywordTokens.has(token))
            score += 4;
        if (moduleTokens.has(token))
            score += 2;
        if (chunkTokens.has(token))
            score += 2;
        if (descriptionTokens.has(token))
            score += 1;
    }
    return score;
}
function inferIntentFromQuestion(question) {
    const normalized = question.toLowerCase();
    const rules = [
        { intent: "link-document-to-contact", required: ["link", "document", "contact"] },
        { intent: "recover-missing-document", required: ["recover", "missing", "document"] },
        { intent: "validate-export", required: ["validate", "export"] },
        { intent: "reconcile-transactions", required: ["reconcile", "transactions"] },
        { intent: "reconcile-transactions", required: ["reconcile", "transaction"] },
        { intent: "correct-payroll-error", required: ["correct", "payroll", "error"] },
        { intent: "update-worker-tax-profile", required: ["update", "worker", "tax", "profile"] },
        { intent: "update-worker-tax-profile", required: ["update", "employee", "tax", "profile"] },
        { intent: "export-payroll-register", required: ["export", "payroll", "register"] },
        { intent: "link-task-to-contact", required: ["link", "task", "contact"] },
        { intent: "link-task-to-document", required: ["link", "task", "document"] },
        { intent: "link-event-to-contact", required: ["link", "event", "contact"] },
        { intent: "link-event-to-task", required: ["link", "event", "task"] },
        { intent: "configure-timezone-settings", required: ["configure", "timezone", "settings"] },
        { intent: "export-calendar-events", required: ["export", "calendar", "events"] },
        { intent: "start-lead-from-email-action-chip", required: ["lead", "email", "action", "chip"] },
        { intent: "prepare-for-cra-audit", required: ["cra", "audit"] },
        { intent: "pay-contractor-via-unified-identity", required: ["pay", "contractor", "unified", "identity"] },
        { intent: "configure-hytexercise-break-routine", required: ["hytexercise", "routine"] },
        { intent: "capture-idea-during-active-workflow", required: ["capture", "idea", "workflow"] },
        { intent: "improve-imagen-campaign-output", required: ["imagen", "campaign", "image"] },
        { intent: "run-ethical-exit-data-export", required: ["ethical", "exit", "export"] },
        { intent: "create-worker-profile", required: ["create", "worker", "profile"] },
        { intent: "map-sso-roles", required: ["map", "sso", "roles"] },
        { intent: "update-profile-security-settings", required: ["update", "profile", "security", "settings"] },
        { intent: "export-contact-list", required: ["export", "contact", "list"] },
        { intent: "schedule-follow-up-task", required: ["schedule", "follow", "up", "task"] },
        { intent: "resolve-upload-size-error", required: ["resolve", "upload", "size", "error"] },
        { intent: "record-customer-payment", required: ["record", "customer", "payment"] },
        { intent: "record-vendor-payment", required: ["record", "vendor", "payment"] },
        { intent: "match-bank-feed-transactions", required: ["match", "bank", "feed", "transactions"] },
        { intent: "match-bank-feed-transactions", required: ["match", "bank", "feed", "transaction"] },
        { intent: "schedule-bill-payment", required: ["schedule", "bill", "payment"] },
        { intent: "handle-duplicate-transaction", required: ["handle", "duplicate", "transaction"] },
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
exports.ogeemoAssistant = (0, https_1.onRequest)({ cors: true, region: "us-central1", secrets: ["GOOGLE_API_KEY"] }, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
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
        const question = ((_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.question) !== null && _b !== void 0 ? _b : "").toString().trim();
        if (!question) {
            res.status(400).json({ error: "Missing question in request body." });
            return;
        }
        const requestedMode = ((_d = (_c = req.body) === null || _c === void 0 ? void 0 : _c.mode) !== null && _d !== void 0 ? _d : "").toString().toLowerCase();
        const responseMode = requestedMode === "verification"
            ? "verification"
            : "chat";
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
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
        const runSearch = async (useHints) => {
            let queryRef = db.collection("help_guides");
            if (useHints && moduleHint) {
                queryRef = queryRef.where("module", "==", moduleHint);
            }
            if (useHints && audienceHint) {
                queryRef = queryRef.where("targetAudience", "==", audienceHint);
            }
            const vectorQuery = queryRef.findNearest("embedding", firestore_1.FieldValue.vector(queryEmbeddingArray), { limit: 8, distanceMeasure: "COSINE" });
            return vectorQuery.get();
        };
        let snapshot;
        try {
            snapshot = await runSearch(true);
        }
        catch (error) {
            if (isMissingVectorIndexError(error)) {
                logger.warn("Hinted vector search index missing; falling back to unfiltered vector search.");
                snapshot = await runSearch(false);
            }
            else {
                throw error;
            }
        }
        if (snapshot.empty) {
            snapshot = await runSearch(false);
        }
        const intentHint = inferIntentFromQuestion(question);
        let intentSnapshot = null;
        if (intentHint) {
            intentSnapshot = await db
                .collection("help_guides")
                .where("intent", "==", intentHint)
                .limit(24)
                .get();
            if (!intentSnapshot.empty) {
                const seen = new Set(snapshot.docs.map((doc) => doc.id));
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
                snapshot = Object.assign(Object.assign({}, snapshot), { docs: mergedDocs });
            }
        }
        // Intent-first fallback: when an inferred intent has direct docs, use those docs only.
        if (intentSnapshot && !intentSnapshot.empty) {
            snapshot = Object.assign(Object.assign({}, snapshot), { docs: [...intentSnapshot.docs] });
        }
        // 3) Build context from retrieved docs
        const queryPhrases = getQueryPhrases(question);
        const scoredDocs = [...snapshot.docs]
            .map((doc) => {
            const data = doc.data();
            return {
                doc,
                data,
                isExactIntentMatch: typeof data.intent === "string" &&
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
        let exactIntentStructuredAnswer = "";
        if (exactIntentDocs.length > 0) {
            const firstData = exactIntentDocs[0].data;
            const sectionByType = new Map();
            for (const item of exactIntentDocs) {
                const type = (_e = item.data.chunkType) !== null && _e !== void 0 ? _e : "legacy";
                const text = ((_f = item.data.chunkText) !== null && _f !== void 0 ? _f : "").trim();
                if (!text) {
                    continue;
                }
                if (!sectionByType.has(type)) {
                    sectionByType.set(type, text);
                }
            }
            const overview = (_g = sectionByType.get("overview")) !== null && _g !== void 0 ? _g : "";
            const prerequisites = (_h = sectionByType.get("prerequisites")) !== null && _h !== void 0 ? _h : "";
            const steps = (_j = sectionByType.get("steps")) !== null && _j !== void 0 ? _j : "";
            const troubleshooting = (_k = sectionByType.get("troubleshooting")) !== null && _k !== void 0 ? _k : "";
            const validations = (_l = sectionByType.get("validations")) !== null && _l !== void 0 ? _l : "";
            const answerTitle = (firstData.title && firstData.title.trim().length > 0)
                ? firstData.title.trim()
                : (((_m = firstData.intent) !== null && _m !== void 0 ? _m : "workflow")
                    .split("-")
                    .filter((part) => part.length > 0)
                    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(" "));
            const deterministicAnswer = [
                `${answerTitle} (${(_o = firstData.module) !== null && _o !== void 0 ? _o : "general"}):`,
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
                if (responseMode === "verification") {
                    res.status(200).json({ answer: deterministicAnswer });
                    return;
                }
                // Reuse the exact-intent grounded answer as context input for natural chat phrasing.
                exactIntentStructuredAnswer = deterministicAnswer;
            }
        }
        const contextChunks = [];
        const orderedDocs = rankedDocs.map((item) => item.doc);
        orderedDocs.forEach((doc, i) => {
            var _a, _b, _c, _d, _e, _f;
            const data = doc.data();
            const title = (_a = data.title) !== null && _a !== void 0 ? _a : "Untitled Guide";
            const module = (_b = data.module) !== null && _b !== void 0 ? _b : "general";
            const intent = (_c = data.intent) !== null && _c !== void 0 ? _c : "general-workflow";
            const targetAudience = (_d = data.targetAudience) !== null && _d !== void 0 ? _d : "General";
            const description = (_e = data.description) !== null && _e !== void 0 ? _e : "";
            const chunkType = (_f = data.chunkType) !== null && _f !== void 0 ? _f : "legacy";
            const steps = Array.isArray(data.steps) ? data.steps : [];
            const chunkText = typeof data.chunkText === "string" ? data.chunkText : "";
            const stepText = steps.length > 0
                ? steps.map((s, idx) => `${idx + 1}. ${s}`).join("\n")
                : "No explicit steps.";
            const contentBody = chunkText || stepText;
            contextChunks.push([
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
                .join("\n"));
        });
        const context = exactIntentStructuredAnswer.length > 0
            ? exactIntentStructuredAnswer
            : (contextChunks.length > 0
                ? contextChunks.join("\n\n---\n\n")
                : "No relevant guide context found.");
        // 4) Ask Gemini to answer using only retrieved context
        const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = responseMode === "verification"
            ? [
                "You are Ogeemo Assistant.",
                "Answer the user's question using ONLY the provided guide context.",
                "Provide clear procedural guidance with numbered steps when possible.",
                "If the context does not contain enough information, say that clearly and suggest what is missing.",
                "",
                "Guide context:",
                context,
                "",
                `User question: ${question}`,
            ].join("\n")
            : [
                "You are Ogeemo Assistant.",
                "Answer the user's question using ONLY the provided guide context.",
                "Use a natural, conversational tone suitable for chat.",
                "Start with a short direct answer sentence, then provide practical next steps.",
                "Do not use rigid headings like 'Prerequisites', 'Validation', or 'Reference' unless the user explicitly asks for checklist format.",
                "Keep the response concise but actionable.",
                "If context is insufficient, say what is missing in plain language.",
                "",
                "Guide context:",
                context,
                "",
                `User question: ${question}`,
            ].join("\n");
        const answerResult = await textModel.generateContent(prompt);
        const answer = answerResult.response.text().trim();
        res.status(200).json({ answer });
    }
    catch (error) {
        logger.error("ogeemoAssistant error", error);
        res.status(500).json({
            error: "Internal server error while processing the request.",
        });
    }
});
//# sourceMappingURL=index.js.map