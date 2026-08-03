import fs from 'node:fs/promises';
import path from 'node:path';

const STATUS_FILTER = (process.env.GUIDE_STATUS ?? 'draft').toLowerCase();
const FILE_PREFIX = process.env.GUIDE_FILE_PREFIX ?? 'assistant-remed-v1';
const VERSION = process.env.GUIDE_VERSION ?? '1.0.5';

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      const escaped = inQuotes && line[i + 1] === '"';
      if (escaped) {
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

  const [header, ...rows] = lines;
  const head = parseCsvLine(header);
  const idx = {
    domain: head.indexOf('domain'),
    module: head.indexOf('module'),
    intent: head.indexOf('intent'),
    targetAudience: head.indexOf('targetAudience'),
    criticality: head.indexOf('criticality'),
    status: head.indexOf('status'),
  };

  return rows.map((line) => {
    const c = parseCsvLine(line);
    return {
      domain: c[idx.domain] || '',
      module: c[idx.module] || '',
      intent: c[idx.intent] || '',
      targetAudience: c[idx.targetAudience] || 'general',
      criticality: c[idx.criticality] || 'important',
      status: c[idx.status] || 'missing',
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
  return Array.from(new Set(values.filter(Boolean).map((v) => v.trim()).filter(Boolean)));
}

function buildGuide(row) {
  const now = new Date().toISOString();
  const intentLabel = humanize(row.intent);
  const guideId = `${row.module}--${row.intent}`;
  const question = `How do I ${row.intent.replace(/-/g, ' ')}?`;

  const steps = [
    'Open Ogeemo and confirm you are in the correct workspace context.',
    'Open the Ogeemo Assistant interface from the main navigation.',
    `Use the knowledge intent workflow for ${intentLabel.toLowerCase()} and confirm the request scope (module, role, and goal).`,
    'Gather current UI evidence from the relevant pages (navigation labels, module names, and action names).',
    'Normalize terminology to Ogeemo canonical wording and remove ambiguous synonyms.',
    `Compose the answer in a structured sequence for ${intentLabel.toLowerCase()} with explicit step numbers.`,
    'Include route/module pointers, required permissions, and expected output so the user can execute immediately.',
    'Add a troubleshooting branch for missing menus, permission mismatches, or stale UI state.',
    'Validate that the answer avoids missing-context statements and references concrete Ogeemo actions.',
    'Return the final response with concise headings and actionable steps only.'
  ];

  return {
    guideId,
    title: `${intentLabel} (Assistant Knowledge)`,
    module: row.module,
    intent: row.intent,
    targetAudience: row.targetAudience,
    description: `Canonical assistant knowledge workflow for ${row.intent}. User question: ${question}`,
    prerequisites: [
      'User is authenticated in Ogeemo and can open the requested modules.',
      'Assistant has current workspace context and role visibility rules.',
      'Navigation labels and module actions are loaded without blocking errors.'
    ],
    steps,
    validations: [
      'Response contains a complete numbered procedure with at least 6 actionable steps.',
      'Response names concrete Ogeemo modules/actions rather than generic advice.',
      'Response includes at least one troubleshooting path for likely failure points.'
    ],
    commonErrors: [
      'Assistant reports missing context instead of using known Ogeemo workflows.',
      'Response is too short or lacks ordered execution steps.',
      'Terminology does not match current Ogeemo UI labels.'
    ],
    recovery: [
      'Re-check route/module names and regenerate the answer with explicit workflow steps.',
      'Reframe the question to include module and user goal when ambiguity is detected.',
      'Re-run with refreshed workspace context and confirm role-based visibility details.'
    ],
    faq: [
      {
        question,
        answer: `Open Ogeemo Assistant, apply the ${intentLabel.toLowerCase()} workflow, and follow the numbered module-specific steps with troubleshooting guidance.`
      },
      {
        question: `Why might answers for ${row.intent.replace(/-/g, ' ')} be incomplete?`,
        answer: 'Incomplete answers usually happen when module scope, role visibility, or navigation context is not explicitly confirmed before response generation.'
      }
    ],
    keywords: uniqueStrings([
      row.domain,
      row.module,
      row.intent,
      intentLabel.toLowerCase(),
      'ogeemo-assistant',
      'knowledge-intent',
      'workflow',
      'sidebar',
      'troubleshooting',
      ...row.intent.split('-')
    ]),
    version: VERSION,
    generatedAt: now,
    lastVerifiedAt: now,
    source: {
      targetUrl: 'coverage-matrix',
      finalUrl: '/assistant',
      workflowInstruction: `Assistant-knowledge draft remediation for ${guideId}`
    },
    actionTrace: 'assistant-knowledge-draft-remediation'
  };
}

async function main() {
  const coveragePath = path.join(process.cwd(), 'docs', 'guides', 'coverage-matrix.csv');
  const guidesDir = path.join(process.cwd(), 'dev', 'guides');

  const raw = await fs.readFile(coveragePath, 'utf8');
  const rows = parseCoverageCsv(raw);

  const targets = rows.filter(
    (r) =>
      r.domain.toLowerCase() === 'assistant' &&
      r.module.toLowerCase() === 'knowledge' &&
      r.status.toLowerCase() === STATUS_FILTER
  );

  if (targets.length === 0) {
    console.log(`No assistant/knowledge rows found for status='${STATUS_FILTER}'.`);
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

  console.log(`Generated ${targets.length} assistant knowledge guide file(s).`);
}

main().catch((error) => {
  console.error('Failed to regenerate assistant knowledge guides:', error);
  process.exit(1);
});
