import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";

dotenv.config({ path: ".env.local" });

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
};

const VERSION = process.env.GUIDE_VERSION ?? "1.0.0";

const seedGuides: GuideRecord[] = [
    {
        guideId: "reports--export-reports",
        title: "Export Reports from Analytics",
        module: "reports",
        intent: "export-reports",
        targetAudience: "general",
        description: "Run an analytics report and export it in a shareable format for review or audit workflows.",
        prerequisites: [
            "You are signed in to Ogeemo.",
            "You have report access permissions.",
            "The target date range or report filter is known.",
        ],
        steps: [
            "Open the Analytics or Reports section from the main navigation.",
            "Select the report type you need for the current task.",
            "Set required filters such as date range, team, or client scope.",
            "Run or refresh the report and wait for values to load.",
            "Choose Export and select the required output format.",
            "Save the exported file to the designated evidence folder.",
        ],
        validations: [
            "The exported file opens without format errors.",
            "The totals in the export match the on-screen report totals.",
            "The filename and location follow your evidence conventions.",
        ],
        commonErrors: [
            "Export button is disabled.",
            "Report values are blank after filters are applied.",
            "Downloaded file does not include expected columns.",
        ],
        recovery: [
            "Verify you have export permissions for the selected report.",
            "Reset filters and rerun report with a known valid date range.",
            "Check report column settings before exporting again.",
        ],
        faq: [
            {
                question: "Which format should I use for audit support?",
                answer: "Use the format required by your audit process and retain the source report settings in notes.",
            },
            {
                question: "Should I rerun export after data corrections?",
                answer: "Yes. Regenerate exports after corrections so evidence aligns with final ledger state.",
            },
        ],
        keywords: ["report", "export", "analytics", "download", "evidence"],
    },
    {
        guideId: "contacts--create-contact",
        title: "Create and Classify a Contact",
        module: "contacts",
        intent: "create-contact",
        targetAudience: "general",
        description: "Create a complete contact record and classify it correctly for CRM, workflow routing, and documentation.",
        prerequisites: [
            "You can access the contacts module.",
            "You know whether the record is a client, supplier, worker, or lead.",
            "Required identity and communication details are available.",
        ],
        steps: [
            "Open Contacts and start a new contact record.",
            "Enter core identity details including name and email.",
            "Set classification fields such as folder role and status.",
            "Add phone and address values used by operations.",
            "Add optional compliance fields if required for this contact type.",
            "Save and confirm the record appears in the expected list and pipeline stage.",
        ],
        validations: [
            "Contact appears in the correct role bucket.",
            "Required fields are present and formatted correctly.",
            "Linked folder or document context exists when required.",
        ],
        commonErrors: [
            "Cannot save due to missing required role field.",
            "Contact created in wrong pipeline stage.",
            "Duplicate contact appears after save.",
        ],
        recovery: [
            "Populate required fields and retry save.",
            "Edit status/folder fields and reclassify record.",
            "Merge duplicate records using admin-approved process.",
        ],
        faq: [
            {
                question: "When should I use workerType fields?",
                answer: "Only when the contact represents a worker profile used for payroll or HR operations.",
            },
            {
                question: "Can I add keywords for search?",
                answer: "Yes. Add meaningful tags to improve retrieval and list filtering.",
            },
        ],
        keywords: ["contacts", "crm", "lead", "client", "classification"],
    },
    {
        guideId: "files--upload-document",
        title: "Upload Documents to Evidence Folders",
        module: "files",
        intent: "upload-document",
        targetAudience: "general",
        description: "Upload and organize supporting documents so records stay audit-ready and searchable.",
        prerequisites: [
            "You have upload permissions.",
            "The destination folder or contact linkage is identified.",
            "Files are named according to internal standards.",
        ],
        steps: [
            "Open the file or document manager module.",
            "Navigate to the target folder for the relevant contact or workflow.",
            "Select Upload and choose one or more files.",
            "Apply tags, notes, or categories as needed.",
            "Link uploaded files to the related contact, task, or record.",
            "Confirm upload status and file visibility for your team.",
        ],
        validations: [
            "Files appear in the expected folder location.",
            "Linked contact or record shows attached evidence.",
            "File names and metadata follow team standards.",
        ],
        commonErrors: [
            "Upload fails due to file size or network issue.",
            "File appears in wrong folder.",
            "Team cannot access uploaded document.",
        ],
        recovery: [
            "Retry upload and verify network stability.",
            "Move file to correct folder and relink to record.",
            "Adjust permissions or escalate to admin for access updates.",
        ],
        faq: [
            {
                question: "Should I overwrite an existing file?",
                answer: "Prefer versioned names unless policy requires replacement to preserve audit history.",
            },
            {
                question: "What if the wrong document was uploaded?",
                answer: "Remove or archive according to policy, then upload the correct file and relink.",
            },
        ],
        keywords: ["files", "documents", "upload", "evidence", "folders"],
    },
    {
        guideId: "accounting--categorize-expense",
        title: "Categorize Business Expenses",
        module: "accounting",
        intent: "categorize-expense",
        targetAudience: "accountant",
        description: "Classify expenses correctly so reports, tax prep, and reconciliation workflows remain accurate.",
        prerequisites: [
            "You have accounting data access.",
            "Expense details and source documentation are available.",
            "Category taxonomy is defined for your organization.",
        ],
        steps: [
            "Open the accounting transactions or expenses view.",
            "Create or open the expense transaction to classify.",
            "Assign the correct expense category and tax treatment.",
            "Attach source documentation if required.",
            "Save transaction and update any related project tags.",
            "Review categorized totals in summary views.",
        ],
        validations: [
            "Expense appears under the expected category in reports.",
            "Tax and amount fields are consistent with source documents.",
            "No uncategorized entries remain for the review period.",
        ],
        commonErrors: [
            "Expense posted under wrong category.",
            "Tax amount does not align with receipt.",
            "Duplicate expense record created.",
        ],
        recovery: [
            "Edit transaction category and rerun report checks.",
            "Correct tax fields and validate totals.",
            "Void or merge duplicate entries per policy.",
        ],
        faq: [
            {
                question: "Can I bulk-categorize expenses?",
                answer: "Use bulk tools when available, then run validation checks on sampled entries.",
            },
            {
                question: "How often should categorization be reviewed?",
                answer: "Review continuously during the period and again before month-end close.",
            },
        ],
        keywords: ["accounting", "expense", "category", "tax", "transaction"],
    },
    {
        guideId: "payroll--run-payroll",
        title: "Run Payroll Safely",
        module: "payroll",
        intent: "run-payroll",
        targetAudience: "accountant",
        description: "Process payroll with verification checkpoints to reduce errors and ensure compliance.",
        prerequisites: [
            "Worker profiles and pay rates are up to date.",
            "Current period time and attendance data is finalized.",
            "You have payroll approval rights.",
        ],
        steps: [
            "Open payroll and select the current payroll period.",
            "Verify included workers and employment types.",
            "Import or confirm hours, salary, and adjustments.",
            "Run payroll preview and inspect gross-to-net values.",
            "Resolve anomalies, then finalize payroll run.",
            "Export payroll summary and store evidence artifacts.",
        ],
        validations: [
            "Payroll totals match approved time and compensation data.",
            "No unresolved payroll warnings remain before finalization.",
            "Final payroll summary is archived for compliance review.",
        ],
        commonErrors: [
            "Worker missing from run.",
            "Unexpected net pay due to incorrect pay type.",
            "Finalization blocked by incomplete profile data.",
        ],
        recovery: [
            "Update worker assignment and rerun preview.",
            "Fix pay type/rate and recalculate payroll.",
            "Complete required profile fields and finalize again.",
        ],
        faq: [
            {
                question: "Should payroll be rerun after corrections?",
                answer: "Yes. Re-run preview and validation checks before final finalization.",
            },
            {
                question: "What evidence should be retained?",
                answer: "Retain payroll summary, approval notes, and any correction records.",
            },
        ],
        keywords: ["payroll", "run", "preview", "gross", "net"],
    },
    {
        guideId: "settings--configure-role-permissions",
        title: "Configure Role-Based Permissions",
        module: "settings",
        intent: "configure-role-permissions",
        targetAudience: "admin",
        description: "Assign role permissions carefully so users can perform required tasks without over-privileged access.",
        prerequisites: [
            "You have admin access to settings.",
            "Role requirements are defined by function.",
            "You understand permission impact on workflow modules.",
        ],
        steps: [
            "Open Settings and go to roles or permissions management.",
            "Select the role to create or modify.",
            "Enable required permissions by module and action.",
            "Remove unnecessary permissions to preserve least privilege.",
            "Save changes and apply to test user accounts.",
            "Validate that role can complete required workflows.",
        ],
        validations: [
            "Users with the role can complete expected workflows.",
            "Users cannot access unauthorized modules or actions.",
            "Permission changes are logged for audit traceability.",
        ],
        commonErrors: [
            "Role loses access to critical workflow step.",
            "Permission update not reflected immediately.",
            "Role has excessive access after edits.",
        ],
        recovery: [
            "Restore known-good permission baseline and retest.",
            "Refresh session or reauthenticate and test again.",
            "Revoke unnecessary permissions and document change rationale.",
        ],
        faq: [
            {
                question: "How do I test role changes safely?",
                answer: "Use a dedicated test account per role before rolling changes into production users.",
            },
            {
                question: "When should roles be reviewed?",
                answer: "Review roles during onboarding/offboarding and periodic access audits.",
            },
        ],
        keywords: ["settings", "roles", "permissions", "admin", "security"],
    },
    {
        guideId: "knowledge--reingest-guides",
        title: "Re-Ingest Guide Corpus for Assistant",
        module: "knowledge",
        intent: "reingest-guides",
        targetAudience: "admin",
        description: "Refresh the assistant knowledge base after workflow or documentation changes.",
        prerequisites: [
            "New or updated guide JSON files exist in dev/guides.",
            "GOOGLE_APPLICATION_CREDENTIALS is set correctly.",
            "GOOGLE_API_KEY is present in .env.local.",
        ],
        steps: [
            "Open terminal in repository root.",
            "Run the ingestion command using the configured credentials.",
            "Review ingestion summary for valid and invalid files.",
            "Address any validation failures and rerun ingestion.",
            "Confirm updated chunks are written in help_guides.",
            "Test assistant responses with representative questions.",
        ],
        validations: [
            "Ingestion summary shows expected chunk and write counts.",
            "No vector dimension errors appear in logs.",
            "Assistant responses improve for updated workflow intents.",
        ],
        commonErrors: [
            "Missing GOOGLE_APPLICATION_CREDENTIALS.",
            "Guide files fail validation due to incomplete fields.",
            "Assistant still returns missing context after ingestion.",
        ],
        recovery: [
            "Set credentials explicitly and rerun command.",
            "Update guide JSON to satisfy contract and regenerate.",
            "Verify retrieval metadata and question phrasing align with new guides.",
        ],
        faq: [
            {
                question: "Can ingestion be rerun safely?",
                answer: "Yes. Deterministic document IDs allow idempotent upserts for chunk documents.",
            },
            {
                question: "How often should ingestion run?",
                answer: "Run after material workflow changes and on a regular maintenance cadence.",
            },
        ],
        keywords: ["ingestion", "guides", "vector", "assistant", "knowledge-base"],
    },
];

async function main() {
    const guidesDir = path.join(process.cwd(), "dev", "guides");
    await fs.mkdir(guidesDir, { recursive: true });

    const generatedAt = new Date().toISOString();

    for (const record of seedGuides) {
        const payload = {
            ...record,
            version: VERSION,
            generatedAt,
            lastVerifiedAt: generatedAt,
            source: {
                targetUrl: "manual-seed",
                finalUrl: "manual-seed",
                workflowInstruction: "Seeded from coverage matrix for corpus bootstrap",
            },
            actionTrace: "seeded-guide",
        };

        const fileName = `seed-${record.guideId}-${Date.now()}.json`;
        const filePath = path.join(guidesDir, fileName);
        await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
        console.log(`Created ${filePath}`);
    }

    console.log(`Seed guide generation complete: ${seedGuides.length} files.`);
}

main().catch((error) => {
    console.error("Failed to bootstrap guide corpus:", error);
    process.exit(1);
});
