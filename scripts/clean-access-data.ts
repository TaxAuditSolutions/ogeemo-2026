// Cleans up stale access and reference data left by earlier bugs.
//
//   npm run access:cleanup                          report only (read-only, every workspace)
//   npm run access:cleanup -- --apply <step> ...    do the named steps (each one backs up what it changes first)
//
// Steps (nothing runs unless named):
//   revoke-stale-accounts    people who were removed but still hold a workspace role: clear the claim, end sessions
//   delete-dead-memberships  memberships in workspaces that no longer exist
//   repair-references        a worker id holding a sign-in id becomes that person's contact; a task's vanished client is cleared
//   delete-empty-identities  login-less profiles and completely empty workspaces nobody can use
//   grant-owner-access       a workspace with data and no Super Admin: make its recorded owner (who can sign in) the Super Admin
//   delete-unscoped-files    folders and files with no workspace that nothing uses (Cloud Storage uploads are left in place)
//
// Never touched, only listed: invoiced or paid records, records with no workspace, workspaces that still hold data.
// Every change is first written to scratch/access-cleanup-backup-<time>.json.
import fs from 'node:fs';
import path from 'node:path';
import { gather } from './clean-access-gather';
import { buildPlan, printReport } from './clean-access-plan';
import { STEPS, applyPlan, type Step } from './clean-access-apply';

const repoRoot = path.join(import.meta.dirname, '..');
const envPath = path.join(repoRoot, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const applyAt = args.indexOf('--apply');
  const requested = applyAt >= 0 ? (args.slice(applyAt + 1).filter((a) => !a.startsWith('--')) as Step[]) : [];
  for (const step of requested) if (!STEPS.includes(step)) throw new Error(`Unknown step "${step}". Steps: ${STEPS.join(', ')}`);
  if (applyAt >= 0 && requested.length === 0) throw new Error(`--apply needs at least one step: ${STEPS.join(', ')}`);

  const plan = await buildPlan(await gather());
  printReport(plan);
  if (applyAt < 0) {
    console.log('\nReport only. Nothing was changed. To act, name the steps: npm run access:cleanup -- --apply <step> [<step> ...]');
    return;
  }
  await applyPlan(plan, requested, repoRoot);
  console.log('\nDone. Run the report again to confirm.');
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
