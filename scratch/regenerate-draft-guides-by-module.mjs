import fs from 'node:fs/promises';
import path from 'node:path';

const STATUS_FILTER = (process.env.GUIDE_STATUS ?? 'draft').toLowerCase();
const MODULE_FILTER = (process.env.GUIDE_MODULES ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const FILE_PREFIX = process.env.GUIDE_FILE_PREFIX ?? 'rework';
const VERSION = process.env.GUIDE_VERSION ?? '1.0.2';

if (MODULE_FILTER.length === 0) {
  console.error('Set GUIDE_MODULES as comma-separated module names.');
  process.exit(1);
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  values.push(current.trim());
  return values;
}

function parseCoverageCsv(input) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const [headerLine, ...rowLines] = lines;
  const header = parseCsvLine(headerLine);
  const idx = {
    domain: header.indexOf('domain'),
    module: header.indexOf('module'),
    intent: header.indexOf('intent'),
    targetAudience: header.indexOf('targetAudience'),
    criticality: header.indexOf('criticality'),
    status: header.indexOf('status'),
    owner: header.indexOf('owner'),
    sourceGuideId: header.indexOf('sourceGuideId'),
  };

  return rowLines.map((line) => {
    const cols = parseCsvLine(line);
    return {
      domain: cols[idx.domain] ?? '',
      module: cols[idx.module] ?? '',
      intent: cols[idx.intent] ?? '',
      targetAudience: cols[idx.targetAudience] ?? 'general',
      criticality: cols[idx.criticality] ?? 'important',
      status: cols[idx.status] ?? 'missing',
      owner: cols[idx.owner] ?? '',
      sourceGuideId: cols[idx.sourceGuideId] ?? '',
    };
  });
}

function humanize(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function uniqueStrings(values) {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function moduleSpecificPrerequisites(moduleLabel, audienceLabel, intentLabel) {
  return [
    `You are signed in with ${audienceLabel} access and can open ${moduleLabel}.`,
    `Records needed for ${intentLabel.toLowerCase()} are available in the active workspace.`,
    `You have permission to save changes, print, export, or post updates in ${moduleLabel}.`,
  ];
}

function moduleSpecificSteps(moduleName, moduleLabel, intentLabel) {
  const steps = [
    `Open ${moduleLabel} from the main navigation and confirm the correct company/workspace context.`,
    `Locate the exact workflow for "${intentLabel}" in ${moduleLabel}.`,
    `Apply required filters and selections (date range, account/client/worker, and status fields).`,
    `Complete the ${intentLabel.toLowerCase()} action and review on-screen confirmation feedback.`,
    `Validate the resulting ledger/report/document rows and totals before leaving the page.`,
    `Save or export output artifacts and capture references for audit follow-up.`,
  ];

  if (moduleName === 'ledgers') {
    steps.splice(2, 0, 'Select the correct ledger tab (general, income, expense, or reconciliation) before running the action.');
  }

  if (moduleName === 'document-manager') {
    steps.splice(2, 0, 'Confirm folder tree location and parent node before moving, renaming, or linking files.');
  }

  if (moduleName === 'client-time-log') {
    steps.splice(2, 0, 'Set client and date filters first, then review billable flags and amount calculations.');
  }

  return steps;
}

function buildGuide(row) {
  const moduleName = row.module;
  const intent = row.intent;
  const guideId = `${moduleName}--${intent}`;
  const moduleLabel = humanize(moduleName);
  const intentLabel = humanize(intent);
  const audienceLabel = row.targetAudience || 'general';
  const now = new Date().toISOString();

  const description = [
    `Use this guide to complete ${intentLabel.toLowerCase()} in ${moduleLabel}.`,
    `Intent key: ${intent}.`,
    `Module key: ${moduleName}.`,
  ].join(' ');

  const prerequisites = moduleSpecificPrerequisites(moduleLabel, audienceLabel, intentLabel);
  const steps = moduleSpecificSteps(moduleName, moduleLabel, intentLabel);

  const validations = [
    `${intentLabel} finishes without permission, validation, or runtime errors.`,
    `Expected changes are visible immediately in ${moduleLabel} lists, totals, or linked records.`,
    `Output references can be traced back to ${guideId} with date and user context.`,
  ];

  const commonErrors = [
    `Missing or inconsistent filters while executing ${intent}.`,
    `Insufficient permissions for ${audienceLabel} while attempting ${intent}.`,
    `Result appears in UI but is not persisted or linked to expected records.`,
  ];

  const recovery = [
    `Reopen ${moduleLabel}, reapply required filters, and repeat ${intentLabel.toLowerCase()}.`,
    `Validate role permissions and refresh session before rerunning the workflow.`,
    `Cross-check saved records and relink missing outputs to the correct context.`,
  ];

  const faq = [
    {
      question: `How do I confirm ${intentLabel.toLowerCase()} completed successfully?`,
      answer: `Verify list/table updates, totals, and output references in ${moduleLabel} immediately after execution.`,
    },
    {
      question: `What should I do if ${intentLabel.toLowerCase()} returns no data?`,
      answer: 'Review filters, date range, selected entities, and permissions, then rerun and validate results.',
    },
  ];

  const keywords = uniqueStrings([
    row.domain,
    moduleName,
    moduleLabel.toLowerCase(),
    intent,
    intentLabel.toLowerCase(),
    row.targetAudience,
    ...intent.split('-'),
    'draft-rework',
    'verification-retry',
  ]);

  return {
    guideId,
    title: `${intentLabel} in ${moduleLabel}`,
    module: moduleName,
    intent,
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
      targetUrl: 'coverage-matrix',
      finalUrl: 'coverage-matrix',
      workflowInstruction: `Rework guide for ${guideId} from draft verification failures`,
    },
    actionTrace: 'coverage-matrix-rework',
  };
}

async function main() {
  const coveragePath = path.join(process.cwd(), 'docs', 'guides', 'coverage-matrix.csv');
  const guidesDir = path.join(process.cwd(), 'dev', 'guides');

  const coverageRaw = await fs.readFile(coveragePath, 'utf8');
  const rows = parseCoverageCsv(coverageRaw);

  const targets = rows.filter(
    (row) => row.status.toLowerCase() === STATUS_FILTER && MODULE_FILTER.includes(row.module.toLowerCase())
  );

  if (targets.length === 0) {
    console.log(`No rows found for status='${STATUS_FILTER}' and modules='${MODULE_FILTER.join(',')}'.`);
    return;
  }

  await fs.mkdir(guidesDir, { recursive: true });

  for (const row of targets) {
    const guide = buildGuide(row);
    const fileName = `${FILE_PREFIX}-${guide.guideId}-${Date.now()}.json`;
    const filePath = path.join(guidesDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(guide, null, 2), 'utf8');
    console.log(`Created ${fileName}`);
  }

  console.log(`Generated ${targets.length} rework guide file(s).`);
}

main().catch((error) => {
  console.error('Failed to regenerate draft guides:', error);
  process.exit(1);
});
