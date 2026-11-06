import assert from 'node:assert/strict';
import test from 'node:test';
import { isSessionError } from '../src/lib/server-session';

test('recognises the server session errors that a fresh cookie can fix', () => {
  assert.equal(isSessionError(new Error('Unauthorized: No session cookie found.')), true);
  assert.equal(isSessionError(new Error('Unauthorized: Invalid session cookie.')), true);
  assert.equal(isSessionError('Unauthorized: No session cookie found.'), true);
});

test('does not treat other errors as session errors', () => {
  assert.equal(isSessionError(new Error('Unauthorized: Your session has no active workspace.')), false);
  assert.equal(isSessionError(new Error('Receipt not found.')), false);
  assert.equal(isSessionError(undefined), false);
  assert.equal(isSessionError(null), false);
});
