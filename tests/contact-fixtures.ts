/** Shared setup for the contact-update tests. Test helper only. */
import { readToolContext } from '../src/lib/ai-runtime';
import { buildContactUpdate, type CurrentContact } from '../src/lib/ai-contact-update';
import assert from 'node:assert/strict';

/** Wednesday 11 Nov 2026, 10:00 in Toronto (15:00 UTC). */
export const NOW = new Date('2026-11-11T15:00:00Z');
export const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

export const folders = [
  { id: 'fMisc', name: 'Miscellaneous', isSystem: true },
  { id: 'fClients', name: 'Clients' },
  { id: 'fEmp', name: 'Employees', isSystem: true },
  { id: 'fCon', name: 'Contractors', isSystem: true },
];

export const dana: CurrentContact = { name: 'Dana Whitfield', email: 'dana@acme.com', folderId: 'fClients', folderName: 'Clients', cellPhone: '(705) 555-0142', businessName: 'Acme', city: '' };
export const worker: CurrentContact = { name: 'Sam Worker', email: 'sam@x.com', folderId: 'fEmp', folderName: 'Employees' };

export const plan = (input: any, current = dana) => {
  const result = buildContactUpdate({ contactId: 'c1', ...input }, current, folders);
  assert.equal(result.ok, true, JSON.stringify(result));
  return (result as any).plan;
};

export const refused = (input: any, current = dana) => {
  const result = buildContactUpdate({ contactId: 'c1', ...input }, current, folders);
  assert.equal(result.ok, false, JSON.stringify(input));
  return (result as any).error as string;
};

/** A workspace with a few contacts, folders and a pending-changes collection. */
export const seed = () => ({
  users: { u1: {}, u2: {} },
  contactFolders: {
    fMisc: { orgId: 'orgA', name: 'Miscellaneous', isSystem: true },
    fClients: { orgId: 'orgA', name: 'Clients' },
    fEmp: { orgId: 'orgA', name: 'Employees', isSystem: true },
    fCon: { orgId: 'orgA', name: 'Contractors', isSystem: true },
    fOther: { orgId: 'orgB', name: 'Other Workspace Folder' },
  },
  contacts: {
    c1: { orgId: 'orgA', name: 'Dana Whitfield', email: 'dana@acme.com', folderId: 'fClients', cellPhone: '(705) 555-0142', businessName: 'Acme', notes: 'KEEP THESE NOTES', sin: '046454286', keywords: ['dana'] },
    c2: { orgId: 'orgA', name: 'Daniel Okafor', email: 'dan@okafor.ca', folderId: 'fClients' },
    cWorker: { orgId: 'orgA', name: 'Sam Worker', email: 'sam@x.com', folderId: 'fEmp', userId: 'u9', documentFolderId: 'doc1' },
    cElsewhere: { orgId: 'orgB', name: 'Sam Elsewhere', email: 'sam@else.com', folderId: 'fOther' },
  },
  aiPendingChanges: {},
});

export const ctx = (userId: string, accessLevel?: string) => readToolContext({ userId, orgId: 'orgA', accessLevel, timeZone: 'America/Toronto' });
export const editor = ctx('u1', 'editor');
export const change = (over: Record<string, any> = {}) => ({ contactId: 'c1', cellPhone: '555-0199', ...over });
