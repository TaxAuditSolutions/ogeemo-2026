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
const MODULE_FILTER = (process.env.GUIDE_MODULES ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

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

function hasIntentToken(row: CoverageRow, token: string): boolean {
    return row.intent.toLowerCase().includes(token);
}

function buildTargetedSteps(row: CoverageRow, moduleLabel: string, intentLabel: string): string[] {
    const baseSteps = [
        `Open the ${moduleLabel} module from the main navigation.`,
        `Locate the ${intentLabel.toLowerCase()} entry point in the module workflow.`,
        `Enter or select the required inputs for ${intentLabel.toLowerCase()}.`,
        "Review the configuration and confirm all required fields are complete.",
        "Run or save the workflow and wait for confirmation feedback.",
        "Record output artifacts and references for audit and follow-up tasks.",
    ];

    if (row.module.toLowerCase() === "ledgers") {
        if (hasIntentToken(row, "reconciliation")) {
            return [
                "Open Accounting and select BKS General Ledger.",
                "Go to Reconciliation and launch the reconciliation workspace.",
                "Set account and statement period before importing or matching transactions.",
                "Load bank statement data, then review unmatched and suggested matches.",
                "Bulk verify valid matches and flag exceptions for manual review.",
                "Complete reconciliation, then confirm status and saved audit trail.",
            ];
        }
        if (hasIntentToken(row, "delete")) {
            return [
                "Open Accounting and select BKS General Ledger.",
                "Filter to the target account, period, and transaction set.",
                "Select the transaction or transaction batch intended for deletion.",
                "Run delete and confirm impact preview before finalizing.",
                "Verify balances and dependent reports after deletion completes.",
                "If rollback is required, restore from audit history or reversal workflow.",
            ];
        }
        return [
            "Open Accounting and select BKS General Ledger.",
            "Use account and date filters to load the target ledger view.",
            "Perform the requested ledger action for the selected records.",
            "Validate resulting balances, transaction state, and posting status.",
            "Capture change references and audit evidence.",
            "Escalate any permission or lock errors through ledger recovery steps.",
        ];
    }

    if (row.module.toLowerCase() === "client-time-log") {
        return [
            "Open Reporting and navigate to Client Time Log.",
            "Apply client and date filters for the target time entries.",
            "Select the specific time entry or grouped total required by the workflow.",
            "Run the requested action (delete, invoice creation, or filter confirmation).",
            "Validate that billing totals and linked records update correctly.",
            "Save the result and verify the updated log state in reporting views.",
        ];
    }

    if (row.module.toLowerCase() === "knowledge") {
        return [
            "Open Ogeemo Assistant and load the knowledge workflow context.",
            "Identify the exact question scope, including module and user goal.",
            "Use canonical Ogeemo terms for left-sidebar items and action chips.",
            "Provide a direct numbered answer with module path and expected outcome.",
            "Include troubleshooting for missing sidebar items or permission visibility.",
            "Confirm final answer avoids missing-context language and remains actionable.",
        ];
    }

    return baseSteps;
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

    const steps = buildTargetedSteps(row, moduleLabel, intentLabel);

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
            row.status.toLowerCase() === STATUS_FILTER &&
            (MODULE_FILTER.length === 0 || MODULE_FILTER.includes(row.module.toLowerCase()))
    );

    if (targets.length === 0) {
        console.log(
            `No rows found for criticality='${CRITICALITY_FILTER}', status='${STATUS_FILTER}', modules='${MODULE_FILTER.join(",") || "all"
            }'. Nothing to generate.`
        );
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

    console.log(
        `Generated ${targets.length} guide file(s) for criticality='${CRITICALITY_FILTER}' and modules='${MODULE_FILTER.join(",") || "all"}'.`
    );
}

main().catch((error) => {
    console.error("Failed to generate critical guides:", error);
    process.exit(1);
});
