import dotenv from "dotenv";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

async function main() {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "keys/ogeemo-firebase-firebase-adminsdk-fbsvc-ef0acfe30c.json";

    if (getApps().length === 0) {
        initializeApp({ credential: applicationDefault() });
    }

    const db = getFirestore();
    const guidesRef = db.collection("help_guides");

    console.log("Querying for intent matching fix-action-chip-permission-error...");
    const snapshotByIntent = await guidesRef
        .where("intent", "==", "fix-action-chip-permission-error")
        .get();

    console.log("Querying for guideId matching tasks--fix-action-chip-permission-error...");
    const snapshotByGuideId = await guidesRef
        .where("guideId", "==", "tasks--fix-action-chip-permission-error")
        .get();

    const seenIds = new Set<string>();
    const allDocs: Array<Record<string, unknown>> = [];

    const addDocs = (snapshot: FirebaseFirestore.QuerySnapshot) => {
        for (const doc of snapshot.docs) {
            if (seenIds.has(doc.id)) {
                continue;
            }
            seenIds.add(doc.id);
            allDocs.push({ id: doc.id, ...doc.data() });
        }
    };

    addDocs(snapshotByIntent);
    addDocs(snapshotByGuideId);

    console.log(`intent query count: ${snapshotByIntent.size}`);
    console.log(`guideId query count: ${snapshotByGuideId.size}`);
    console.log(`deduped doc count: ${allDocs.length}`);

    const requiredTerms = ["action", "chip", "permission", "error"];

    for (const doc of allDocs) {
        const chunkText = typeof doc.chunkText === "string" ? doc.chunkText : "";
        const keywords = Array.isArray(doc.keywords)
            ? doc.keywords.filter((value): value is string => typeof value === "string")
            : [];

        console.log("---");
        console.log(`Doc ID: ${String(doc.id)}`);
        console.log(`guideId: ${String(doc.guideId ?? "N/A")}`);
        console.log(`module: ${String(doc.module ?? "N/A")}`);
        console.log(`intent: ${String(doc.intent ?? "N/A")}`);
        console.log(`targetAudience: ${String(doc.targetAudience ?? "N/A")}`);
        console.log(`chunkType: ${String(doc.chunkType ?? "N/A")}`);
        console.log(`chunkIndex: ${String(doc.chunkIndex ?? "N/A")}`);
        console.log(`chunkTextPreview: ${chunkText.slice(0, 240).replace(/\s+/g, " ")}`);

        const checkedKeywords = requiredTerms.map((term) => {
            const inKeywords = keywords.some((kw) => kw.toLowerCase().includes(term));
            const inChunk = chunkText.toLowerCase().includes(term);
            return `${term}: ${inKeywords || inChunk ? "YES" : "NO"}`;
        });

        console.log(`Keywords/Text checks: ${checkedKeywords.join(", ")}`);
        console.log(`Actual keywords in doc: ${JSON.stringify(keywords)}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
