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

type VerificationResult = {
    row: CoverageRow;
    question: string;
    passed: boolean;
    reason: string;
    answer: string;
};

const DEFAULT_API_URL = "https://ogeemoassistant-qsckasljxq-uc.a.run.app";
const VERIFIED_OWNER = "copilot-auto-verify";
const CRITICALITY_FILTER = (process.env.VERIFY_CRITICALITY ?? "critical").toLowerCase();
const STATUS_FILTER = (process.env.VERIFY_STATUS ?? "draft").toLowerCase();
const REPORT_FILE = process.env.VERIFY_REPORT_FILE ?? "verification-report.md";

function parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
            const escaped = inQuotes && line[i + 1] === '"';
            if (escaped) {
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

function csvEscape(value: string): string {
    if (value.includes(",") || value.includes("\n") || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function parseCoverageCsv(input: string): { header: string; rows: CoverageRow[] } {
    const lines = input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const [header, ...dataLines] = lines;

    const rows = dataLines.map((line) => {
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

    return { header, rows };
}

function toCsvLine(row: CoverageRow): string {
    return [
        row.domain,
        row.module,
        row.intent,
        row.targetAudience,
        row.criticality,
        row.status,
        row.owner,
        row.sourceGuideId,
    ]
        .map((value) => csvEscape(value ?? ""))
        .join(",");
}

function intentToQuestion(intent: string): string {
    return `How do I ${intent.replace(/-/g, " ")}?`;
}

function countStepLikeLines(answer: string): number {
    return answer
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => /^\d+\./.test(line)).length;
}

function evaluateAnswer(answer: string): { passed: boolean; reason: string } {
    const normalized = answer.toLowerCase();

    const failingSignals = [
        "does not contain",
        "not contain information",
        "not enough information",
        "suggest what is missing",
        "i apologize",
        "missing context",
    ];

    if (failingSignals.some((signal) => normalized.includes(signal))) {
        return { passed: false, reason: "assistant indicated missing or insufficient context" };
    }

    const stepCount = countStepLikeLines(answer);
    if (stepCount >= 3) {
        return { passed: true, reason: `contains ${stepCount} numbered procedural steps` };
    }

    if (answer.trim().length >= 220) {
        return { passed: true, reason: "long-form procedural response without missing-context signals" };
    }

    return { passed: false, reason: "response was too short and lacked clear procedural structure" };
}

async function askAssistant(apiUrl: string, question: string): Promise<string> {
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
    });

    let json: any = null;
    try {
        json = await response.json();
    } catch {
        throw new Error(`Non-JSON response received for question: ${question}`);
    }

    if (!response.ok) {
        const errText = typeof json?.error === "string" ? json.error : `HTTP ${response.status}`;
        throw new Error(`Assistant request failed: ${errText}`);
    }

    const answer = typeof json?.answer === "string" ? json.answer : "";
    if (!answer.trim()) {
        throw new Error("Assistant returned empty answer");
    }

    return answer;
}

async function main() {
    const apiUrl = process.env.OGEEMO_API_URL ?? DEFAULT_API_URL;
    const coveragePath = path.join(process.cwd(), "docs", "guides", "coverage-matrix.csv");
    const reportPath = path.join(process.cwd(), "docs", "guides", REPORT_FILE);

    const coverageRaw = await fs.readFile(coveragePath, "utf8");
    const { header, rows } = parseCoverageCsv(coverageRaw);

    const targets = rows.filter(
        (row) =>
            row.criticality.toLowerCase() === CRITICALITY_FILTER &&
            row.status.toLowerCase() === STATUS_FILTER
    );

    if (targets.length === 0) {
        console.log(
            `No rows found for criticality='${CRITICALITY_FILTER}' and status='${STATUS_FILTER}'. Nothing to verify.`
        );
        return;
    }

    const results: VerificationResult[] = [];

    for (const row of targets) {
        const question = intentToQuestion(row.intent);
        try {
            const answer = await askAssistant(apiUrl, question);
            const evalResult = evaluateAnswer(answer);
            results.push({
                row,
                question,
                passed: evalResult.passed,
                reason: evalResult.reason,
                answer,
            });
            console.log(`${evalResult.passed ? "PASS" : "FAIL"} ${row.module}::${row.intent} -> ${evalResult.reason}`);
        } catch (error) {
            const reason = error instanceof Error ? error.message : "unknown verification error";
            results.push({
                row,
                question,
                passed: false,
                reason,
                answer: "",
            });
            console.log(`FAIL ${row.module}::${row.intent} -> ${reason}`);
        }
    }

    const verifiedKeys = new Set(
        results
            .filter((result) => result.passed)
            .map((result) => `${result.row.module}::${result.row.intent}`)
    );

    const updatedRows = rows.map((row) => {
        const key = `${row.module}::${row.intent}`;
        if (!verifiedKeys.has(key)) {
            return row;
        }

        return {
            ...row,
            status: "verified",
            owner: row.owner?.trim().length > 0 ? row.owner : VERIFIED_OWNER,
            sourceGuideId: row.sourceGuideId?.trim().length > 0 ? row.sourceGuideId : `${row.module}--${row.intent}`,
        };
    });

    const csvOutput = [header, ...updatedRows.map(toCsvLine)].join("\n") + "\n";
    await fs.writeFile(coveragePath, csvOutput, "utf8");

    const passCount = results.filter((result) => result.passed).length;
    const failCount = results.length - passCount;
    const generatedAt = new Date().toISOString();

    const reportLines: string[] = [];
    reportLines.push(`# ${CRITICALITY_FILTER} ${STATUS_FILTER} Verification Report`);
    reportLines.push("");
    reportLines.push(`Generated at: ${generatedAt}`);
    reportLines.push(`Assistant endpoint: ${apiUrl}`);
    reportLines.push("");
    reportLines.push(`Total checked: ${results.length}`);
    reportLines.push(`Passed: ${passCount}`);
    reportLines.push(`Failed: ${failCount}`);
    reportLines.push("");
    reportLines.push("## Results");
    reportLines.push("");

    for (const result of results) {
        reportLines.push(`- [${result.passed ? "PASS" : "FAIL"}] ${result.row.module}::${result.row.intent}`);
        reportLines.push(`  - Question: ${result.question}`);
        reportLines.push(`  - Reason: ${result.reason}`);
        if (result.answer) {
            reportLines.push(`  - Answer excerpt: ${result.answer.slice(0, 220).replace(/\n/g, " ")}`);
        }
    }

    reportLines.push("");
    reportLines.push("## Policy");
    reportLines.push("- Status is promoted to verified only when the answer is procedural and does not signal missing context.");
    reportLines.push(`- Failed rows remain in ${STATUS_FILTER} for further guide refinement.`);

    await fs.writeFile(reportPath, reportLines.join("\n"), "utf8");

    console.log(`Verification complete. ${passCount}/${results.length} passed.`);
    console.log(`Updated matrix: ${coveragePath}`);
    console.log(`Report: ${reportPath}`);
}

main().catch((error) => {
    console.error("Critical verification failed:", error);
    process.exit(1);
});
