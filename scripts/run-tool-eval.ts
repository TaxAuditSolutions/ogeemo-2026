// Co-Pilot tool-choice eval (src/ai/tool-eval-cases.ts, docs/agent-knowledge-eval.md).
//
// Runs every case through the REAL ogeemoAgentFlow - same system prompt, knowledge, tools and model as production - and
// grades which tool the model reaches for FIRST (and which it must never call). Costs one Gemini call or more per case.
//
// Safety: admin credentials are STRIPPED, so no tool can read or write real data (a tool that is called simply reports
// that the database is unavailable). That is why only the first call is graded.
//
// Usage: npm run kb:tools                 (all cases)
//        npm run kb:tools -- viewer-todo   (only cases whose id contains the text)
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.join(import.meta.dirname, '..');
const envPath = path.join(repoRoot, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
delete process.env.SERVICE_ACCOUNT_KEY;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;


function readRuns(): number {
  const at = process.argv.indexOf('--runs');
  const n = at >= 0 ? Number(process.argv[at + 1]) : 1;
  return Number.isInteger(n) && n >= 1 && n <= 20 ? n : 1;
}

async function main() {
  const { ogeemoAgent } = await import('../src/ai/flows/ogeemo-chat');
  const { TOOL_EVAL_CASES } = await import('../src/ai/tool-eval-cases');
  const { classifyRate, rateToolChoice } = await import('../src/ai/tool-eval');

  const runs = readRuns();
  const only = process.argv.slice(2).filter((arg, i) => !arg.startsWith('-') && process.argv[i + 1] !== '--runs');
  const cases = TOOL_EVAL_CASES.filter((c) => only.length === 0 || only.some((text) => c.id.includes(text)));
  if (cases.length === 0) throw new Error(`No case matches ${only.join(', ')}`);

  const lines: string[] = [];
  let stable = 0;
  let errors = 0;
  const notStable: string[] = [];

  for (const testCase of cases) {
    const calls: string[][] = [];
    let failedWith = '';
    for (let i = 0; i < runs; i += 1) {
      try {
        const out = await ogeemoAgent({
          message: testCase.say,
          history: testCase.history ?? [],
          runtimeContext: { userId: 'tool-eval-user', orgId: 'tool-eval-org', accessLevel: testCase.role, isMasterTenant: false, currentPath: '/co-pilot', timeZone: 'America/Toronto' },
        });
        calls.push(out.toolsCalled ?? []);
      } catch (e: any) {
        failedWith = e?.message ?? String(e);
        break;
      }
    }
    if (failedWith) {
      errors += 1;
      const line = `ERROR ${testCase.id}: ${failedWith}`;
      process.stdout.write(`${line}\n`);
      lines.push(`- ${line}`);
      continue;
    }

    const rate = rateToolChoice(testCase, calls);
    const kind = classifyRate(rate);
    if (kind === 'stable') stable += 1;
    else notStable.push(testCase.id);
    const first = calls[0] ?? [];
    const shown = runs === 1 ? `-> ${first.join(', ') || 'no tool'}` : `${rate.passes}/${rate.runs}`;
    const why = rate.failedCalls.length > 0 ? `   (failing runs called: ${[...new Set(rate.failedCalls.map((c) => c.join('+') || 'no tool'))].join(' | ')})` : '';
    const label = kind === 'stable' ? 'PASS ' : kind === 'flaky' ? 'FLAKY' : 'FAIL ';
    const line = `${label} ${testCase.id.padEnd(22)} [${testCase.role}] "${testCase.say}" ${shown}${why}`;
    process.stdout.write(`${line}\n`);
    lines.push(`- ${line}`);
  }

  const total = cases.length - errors;
  console.log(`\n${stable}/${total} cases stable over ${runs} run${runs === 1 ? '' : 's'} each${errors ? `, ${errors} errored (not graded)` : ''}.`);

  const outDir = path.join(repoRoot, 'scratch');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'tool-eval-results.md'), `# Tool-choice eval\n\n${stable}/${total} stable over ${runs} run(s) each\n\n${lines.join('\n')}\n`, 'utf-8');

  process.exit(notStable.length > 0 || errors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('TOOL EVAL FAILED:', e);
  process.exit(1);
});
