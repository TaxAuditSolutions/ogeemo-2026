import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Guards for the Ogeemo Global Help & Learning Standard
 * (docs/help-standard.md), adopted from beta feedback:
 *
 *  - no permanent About buttons on ordinary work screens;
 *  - no instructional "How to Use..." panels on work screens - teaching
 *    lives in Learn Ogeemo (/learn and /learn/guides are exempt);
 *  - the HelpTip (? contextual help) component exists and opens only on
 *    user click;
 *  - hover tooltips stay behind the global Button Tips preference.
 */

const REPO_ROOT = path.join(import.meta.dirname, '..');
const APP_DIR = path.join(REPO_ROOT, 'src', 'app', '(app)');

function listTsx(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...listTsx(full));
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Work screens = the authenticated app, minus the teaching areas themselves.
// action-chips-info is a legacy guidance page still pending migration into
// Learn Ogeemo (see the migration backlog in docs/help-standard.md).
const EXEMPT_SEGMENTS = [
  `${path.sep}learn${path.sep}`,
  `${path.sep}help${path.sep}`,
  `${path.sep}action-chips-info${path.sep}`,
];

function workScreenFiles(): string[] {
  return listTsx(APP_DIR).filter((file) => !EXEMPT_SEGMENTS.some((ex) => file.includes(ex)));
}

test('no About buttons on work screens', () => {
  const offenders = workScreenFiles()
    .filter((file) => />\s*About\s*</.test(readFileSync(file, 'utf8')))
    .map((file) => path.relative(REPO_ROOT, file));
  assert.deepEqual(offenders, []);
});

test('no instructional How to Use panels on work screens', () => {
  const offenders = workScreenFiles()
    .filter((file) => /How to Use/.test(readFileSync(file, 'utf8')))
    .map((file) => path.relative(REPO_ROOT, file));
  assert.deepEqual(offenders, []);
});

test('contextual HelpTip opens only on user click', () => {
  const tip = readFileSync(
    path.join(REPO_ROOT, 'src', 'components', 'ui', 'help-tip.tsx'),
    'utf8',
  );
  assert.ok(tip.includes('PopoverTrigger'), 'HelpTip must be click-triggered (Popover)');
  assert.ok(tip.includes('learnHref'), 'HelpTip must support a Learn Ogeemo deep link');
});

test('the help standard exists and names Learn Ogeemo as the teaching home', () => {
  const doc = readFileSync(path.join(REPO_ROOT, 'docs', 'help-standard.md'), 'utf8');
  assert.ok(doc.includes('Learn Ogeemo'));
  assert.ok(doc.includes('Never') || doc.includes('never auto'), 'the standard must ban auto-opening help');
});

test('hover tooltips stay behind the global Button Tips preference', () => {
  const tooltip = readFileSync(
    path.join(REPO_ROOT, 'src', 'components', 'ui', 'tooltip.tsx'),
    'utf8',
  );
  assert.ok(tooltip.includes('showButtonTips'), 'tooltip root must honor the showButtonTips kill-switch');
});