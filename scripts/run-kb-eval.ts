// Co-Pilot knowledge-base golden-question eval (docs/agent-knowledge-eval.md).
//
// Runs the REAL ogeemoAgentFlow - same system prompt, knowledge loader, tools
// and model as production - then a human grades the output against the table
// in the eval doc. Costs a handful of Gemini calls; run after any change to
// src/ai/knowledge/ or the agent prompt.
//
// Safety: admin credentials are STRIPPED so no tool can write to production
// (createTask simulates, searchContacts degrades gracefully).
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.join(import.meta.dirname, '..');
const envPath = path.join(repoRoot, '.env.local');
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
        if (m && !(m[1] in process.env)) {
            process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
        }
    }
}
delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
delete process.env.SERVICE_ACCOUNT_KEY;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS; // hermetic: never pick up ambient creds

const QUESTIONS: string[] = [
    'Where do I find Time Logs?',
    'How do I log time after the fact?',
    'How do I create a quote?',
    'What can you actually do for me?',
    'Show me my unbilled hours',
    'How do I add a contact?',
    'Start a timer',
    'What is BKS?',
    'How do workflows work?',
    'Who is Dan?',
];

async function main() {
    const { ogeemoAgent } = await import('../src/ai/flows/ogeemo-chat');

    const results: Array<{ q: string; a?: string; error?: string }> = [];
    for (const q of QUESTIONS) {
        process.stdout.write(`Q: ${q}\n`);
        try {
            const out = await ogeemoAgent({
                message: q,
                history: [],
                clientUserId: 'kb-eval-user',
                runtimeContext: { userId: 'kb-eval-user', currentPath: '/event-manager' },
            });
            results.push({ q, a: out.reply });
            process.stdout.write(`A: ${out.reply}\n---\n`);
        } catch (e: any) {
            results.push({ q, error: e?.message ?? String(e) });
            process.stdout.write(`ERROR: ${e?.message}\n---\n`);
        }
    }

    const md = results
        .map((r, i) => `## Q${i + 1}: ${r.q}\n\n${r.error ? `**ERROR:** ${r.error}` : r.a}\n`)
        .join('\n');
    const outDir = path.join(repoRoot, 'scratch');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'kb-eval-results.md'), md, 'utf-8');
    const errors = results.filter((r) => r.error).length;
    console.log(
        `DONE: ${results.length} questions, ${errors} errors. Grade scratch/kb-eval-results.md against docs/agent-knowledge-eval.md`,
    );
    process.exit(errors > 0 ? 1 : 0);
}

main().catch((e) => {
    console.error('EVAL FAILED:', e);
    process.exit(1);
});

