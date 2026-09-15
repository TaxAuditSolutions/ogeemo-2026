/**
 * Simulates the client's contact-create write against the LIVE Firestore rules.
 * Run: node --env-file=.env.local --import tsx tmp/test-rules.ts
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
  const liveRules = fs.readFileSync('tmp/live-rules.txt', 'utf8');

  const userPath = '/databases/(default)/documents/users/PL3SyJ7IUkVjqOPBAEiJD2BVNdJ2';

  const testCase = {
    expectation: 'ALLOW',
    request: {
      pathMatch: { path: '/databases/(default)/documents/contacts/test-contact-123' },
      method: 'CREATE',
    },
    auth: {
      principalUid: 'PL3SyJ7IUkVjqOPBAEiJD2BVNdJ2',
      principalEmail: 'master@ogeemo.com',
      claims: { orgId: 'ogeemo-master', accessLevel: 'super_admin' },
    },
    functionMocks: [
      {
        function: 'get',
        args: [{ exact_value: userPath }],
        result: { value: { data: { orgId: 'ogeemo-master', accessLevel: 'super_admin' } } },
      },
      {
        function: 'exists',
        args: [{ exact_value: userPath }],
        result: { value: true },
      },
    ],
    resource: {
      data: {
        name: 'Joe Blow',
        email: 'joe@gmail.com',
        folderId: 'IoiZwSJkP6EFba6S31pO',
        orgId: 'ogeemo-master',
        userId: 'PL3SyJ7IUkVjqOPBAEiJD2BVNdJ2',
        keywords: ['joe blow', 'joe', 'blow'],
      },
    },
  };

  const body = {
    source: { files: [{ name: 'firestore.rules', content: liveRules }] },
    testSuite: { testCases: [testCase] },
  };

  const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.token}` },
    body: JSON.stringify(body),
  });
  const result = await res.json();
  console.log('=== RULES TEST (master tenant user, contact create) ===');
  console.log(JSON.stringify(result, null, 2).substring(0, 3000));
}

main().catch((error) => {
  console.error('RULES TEST FAILED:', error);
  process.exit(1);
});