// Side-by-side, human-graded comparison. Admin credentials are stripped so the
// operational Co-Pilot cannot write and the new assistant uses source fallback.
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.join(import.meta.dirname, '..');
const envPath = path.join(repoRoot, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}
delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
delete process.env.SERVICE_ACCOUNT_KEY;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

const QUESTIONS = [
  'How does Next free slot choose a time?',
  'How do I give an activity no set time?',
  'What happens when I change the assignee?',
  'What is the difference between Save and Save & New?',
  'Why did my unfinished calendar item turn amber?',
  'How do I reopen a completed calendar item?',
  'How do I create an entry from a calendar time slot?',
  'How do I switch the sidebar to Favorites?',
  'How do Workflows affect the sidebar Workspace group?',
  'What can the Knowledge Base beta do?',
  'Show me my next appointment',
  'How do I change the colour of the moon in Ogeemo?',
  'How do I add a contact?',
  'Where do new contacts go if I do not choose a folder?',
  'What happens when I delete a contact folder?',
  'How do I start a project from a contact?',
  'What does the consolidated Client Record show?',
  'When is a contact document folder created?',
  'Why can I not see payroll fields on my contact?',
  'How do I create a project from a template?',
  'How do I change a project status on the board?',
  'What happens to tasks when I delete a project?',
  'How do I add steps in the project planner?',
  'How do I start and pause a timer?',
  'Which time can be billed?',
  'How do I turn my billable hours into an invoice?',
  'How does payroll calculate hours worked?',
  'How do I set my pay schedule, and what dates will each pay period use?',
  'How do I change the payroll deduction rate from 20%?',
  'How do I turn an approved quote into an invoice, and what carries over?',
  'When does an invoice show as overdue, and how do I post a payment?',
  'How do I work out and record the sales tax I owe for a quarter?',
  'How do I reconcile a bank statement, and what stops a row being posted twice?',
  'How is the CCA I can claim on an asset worked out?',
  'How do I post a receipt to the ledger, and what does Audit-ready mode change?',
  'Show me my unbilled hours',
  'What is a standard workflow?',
  'Which template workflows are available?',
  'Why is my sidebar not following my workflow?',
];

async function main() {
  const [{ knowledgeBaseChat }, { ogeemoAgent }] = await Promise.all([
    import('../src/ai/flows/knowledge-base-chat'),
    import('../src/ai/flows/ogeemo-chat'),
  ]);
  const sections: string[] = [];
  let errors = 0;
  for (const question of QUESTIONS) {
    process.stdout.write(`Comparing: ${question}\n`);
    const [current, beta] = await Promise.allSettled([
      ogeemoAgent({ message: question, history: [], clientUserId: 'knowledge-compare', runtimeContext: { currentPath: '/knowledge-base' } }),
      knowledgeBaseChat({ message: question, history: [], currentPath: '/knowledge-base' }),
    ]);
    if (current.status === 'rejected' || beta.status === 'rejected') errors++;
    sections.push(`## ${question}\n\n### Existing Co-Pilot\n\n${current.status === 'fulfilled' ? current.value.reply : `ERROR: ${current.reason}`}\n\n### Knowledge Base beta\n\n${beta.status === 'fulfilled' ? beta.value.reply : `ERROR: ${beta.reason}`}\n\n### Beta sources\n\n${beta.status === 'fulfilled' ? beta.value.citations.map((source) => `- ${source.title} (${source.id})`).join('\n') || '- None' : '- Unavailable'}\n`);
  }
  const output = `# Co-Pilot / Knowledge Base comparison\n\nGrade for factual accuracy, complete steps, correct routes, uncertainty, and usefulness. Generated ${new Date().toISOString()}.\n\n${sections.join('\n')}`;
  fs.mkdirSync(path.join(repoRoot, 'scratch'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'scratch', 'knowledge-base-comparison.md'), output);
  console.log(`Wrote scratch/knowledge-base-comparison.md (${QUESTIONS.length} questions, ${errors} errors).`);
  if (errors) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exit(1); });
