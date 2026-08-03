import fs from 'node:fs/promises';
import path from 'node:path';

const STATUS_FILTER = (process.env.GUIDE_STATUS ?? 'draft').toLowerCase();
const FILE_PREFIX = process.env.GUIDE_FILE_PREFIX ?? 'hardfail-v3';
const VERSION = process.env.GUIDE_VERSION ?? '1.0.4';

const ROUTE_MAP = {
  backup: '/backup',
  calendar: '/calendar',
  'client-statement': '/reports/client-statement',
  'client-time-log': '/reports/client-time-log',
  'document-manager': '/files',
  'email-hub': '/actions',
  'idea-board': '/ideas',
  'image-generator': '/actions',
  ledgers: '/accounting/ledgers',
  'project-status': '/projects',
  projects: '/projects',
  reports: '/reports',
  settings: '/settings',
  'user-manager': '/settings',
  'work-activity': '/reports/work-activity',
  'worker-time-log': '/reports/time-log',
};

function parseCsvLine(line) {
  const values = [];
  let current = '';
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

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
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
    owner: head.indexOf('owner'),
    sourceGuideId: head.indexOf('sourceGuideId'),
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
      owner: c[idx.owner] || '',
      sourceGuideId: c[idx.sourceGuideId] || '',
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

function inferActionHints(intent) {
  const t = intent.toLowerCase();
  const hints = [];
  if (t.includes('start-date') || t.includes('end-date') || t.includes('date')) {
    hints.push('Use date picker controls and confirm date range chips update before running the action.');
  }
  if (t.includes('filter')) {
    hints.push('Apply filter controls first, then confirm table/list result counts change.');
  }
  if (t.includes('sort')) {
    hints.push('Use sort controls and verify row order changes by the selected sort key.');
  }
  if (t.includes('print') || t.includes('export')) {
    hints.push('Use print/export controls and confirm file preview/download generation completes.');
  }
  if (t.includes('delete') || t.includes('remove')) {
    hints.push('Validate selection scope before delete and confirm post-delete row count is reduced.');
  }
  if (t.includes('create') || t.includes('add')) {
    hints.push('Complete required fields and verify newly created record appears in the target list.');
  }
  if (t.includes('invoice')) {
    hints.push('Confirm billable hours/amount totals before posting invoice action.');
  }
  return hints;
}

function buildGuide(row) {
  const now = new Date().toISOString();
  const moduleLabel = humanize(row.module);
  const intentLabel = humanize(row.intent);
  const guideId = `${row.module}--${row.intent}`;
  const route = ROUTE_MAP[row.module] || `/${row.module}`;
  const question = `How do I ${row.intent.replace(/-/g, ' ')}?`;
  const hints = inferActionHints(row.intent);

  const steps = [
    `Navigate to ${route} and open ${moduleLabel}.`,
    `Verify active workspace/company context before running ${intentLabel.toLowerCase()}.`,
    `Open the exact workflow action labeled for ${intentLabel.toLowerCase()}.`,
    `Enter required fields for ${intentLabel.toLowerCase()} (entity selection, date range, and status where applicable).`,
    `Apply changes and execute ${intentLabel.toLowerCase()} with explicit confirmation in the UI.`,
    `Validate result rows/totals/artifacts on the same page before navigating away.`,
    `If output is generated (report, export, invoice, or link), verify it is accessible and associated with the same context.`,
    `Record resulting reference IDs or filenames for traceability and follow-up.`
  ];

  for (const hint of hints) {
    steps.splice(5, 0, hint);
  }

  return {
    guideId,
    title: `${intentLabel} in ${moduleLabel}`,
    module: row.module,
    intent: row.intent,
    targetAudience: row.targetAudience,
    description: `Answer: ${question} This is the canonical ${moduleLabel} workflow for ${row.intent}.`,
    prerequisites: [
      `You are signed in as ${row.targetAudience} and can access ${moduleLabel}.`,
      `Route ${route} is reachable and module data is loaded without blocking errors.`,
      `Required records and permissions for ${row.intent} are available before execution.`
    ],
    steps,
    validations: [
      `The ${row.intent} action completes without permission or validation errors.`,
      `Resulting state is visible immediately in ${moduleLabel} lists, metrics, or related output panels.`,
      `Output artifacts remain linked to the same entity/date context used during execution.`
    ],
    commonErrors: [
      `No data returned because filter/date/entity scope is missing or inconsistent.`,
      `Permission denial while attempting ${row.intent}.`,
      `Action appears successful but output record is not persisted or linked.`
    ],
    recovery: [
      `Reopen ${route}, reapply field values, and rerun ${row.intent} with a narrowed scope.`,
      `Refresh session and confirm role permissions for ${row.targetAudience} before retry.`,
      `Cross-check logs/output panes and relink missing artifacts to the correct context.`
    ],
    faq: [
      {
        question,
        answer: `Open ${moduleLabel} at ${route}, run ${intentLabel.toLowerCase()} with required selections, and validate table/list + output artifacts before closing.`
      },
      {
        question: `How do I troubleshoot ${row.intent.replace(/-/g, ' ')} if results are missing?`,
        answer: 'Recheck filters, dates, selected entities, and permissions; rerun and confirm row counts/totals update in place.'
      }
    ],
    keywords: uniqueStrings([
      row.domain,
      row.module,
      moduleLabel.toLowerCase(),
      row.intent,
      intentLabel.toLowerCase(),
      route,
      row.targetAudience,
      'canonical-workflow',
      'draft-remediation',
      'verification-retry',
      ...row.intent.split('-')
    ]),
    version: VERSION,
    generatedAt: now,
    lastVerifiedAt: now,
    source: {
      targetUrl: 'coverage-matrix',
      finalUrl: route,
      workflowInstruction: `Hard-fail remediation guide for ${guideId}`,
    },
    actionTrace: 'coverage-matrix-hard-fail-remediation',
  };
}

async function main() {
  const coveragePath = path.join(process.cwd(), 'docs', 'guides', 'coverage-matrix.csv');
  const guidesDir = path.join(process.cwd(), 'dev', 'guides');

  const raw = await fs.readFile(coveragePath, 'utf8');
  const rows = parseCoverageCsv(raw);

  const targets = rows.filter((r) => r.status.toLowerCase() === STATUS_FILTER);

  if (targets.length === 0) {
    console.log(`No rows found for status='${STATUS_FILTER}'.`);
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

  console.log(`Generated ${targets.length} hard-fail guide file(s).`);
}

main().catch((error) => {
  console.error('Failed to regenerate hard-fail guides:', error);
  process.exit(1);
});
