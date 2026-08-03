import dotenv from "dotenv";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

async function main() {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS");
    }

    if (getApps().length === 0) {
        initializeApp({ credential: applicationDefault() });
    }

    const db = getFirestore();
    const snapshot = await db
        .collection("help_guides")
        .where("guideId", "==", "files--link-document-to-contact")
        .get();

    console.log(`Found ${snapshot.size} docs for files--link-document-to-contact`);
    for (const doc of snapshot.docs) {
        const data = doc.data() as any;
        console.log(
            JSON.stringify(
                {
                    id: doc.id,
                    guideId: data.guideId,
                    title: data.title,
                    module: data.module,
                    intent: data.intent,
                    chunkType: data.chunkType,
                    chunkIndex: data.chunkIndex,
                    keywords: data.keywords,
                    chunkTextPreview: typeof data.chunkText === "string" ? data.chunkText.slice(0, 140) : "",
                },
                null,
                2
            )
        );
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
