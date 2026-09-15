/**
 * End-to-end replication of the client's contact-create write:
 * mints a custom token for the session user (same claims), exchanges it for an
 * ID token, and performs the Firestore REST create exactly like the client SDK
 * does — evaluated against the LIVE rules with REAL auth.
 * Run: node --env-file=.env.local --import tsx tmp/test-write.ts
 */
import { getAdminAuth, getAdminDb } from '../src/core/firebase-admin';

async function main() {
  const uid = 'PL3SyJ7IUkVjqOPBAEiJD2BVNdJ2';
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string;
  const projectId = 'ogeemo-firebase';

  const customToken = await getAdminAuth()!.createCustomToken(uid, {
    orgId: 'ogeemo-master',
    accessLevel: 'super_admin',
  });

  const signInRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) },
  );
  const signIn = await signInRes.json();
  if (!signIn.idToken) {
    console.log('SIGN-IN FAILED:', JSON.stringify(signIn));
    return;
  }
  console.log('signed in as uid:', signIn.localId);

  const writeRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/contacts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${signIn.idToken}` },
      body: JSON.stringify({
        fields: {
          name: { stringValue: 'RULES TEST CONTACT (safe to delete)' },
          email: { stringValue: 'rules-test@ogeemo.com' },
          folderId: { stringValue: 'IoiZwSJkP6EFba6S31pO' },
          orgId: { stringValue: 'ogeemo-master' },
          userId: { stringValue: uid },
        },
      }),
    },
  );
  const writeResult = await writeRes.json();
  console.log('WRITE STATUS:', writeRes.status);
  console.log('WRITE RESULT:', JSON.stringify(writeResult).substring(0, 800));

  if (writeRes.ok && writeResult.name) {
    const docId = writeResult.name.split('/').pop()!;
    await getAdminDb()!.collection('contacts').doc(docId).delete();
    console.log('cleaned up test doc:', docId);
  }
}

main().catch((error) => {
  console.error('WRITE TEST FAILED:', error);
  process.exit(1);
});