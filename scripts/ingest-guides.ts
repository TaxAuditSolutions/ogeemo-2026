import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

type GuideJson = {
  guideId?: string;
  title?: string;
  description?: string;
  module?: string;
  intent?: string;
  steps?: string[];
  prerequisites?: string[];
  validations?: string[];
  commonErrors?: string[];
  recovery?: string[];
  keywords?: string[];
  version?: string;
  lastVerifiedAt?: string;
  faq?: Array<{ question?: string; answer?: string }>;
  targetAudience?: string;
  source?: {
    targetUrl?: string;
    finalUrl?: string;
  };
  guide?: GuideJson;
  [key: string]: unknown;
};

const VECTOR_DIMENSIONS = 768;
const MIN_STEPS = 3;

type GuideChunk = {
  id: string;
  guideId: string;
  chunkType: "overview" | "prerequisites" | "steps" | "validations" | "troubleshooting" | "faq";
  chunkIndex: number;
  text: string;
};

function toFixedVector(values: unknown): number[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .slice(0, VECTOR_DIMENSIONS);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeGuide(raw: GuideJson): GuideJson {
  const source = raw.guide && typeof raw.guide === "object" ? raw.guide : raw;

  const moduleValue = typeof source.module === "string" ? source.module.trim() : "general";
  const intentValue = typeof source.intent === "string" ? source.intent.trim() : "general-workflow";
  const guideId =
    typeof source.guideId === "string" && source.guideId.trim().length > 0
      ? source.guideId.trim()
      : `${slugify(moduleValue)}--${slugify(intentValue)}`;

  return {
    ...source,
    guideId,
    module: moduleValue,
    intent: intentValue,
    title: typeof source.title === "string" ? source.title.trim() : "",
    description: typeof source.description === "string" ? source.description.trim() : "",
    targetAudience:
      typeof source.targetAudience === "string" && source.targetAudience.trim().length > 0
        ? source.targetAudience.trim()
        : "general",
    steps: normalizeStringArray(source.steps),
    prerequisites: normalizeStringArray(source.prerequisites),
    validations: normalizeStringArray(source.validations),
    commonErrors: normalizeStringArray(source.commonErrors),
    recovery: normalizeStringArray(source.recovery),
    keywords: normalizeStringArray(source.keywords),
    faq: Array.isArray(source.faq)
      ? source.faq
        .map((entry) => ({
          question: typeof entry?.question === "string" ? entry.question.trim() : "",
          answer: typeof entry?.answer === "string" ? entry.answer.trim() : "",
        }))
        .filter((entry) => entry.question.length > 0 && entry.answer.length > 0)
      : [],
    version: typeof source.version === "string" && source.version.trim().length > 0 ? source.version.trim() : "1.0.0",
    lastVerifiedAt:
      typeof source.lastVerifiedAt === "string" && source.lastVerifiedAt.trim().length > 0
        ? source.lastVerifiedAt.trim()
        : new Date().toISOString(),
    source: typeof source.source === "object" && source.source !== null ? source.source : undefined,
  };
}

function validateGuide(guide: GuideJson): string[] {
  const issues: string[] = [];

  if (!guide.title) {
    issues.push("missing title");
  }
  if (!guide.description) {
    issues.push("missing description");
  }
  if (!guide.module) {
    issues.push("missing module");
  }
  if (!guide.intent) {
    issues.push("missing intent");
  }
  if (!guide.targetAudience) {
    issues.push("missing targetAudience");
  }

  const steps = normalizeStringArray(guide.steps);
  if (steps.length < MIN_STEPS) {
    issues.push(`insufficient steps (found ${steps.length}, need ${MIN_STEPS})`);
  }

  const prerequisites = normalizeStringArray(guide.prerequisites);
  if (prerequisites.length === 0) {
    issues.push("missing prerequisites");
  }

  const validations = normalizeStringArray(guide.validations);
  if (validations.length === 0) {
    issues.push("missing validations");
  }

  const commonErrors = normalizeStringArray(guide.commonErrors);
  const recovery = normalizeStringArray(guide.recovery);
  if (commonErrors.length === 0 || recovery.length === 0) {
    issues.push("missing troubleshooting content");
  }

  const faq = Array.isArray(guide.faq) ? guide.faq : [];
  if (faq.length === 0) {
    issues.push("missing faq");
  }

  return issues;
}

function buildChunks(guide: GuideJson): GuideChunk[] {
  const guideId = guide.guideId as string;
  const version = (guide.version as string) ?? "1.0.0";
  const chunks: GuideChunk[] = [];

  const addChunk = (
    chunkType: GuideChunk["chunkType"],
    chunkIndex: number,
    text: string
  ) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const id = `${guideId}__${version}__${chunkType}__${chunkIndex}`;
    chunks.push({ id, guideId, chunkType, chunkIndex, text: trimmed });
  };

  addChunk(
    "overview",
    0,
    [`Title: ${guide.title ?? ""}`, `Module: ${guide.module ?? ""}`, `Intent: ${guide.intent ?? ""}`, `Description: ${guide.description ?? ""}`]
      .filter(Boolean)
      .join("\n")
  );

  const prerequisites = normalizeStringArray(guide.prerequisites);
  if (prerequisites.length > 0) {
    addChunk("prerequisites", 0, prerequisites.map((item, index) => `${index + 1}. ${item}`).join("\n"));
  }

  const steps = normalizeStringArray(guide.steps);
  const stepChunkSize = 6;
  for (let i = 0; i < steps.length; i += stepChunkSize) {
    const slice = steps.slice(i, i + stepChunkSize);
    addChunk(
      "steps",
      Math.floor(i / stepChunkSize),
      slice.map((item, index) => `${i + index + 1}. ${item}`).join("\n")
    );
  }

  const validations = normalizeStringArray(guide.validations);
  if (validations.length > 0) {
    addChunk("validations", 0, validations.map((item, index) => `${index + 1}. ${item}`).join("\n"));
  }

  const commonErrors = normalizeStringArray(guide.commonErrors);
  const recovery = normalizeStringArray(guide.recovery);
  if (commonErrors.length > 0 || recovery.length > 0) {
    addChunk(
      "troubleshooting",
      0,
      [
        commonErrors.length > 0 ? `Common errors:\n${commonErrors.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
        recovery.length > 0 ? `Recovery:\n${recovery.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    );
  }

  const faq = Array.isArray(guide.faq) ? guide.faq : [];
  faq.forEach((entry, index) => {
    const question = typeof entry?.question === "string" ? entry.question.trim() : "";
    const answer = typeof entry?.answer === "string" ? entry.answer.trim() : "";
    if (question && answer) {
      addChunk("faq", index, `Q: ${question}\nA: ${answer}`);
    }
  });

  return chunks;
}

async function main() {
  const guidesDir = path.join(process.cwd(), "dev", "guides");
  const archiveDir = path.join(guidesDir, "archive");

  try {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Missing GOOGLE_API_KEY in .env.local");
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error(
        "Missing GOOGLE_APPLICATION_CREDENTIALS. Set it to your service account JSON file path."
      );
    }

    if (getApps().length === 0) {
      initializeApp({
        credential: applicationDefault(),
      });
    }

    const db = getFirestore();
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    await fs.mkdir(archiveDir, { recursive: true });

    const entries = await fs.readdir(guidesDir, { withFileTypes: true });
    const jsonFiles = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
      .map((entry) => entry.name);

    if (jsonFiles.length === 0) {
      console.log("No guide JSON files found in dev/guides. Nothing to ingest.");
      return;
    }

    console.log(`Found ${jsonFiles.length} guide file(s) to ingest.`);

    let totalFiles = 0;
    let validFiles = 0;
    let invalidFiles = 0;
    let totalChunks = 0;
    let totalWrites = 0;

    for (const fileName of jsonFiles) {
      totalFiles += 1;
      const sourcePath = path.join(guidesDir, fileName);
      const archivePath = path.join(archiveDir, fileName);

      try {
        const raw = await fs.readFile(sourcePath, "utf8");
        const parsed = JSON.parse(raw) as GuideJson;
        const normalized = normalizeGuide(parsed);
        const issues = validateGuide(normalized);

        if (issues.length > 0) {
          invalidFiles += 1;
          console.warn(`Skipping ${fileName}: ${issues.join(", ")}`);
          continue;
        }

        validFiles += 1;

        const chunks = buildChunks(normalized);
        if (chunks.length === 0) {
          invalidFiles += 1;
          console.warn(`Skipping ${fileName}: no chunks produced after normalization.`);
          continue;
        }

        totalChunks += chunks.length;

        for (const chunk of chunks) {
          const embeddingText = [
            `Title: ${normalized.title}`,
            `Module: ${normalized.module}`,
            `Intent: ${normalized.intent}`,
            `Audience: ${normalized.targetAudience}`,
            `Chunk Type: ${chunk.chunkType}`,
            chunk.text,
          ]
            .filter(Boolean)
            .join("\n\n")
            .trim();

          if (!embeddingText) {
            continue;
          }

          const embedResult = await embeddingModel.embedContent(embeddingText);
          const embeddingArray = toFixedVector(embedResult.embedding.values);

          if (embeddingArray.length === 0) {
            throw new Error(`Embedding failed for ${fileName}: empty vector returned.`);
          }

          const docData = {
            guideId: normalized.guideId,
            title: normalized.title,
            description: normalized.description,
            module: normalized.module,
            intent: normalized.intent,
            targetAudience: normalized.targetAudience,
            keywords: normalized.keywords,
            version: normalized.version,
            lastVerifiedAt: normalized.lastVerifiedAt,
            source: normalized.source,
            sourceFile: fileName,
            chunkType: chunk.chunkType,
            chunkIndex: chunk.chunkIndex,
            chunkText: chunk.text,
            embeddingText,
            ingestedAt: new Date().toISOString(),
            embedding: FieldValue.vector(embeddingArray),
          };

          await db.collection("help_guides").doc(chunk.id).set(docData, { merge: true });
          totalWrites += 1;
        }

        await fs.rename(sourcePath, archivePath);

        console.log(
          `Ingested ${fileName} -> ${chunks.length} chunk(s) in Firestore and moved to archive.`
        );
      } catch (fileErr) {
        invalidFiles += 1;
        console.error(`Failed to ingest ${fileName}:`, fileErr);
      }
    }

    console.log("Ingestion summary:");
    console.log(`- files scanned: ${totalFiles}`);
    console.log(`- files valid: ${validFiles}`);
    console.log(`- files invalid: ${invalidFiles}`);
    console.log(`- chunks generated: ${totalChunks}`);
    console.log(`- documents written: ${totalWrites}`);
    console.log("Guide ingestion finished.");
  } catch (err) {
    console.error("Ingestion pipeline failed:", err);
    process.exitCode = 1;
  }
}

main();