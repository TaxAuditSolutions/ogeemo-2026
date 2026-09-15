/**
 * Reads the LIVE deployed Firestore rules and compares them with the repo's
 * firestore.rules. Run: node --env-file=.env.local --import tsx tmp/check-rules.ts
 */
import { JWT } from 'google-auth-library';
import fs from 'fs';

async function main() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string).trim().replace(/^['"]/, '').replace(/["']$/, '');
  const serviceAccount = JSON.parse(raw);
  const client = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const token = await client.getAccessToken();
  const projectId = serviceAccount.project_id;
  const headers = { Authorization: `Bearer ${token.token}` };

  const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`;
  const releases = await (await fetch(releaseUrl, { headers })).json();
  console.log('project:', projectId);
  console.log('ALL releases:', JSON.stringify(releases, null, 2).substring(0, 2000));

  const activeRuleset = 'projects/ogeemo-firebase/rulesets/f571d186-969d-4d32-8ad9-eafed337ab3a';
  const ruleset = await (await fetch(`https://firebaserules.googleapis.com/v1/${activeRuleset}`, { headers })).json();
  const content: string = (ruleset.source?.files ?? []).map((f: any) => f.content).join('\n');
  const repoRules = fs.readFileSync('firestore.rules', 'utf8');
  console.log('=== ACTIVE LIVE RULES ===');
  console.log('live length:', content.length, '| repo length:', repoRules.length, '| identical:', content.trim() === repoRules.trim());
  console.log('live has match /contacts/:', content.includes('match /contacts/'));
  console.log('live has canCreateOrgDoc:', content.includes('canCreateOrgDoc'));
  console.log('live has match /userAssistantChatSessions/:', content.includes('match /userAssistantChatSessions/'));
  console.log('=== LIVE RULES FULL ===');
  console.log(content);
  fs.writeFileSync('tmp/live-rules.txt', content);
  console.log('written to tmp/live-rules.txt for diffing');
}

main().catch((error) => {
  console.error('RULES CHECK FAILED:', error);
  process.exit(1);
});