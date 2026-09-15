/**
 * Live validation of the contact capability retry fix.
 * Replays the exact conversation that failed in the user's Co-Pilot chat:
 *   1. "Make a contact for Nick Illiopoulos ..." -> clarifying question
 *   2. "prepare it" -> should now return open_contact_form via the retry path
 * Run: node --env-file=.env.local --import tsx tmp/test-capability.ts
 */
import { orchestrateContactCapability } from '../src/ai/flows/ogeemo-chat';

async function main() {
  const folders = [
    { id: 'clients', name: 'Clients' },
    { id: 'friends', name: 'Friends' },
  ];

  const turn1 = await orchestrateContactCapability({
    message: 'create a new contact for Joe Blow, emai address is joe@gmail.com',
    history: [],
    userId: 'dev-validation-user',
    orgId: undefined,
    accessLevel: 'org_admin',
    folders,
  });
  console.log('=== TURN 1 (Joe Blow, direct request) ===');
  console.log(JSON.stringify(turn1, null, 2));

  if (!turn1.action) {
    const turn1b = await orchestrateContactCapability({
      message: 'it is in the friends folder',
      history: [
        { role: 'user', content: 'create a new contact for Joe Blow, emai address is joe@gmail.com' },
        { role: 'model', content: turn1.reply },
      ],
      userId: 'dev-validation-user',
      orgId: undefined,
      accessLevel: 'org_admin',
      folders,
    });
    console.log('=== TURN 1b (folder answer) ===');
    console.log(JSON.stringify(turn1b, null, 2));
  }

  const turn2 = await orchestrateContactCapability({
    message: 'prepare it',
    history: [
      { role: 'user', content: 'Make a contact for Nick Illiopoulos email address of nick@ogeemo.com' },
      { role: 'model', content: 'I can help with that. Do you want step-by-step instructions, or would you like me to prepare the form for you?' },
    ],
    userId: 'dev-validation-user',
    orgId: undefined,
    accessLevel: 'org_admin',
    folders,
  });
  console.log('=== TURN 2 (Nick regression: prepare it) ===');
  console.log(JSON.stringify(turn2, null, 2));

  const turn3 = await orchestrateContactCapability({
    message: 'create a contact for Jane Roe, email jane@gmail.com, it is in the friends folder',
    history: [],
    userId: 'dev-validation-user',
    orgId: undefined,
    accessLevel: 'org_admin',
    folders,
  });
  console.log('=== TURN 3 (folder wording match) ===');
  console.log(JSON.stringify(turn3, null, 2));
}

main().catch((error) => {
  console.error('VALIDATION FAILED:', error);
  process.exit(1);
});