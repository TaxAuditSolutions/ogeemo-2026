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
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 1);
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
        { intent: "correct-payroll-error", required: ["correct", "payroll", "error"] },
        { intent: "create-worker-profile", required: ["create", "worker", "profile"] },
        { intent: "convert-lead", required: ["convert", "lead"] },
        { intent: "merge-duplicates", required: ["merge", "duplicate"] },
    ];
    for (const rule of rules) {
        if (rule.required.every((term) => normalized.includes(term))) {
            return rule.intent;
        }
    }
    return undefined;
}
exports.ogeemoAssistant = (0, https_1.onRequest)({ cors: true, region: "us-central1", secrets: ["GOOGLE_API_KEY"] }, async (req, res) => {
    var _a, _b;
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
        if (intentHint) {
            const intentSnapshot = await db
                .collection("help_guides")
                .where("intent", "==", intentHint)
                .limit(8)
                .get();
            if (!intentSnapshot.empty) {
                const seen = new Set(snapshot.docs.map((doc) => doc.id));
                const mergedDocs = [...snapshot.docs];
                for (const doc of intentSnapshot.docs) {
                    if (!seen.has(doc.id)) {
                        mergedDocs.push(doc);
                        seen.add(doc.id);
                    }
                }
                snapshot = Object.assign(Object.assign({}, snapshot), { docs: mergedDocs });
            }
        }
        // 3) Build context from retrieved docs
        const contextChunks = [];
        const rankedDocs = [...snapshot.docs]
            .map((doc) => {
            const data = doc.data();
            return {
                doc,
                data,
                lexicalScore: scoreDocumentAgainstQuestion(question, data),
            };
        })
            .sort((a, b) => {
            if (b.lexicalScore !== a.lexicalScore) {
                return b.lexicalScore - a.lexicalScore;
            }
            return compareByChunkPriority(a.data, b.data);
        })
            .slice(0, 8);
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
        const context = contextChunks.length > 0
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
    }
    catch (error) {
        logger.error("ogeemoAssistant error", error);
        res.status(500).json({
            error: "Internal server error while processing the request.",
        });
    }
});
//# sourceMappingURL=index.js.map