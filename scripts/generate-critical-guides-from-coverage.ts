import fs from "node:fs/promises";
import path from "node:path";

type CoverageRow = {
    domain: string;
    module: string;
    intent: string;
    targetAudience: string;
    criticality: string;
    status: string;
    owner: string;
    sourceGuideId: string;
};

type GuideRecord = {
    guideId: string;
    title: string;
    module: string;
    intent: string;
    targetAudience: string;
    description: string;
    prerequisites: string[];
    steps: string[];
    validations: string[];
    commonErrors: string[];
    recovery: string[];
    faq: Array<{ question: string; answer: string }>;
    keywords: string[];
    version: string;
    generatedAt: string;
    lastVerifiedAt: string;
    source: {
        targetUrl: string;
        finalUrl: string;
        workflowInstruction: string;
    };
    actionTrace: string;
};

const VERSION = process.env.GUIDE_VERSION ?? "1.0.1";
const CRITICALITY_FILTER = (process.env.GUIDE_CRITICALITY ?? "critical").toLowerCase();
const STATUS_FILTER = (process.env.GUIDE_STATUS ?? "missing").toLowerCase();
const FILE_PREFIX = process.env.GUIDE_FILE_PREFIX ?? CRITICALITY_FILTER;

function parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
            const isEscapedQuote = inQuotes && line[i + 1] === '"';
            if (isEscapedQuote) {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
            continue;
        }

        current += char;
    }

    values.push(current.trim());
    return values;
}

function parseCoverageCsv(input: string): CoverageRow[] {
    const lines = input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const [, ...rows] = lines;

    return rows.map((line) => {
        const [
            domain,
            module,
            intent,
            targetAudience,
            criticality,
            status,
            owner,
            sourceGuideId,
        ] = parseCsvLine(line);

        return {
            domain,
            module,
            intent,
            targetAudience,
            criticality,
            status,
            owner,
            sourceGuideId,
        };
    });
}

function humanize(value: string) {
    return value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function uniqueStrings(values: string[]) {
    return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function buildGuideFromRow(row: CoverageRow): GuideRecord {
    const guideId = `${row.module}--${row.intent}`;
    const intentLabel = humanize(row.intent);
    const moduleLabel = humanize(row.module);
    const now = new Date().toISOString();

    const title = `${intentLabel} in ${moduleLabel}`;
    const description = `Complete the ${intentLabel.toLowerCase()} workflow in the ${moduleLabel} module using a validated, repeatable process.`;

    const prerequisites = [
        `You are signed in with ${row.targetAudience} access or equivalent permissions.`,
        `You can open the ${moduleLabel} module in the current Ogeemo environment.`,
        `Required data inputs for ${intentLabel.toLowerCase()} are prepared before starting.`,
    ];

    const steps = [
        `Open the ${moduleLabel} module from the main navigation.`,
        `Locate the ${intentLabel.toLowerCase()} entry point in the module workflow.`,
        `Enter or select the required inputs for ${intentLabel.toLowerCase()}.`,
        `Review the configuration and confirm all required fields are complete.`,
        `Run or save the workflow and wait for confirmation feedback.`,
        `Record output artifacts and references for audit and follow-up tasks.`,
    ];

    const validations = [
        `${intentLabel} completes without warnings or blockers.`,
        `Resulting records are visible in the expected ${moduleLabel} views.`,
        `Any generated output is stored in the expected location with traceable metadata.`,
    ];

    const commonErrors = [
        `Required fields are missing during ${intentLabel.toLowerCase()}.`,
        `Permission constraints prevent completion of ${intentLabel.toLowerCase()}.`,
        `Output is created but not linked to the expected workflow context.`,
    ];

    const recovery = [
        `Validate required field inputs and rerun ${intentLabel.toLowerCase()}.`,
        `Confirm role permissions for ${row.targetAudience} and retry after access refresh.`,
        `Re-open the module, relink output artifacts, and verify final state.`,
    ];

    const faq = [
        {
            question: `When should I rerun ${intentLabel.toLowerCase()}?`,
            answer: "Rerun after correcting inputs or permissions, then validate output against expected records.",
        },
        {
            question: `How do I confirm ${intentLabel.toLowerCase()} is complete?`,
            answer: "Use module validation checks, confirm resulting records, and verify supporting artifacts were saved.",
        },
    ];

    const keywords = uniqueStrings([
        row.module,
        row.intent,
        row.targetAudience,
        row.domain,
        ...row.intent.split("-"),
        moduleLabel.toLowerCase(),
        intentLabel.toLowerCase(),
    ]);

    return {
        guideId,
        title,
        module: row.module,
        intent: row.intent,
        targetAudience: row.targetAudience,
        description,
        prerequisites,
        steps,
        validations,
        commonErrors,
        recovery,
        faq,
        keywords,
        version: VERSION,
        generatedAt: now,
        lastVerifiedAt: now,
        source: {
            targetUrl: "coverage-matrix",
            finalUrl: "coverage-matrix",
            workflowInstruction: `Seeded from coverage matrix row for ${guideId}`,
        },
        actionTrace: "coverage-matrix-seed",
    };
}

async function main() {
    const coveragePath = path.join(process.cwd(), "docs", "guides", "coverage-matrix.csv");
    const guidesDir = path.join(process.cwd(), "dev", "guides");

    const coverageRaw = await fs.readFile(coveragePath, "utf8");
    const rows = parseCoverageCsv(coverageRaw);

    const targets = rows.filter(
        (row) =>
            row.criticality.toLowerCase() === CRITICALITY_FILTER &&
            row.status.toLowerCase() === STATUS_FILTER
    );

    if (targets.length === 0) {
        console.log(`No rows found for criticality='${CRITICALITY_FILTER}' and status='${STATUS_FILTER}'. Nothing to generate.`);
        return;
    }

    await fs.mkdir(guidesDir, { recursive: true });

    for (const row of targets) {
        const guide = buildGuideFromRow(row);
        const fileName = `${FILE_PREFIX}-${guide.guideId}-${Date.now()}.json`;
        const filePath = path.join(guidesDir, fileName);
        await fs.writeFile(filePath, JSON.stringify(guide, null, 2), "utf8");
        console.log(`Created ${fileName}`);
    }

    console.log(`Generated ${targets.length} guide file(s) for criticality='${CRITICALITY_FILTER}'.`);
}

main().catch((error) => {
    console.error("Failed to generate critical guides:", error);
    process.exit(1);
});
