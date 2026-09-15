/**
 * Replays the EXACT failing request: full thread history + the John Test
 * message, against the live capability flow with the real master-org folders.
 * Run: node --env-file=.env.local --import tsx tmp/replay-john-test.ts
 */
import { orchestrateContactCapability } from '../src/ai/flows/ogeemo-chat';
import fs from 'fs';

const masterFolders = [
  { id: '3tGjBKFhMAVmukDv1tmx', name: 'Miscellaneous' },
  { id: 'AmtuXpihnfoNWsCTHYaR', name: 'Clients' },
  { id: 'Dmtiq4NZpMDptxMhxtoK', name: 'Admin' },
  { id: 'IoiZwSJkP6EFba6S31pO', name: 'Friends' },
  { id: 'K9E0CFLHM4GOfu0ZPAq8', name: 'Employees' },
  { id: 'OFcy0LvHEcByjcmgsuG0', name: 'Contractors' },
  { id: 'VA5VTYR9tI7Vo3LrDMtg', name: 'Suppliers' },
  { id: 'ZMiwIVQWmOHFprnZKNDv', name: 'Family' },
  { id: 'cbgNiru297tA27Cs9JCl', name: 'Workers' },
  { id: 'tqjd4byr0yLGOsuU30gI', name: 'Prospects' },
];

async function main() {
  const messages = JSON.parse(fs.readFileSync('tmp/john-test-thread.json', 'utf8'));
  const johnIdx = messages.findIndex((m: any) => String(m.content).includes('John Test'));
  const history = messages.slice(0, johnIdx + 1).map((m: any) => ({ role: m.role, content: m.content }));
  const message = String(messages[johnIdx].content);
  console.log('history length:', history.length, '| first role:', history[0].role, '| message:', message);

  const result = await orchestrateContactCapability({
    message,
    history,
    userId: 'PL3SyJ7IUkVjqOPBAEiJD2BVNdJ2',
    orgId: 'ogeemo-master',
    accessLevel: 'super_admin',
    folders: masterFolders,
  });
  console.log('=== CAPABILITY RESULT ===');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('REPLAY FAILED:', error);
  process.exit(1);
});