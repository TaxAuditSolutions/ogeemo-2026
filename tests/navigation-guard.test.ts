import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { allMenuItems, type MenuItem } from '../src/lib/menu-items';

/**
 * Navigation contract for the global-navigation hierarchy (beta feedback:
 * "one predictable map"). Guards the rules the redesign established:
 *
 *  1. allMenuItems is the single map - no duplicate destinations.
 *  2. Sidebar groups only reference destinations that exist in the map.
 *     (groupedMenuItems is source-parsed from main-menu.tsx because that
 *     module pulls in React/Firebase, which must not load under node:test.)
 *  3. Retired entries stay retired: Logout lives in the account menu, the
 *     logo replaces Ogeemo Web, AI Co-Pilot's one global entry is the header
 *     pill, and Trash / A-Z Sort belong to Action Manager Settings.
 *  4. Guidance is Help-only: no instruction pages in the sidebar menu.
 *  5. Every menu destination resolves to a real page file.
 *
 * Chips are not covered here: ActionChipMenu already resolves each chip's
 * icon and label from this canonical list at render time.
 */

const REPO_ROOT = path.join(import.meta.dirname, '..');

const FORBIDDEN_HREFS = [
  '/logout',
  '/',
  '/co-pilot',
  '/action-chips-info',
  '/a-z-sort',
  '/action-manager/trash',
];

function menuHrefs(items: MenuItem[]): string[] {
  return items.map((item) => item.href);
}

function groupedHrefs(): string[] {
  const source = readFileSync(path.join(REPO_ROOT, 'src', 'components', 'layout', 'main-menu.tsx'), 'utf8');
  const start = source.indexOf('export const groupedMenuItems');
  assert.notEqual(start, -1, 'groupedMenuItems export not found in main-menu.tsx');
  const end = source.indexOf('\n};', start);
  assert.notEqual(end, -1, 'end of groupedMenuItems not found in main-menu.tsx');
  const segment = source.slice(start, end);
  return [...segment.matchAll(/'(\/[^']+)'/g)].map((match) => match[1]);
}

test('the sidebar map has no duplicate destinations', () => {
  const hrefs = menuHrefs(allMenuItems);
  const duplicates = hrefs.filter((href, index) => hrefs.indexOf(href) !== index);
  assert.deepEqual(duplicates, []);
});

test('retired entries are not in the sidebar menu', () => {
  const hrefs = menuHrefs(allMenuItems);
  for (const retired of FORBIDDEN_HREFS) {
    assert.ok(!hrefs.includes(retired), `${retired} must not be in the sidebar menu`);
  }
  const labels = allMenuItems.map((item) => item.label);
  assert.ok(!labels.includes('Ogeemo Web'), 'Ogeemo Web label must not be in the sidebar menu');
});

test('guidance pages are reachable only through Help', () => {
  const offenders = menuHrefs(allMenuItems).filter((href) => href.includes('instructions'));
  assert.deepEqual(offenders, []);
});

test('sidebar groups only reference destinations in the map', () => {
  const hrefs = new Set(menuHrefs(allMenuItems));
  const missing = groupedHrefs().filter((href) => !hrefs.has(href));
  assert.deepEqual(missing, []);
});

test('every menu destination resolves to a page', () => {
  const missing: string[] = [];
  for (const item of allMenuItems) {
    if (item.href === '/' || item.href.startsWith('http')) continue;
    const clean = item.href.split('?')[0];
    const direct = path.join(REPO_ROOT, 'src', 'app', `${clean}/page.tsx`);
    const inAppRouteGroup = path.join(REPO_ROOT, 'src', 'app', '(app)', `${clean}/page.tsx`);
    if (!existsSync(direct) && !existsSync(inAppRouteGroup)) {
      missing.push(item.href);
    }
  }
  assert.deepEqual(missing, []);
});

function listInstructionPages(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listInstructionPages(full));
    } else if (entry.name === 'page.tsx' && full.includes('instructions')) {
      files.push(full);
    }
  }
  return files;
}

test('instruction pages use a shared back-link header', () => {
  const instructionPages = listInstructionPages(path.join(REPO_ROOT, 'src', 'app'));
  assert.ok(
    instructionPages.length >= 15,
    `expected many instruction pages, saw ${instructionPages.length}`,
  );
  const offenders = instructionPages
    .filter((file) => !/SectionHeader|PageHeader/.test(readFileSync(file, 'utf8')))
    .map((file) => path.relative(REPO_ROOT, file));
  assert.deepEqual(offenders, []);
});

test('instruction headers do not hand-roll back buttons', () => {
  const instructionPages = listInstructionPages(path.join(REPO_ROOT, 'src', 'app'));
  const offenders = instructionPages
    .filter((file) =>
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .slice(0, 40)
        .some((line) => line.includes('Back to ')),
    )
    .map((file) => path.relative(REPO_ROOT, file));
  assert.deepEqual(offenders, []);
});

function homeScreenHrefs(): string[] {
  const files = [
    path.join(REPO_ROOT, 'src', 'app', '(app)', 'welcome', 'page.tsx'),
    path.join(REPO_ROOT, 'src', 'components', 'welcome', 'current-work-panel.tsx'),
  ];
  const hrefs = new Set<string>();
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/href(?:=|:\s*)["']([^"'$]+)["']/g)) {
      hrefs.add(match[1]);
    }
  }
  return [...hrefs];
}

test('every home-screen pathway resolves to a page', () => {
  const hrefs = homeScreenHrefs();
  assert.ok(
    hrefs.length >= 6,
    `expected many home pathways, saw ${hrefs.length}: ${hrefs.join(', ')}`,
  );
  const missing: string[] = [];
  for (const href of hrefs) {
    if (href.startsWith('http')) continue;
    const clean = href.split('?')[0];
    if (!clean || clean === '/') continue;
    const direct = path.join(REPO_ROOT, 'src', 'app', `${clean}/page.tsx`);
    const inAppRouteGroup = path.join(REPO_ROOT, 'src', 'app', '(app)', `${clean}/page.tsx`);
    if (!existsSync(direct) && !existsSync(inAppRouteGroup)) {
      missing.push(href);
    }
  }
  assert.deepEqual(missing, []);
});

test('the app header links back to the previous page', () => {
  const layout = readFileSync(path.join(REPO_ROOT, 'src', 'app', '(app)', 'layout.tsx'), 'utf8');
  assert.ok(layout.includes('usePathname'), 'expected pathname tracking in the app layout');
  assert.ok(layout.includes('previousPath'), 'expected previous-page state in the app layout');
  assert.ok(/Back to /.test(layout), 'expected a Back to link in the app header');
  assert.ok(layout.includes('sessionStorage'), 'expected the previous-page trail to survive full reloads');
});
