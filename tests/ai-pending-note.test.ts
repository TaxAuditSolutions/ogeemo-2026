import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { pendingPreviewNote } from '../src/lib/ai-pending-note';

const NOW = new Date('2026-11-11T15:00:00Z');
const move = {
  orgId: 'orgA', eventId: 'U1MQfLOPSBX7y8EAotDe', action: 'move', fromStart: Date.parse('2026-11-12T19:00:00Z'), fromEnd: Date.parse('2026-11-12T19:30:00Z'),
  toStart: Date.parse('2026-11-12T20:00:00Z'), toEnd: Date.parse('2026-11-12T20:30:00Z'), allowDoubleBooking: false, createdAt: NOW.getTime() - 60_000,
};

test('a waiting move is stated exactly, with the id and the new times the server saved', () => {
  const note = pendingPreviewNote(move, 'orgA', NOW);
  assert.match(note, /U1MQfLOPSBX7y8EAotDe/);
  assert.match(note, /"action":"move"/);
  assert.match(note, /"startTime":"2026-11-12T20:00:00.000Z"/);
  assert.match(note, /"endTime":"2026-11-12T20:30:00.000Z"/);
  assert.doesNotMatch(note, /allowDoubleBooking/);
});

test('a waiting cancel is stated exactly', () => {
  const note = pendingPreviewNote({ ...move, action: 'cancel', toStart: null, toEnd: null }, 'orgA', NOW);
  assert.match(note, /"action":"cancel"/);
  assert.match(note, /U1MQfLOPSBX7y8EAotDe/);
});

test('a waiting contact change names the contact and tells the model to repeat what it previewed', () => {
  const note = pendingPreviewNote({ kind: 'contact', orgId: 'orgA', contactId: 'c1abcdef', patch: 'cellPhone=555-0199', before: '', allowDuplicate: false, createdAt: NOW.getTime() - 1000 }, 'orgA', NOW);
  assert.match(note, /contactId exactly "c1abcdef"/);
  assert.match(note, /updateContact/);
});

test('an allowed overlap is carried through, and only when it was allowed', () => {
  assert.match(pendingPreviewNote({ ...move, allowDoubleBooking: true }, 'orgA', NOW), /"allowDoubleBooking":true/);
});

test('nothing is said when there is nothing safe to say', () => {
  assert.equal(pendingPreviewNote(undefined, 'orgA', NOW), '');
  assert.equal(pendingPreviewNote(null, 'orgA', NOW), '');
  assert.equal(pendingPreviewNote('x', 'orgA', NOW), '');
  assert.equal(pendingPreviewNote(move, undefined, NOW), '', 'no workspace');
  assert.equal(pendingPreviewNote(move, 'orgB', NOW), '', "another workspace's preview is never used");
  assert.equal(pendingPreviewNote({ ...move, createdAt: NOW.getTime() - 11 * 60_000 }, 'orgA', NOW), '', 'stale');
  assert.equal(pendingPreviewNote({ ...move, createdAt: NOW.getTime() + 5 * 60_000 }, 'orgA', NOW), '', 'from the future');
  assert.equal(pendingPreviewNote({ ...move, createdAt: undefined }, 'orgA', NOW), '');
  assert.equal(pendingPreviewNote({ ...move, action: 'delete' }, 'orgA', NOW), '', 'unknown action');
  assert.equal(pendingPreviewNote({ ...move, toStart: null }, 'orgA', NOW), '', 'a move with no new time');
});

test('an id that is not a plain record id is never put in front of the model', () => {
  for (const eventId of ['../x', 'a b', 'x"; drop', '', 42, 'a'.repeat(129)]) {
    assert.equal(pendingPreviewNote({ ...move, eventId }, 'orgA', NOW), '', String(eventId));
  }
  assert.equal(pendingPreviewNote({ kind: 'contact', orgId: 'orgA', contactId: 'bad id', createdAt: NOW.getTime() }, 'orgA', NOW), '');
});

test('the wiring: it is read only on a plain yes to a preview, and added to the instructions the model sees', () => {
  const flow = fs.readFileSync('src/ai/flows/ogeemo-chat.ts', 'utf8');
  assert.match(flow, /if \(isConfirmingPreview\(history, message\) && runtimeContext\?\.userId\)/);
  assert.match(flow, /pendingPreviewNote\(saved\?\.data\(\), runtimeContext\.orgId\)/);
  assert.match(flow, /limits, waiting\]\.filter\(Boolean\)/);
});
