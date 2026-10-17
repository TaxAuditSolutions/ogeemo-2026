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
 *     pill, and Trash / A-Z Sort belong to Customize My Shortcuts.
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

// Guide chapters live under Learn Ogeemo since the help-standard migration
// (docs/help-standard.md): all teaching is one library. The old version of
// this guard scanned for '/instructions' routes; the guarantees are unchanged
// - every guide uses the shared header and never hand-rolls back buttons.
function listGuidePages(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listGuidePages(full));
    } else if (entry.name === 'page.tsx') {
      files.push(full);
    }
  }
  return files;
}

const GUIDE_PAGES_DIR = path.join(REPO_ROOT, 'src', 'app', '(app)', 'learn', 'guides');

test('guide pages use a shared back-link header', () => {
  const instructionPages = listGuidePages(GUIDE_PAGES_DIR);
  assert.ok(
    instructionPages.length >= 15,
    `expected many guide pages, saw ${instructionPages.length}`,
  );
  const offenders = instructionPages
    .filter((file) => !/SectionHeader|PageHeader/.test(readFileSync(file, 'utf8')))
    .map((file) => path.relative(REPO_ROOT, file));
  assert.deepEqual(offenders, []);
});

test('guide headers do not hand-roll back buttons', () => {
  const instructionPages = listGuidePages(GUIDE_PAGES_DIR);
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

test('the welcome Get Started door matches the Learn guided path length', () => {
  const learn = readFileSync(path.join(REPO_ROOT, 'src', 'app', '(app)', 'learn', 'page.tsx'), 'utf8');
  const stepIds = [...learn.matchAll(/^    id: '([^']+)',$/gm)].map((m) => m[1]);
  const welcome = readFileSync(path.join(REPO_ROOT, 'src', 'app', '(app)', 'welcome', 'page.tsx'), 'utf8');
  const match = welcome.match(/LEARN_TOTAL = (\d+)/);
  assert.ok(match, 'welcome page must declare LEARN_TOTAL');
  assert.ok(stepIds.length > 0, 'expected Learn steps with ids');
  assert.equal(Number(match[1]), stepIds.length, 'LEARN_TOTAL must match the guided path length');
});

test('the welcome screen keeps a work-start door to My Shortcuts', () => {
  // Beta feedback: returning users need a clear "start the workday" action;
  // the old Action Chips dashboard filled this role.
  const welcome = readFileSync(path.join(REPO_ROOT, 'src', 'app', '(app)', 'welcome', 'page.tsx'), 'utf8');
  assert.ok(
    /href: '\/action-manager'/.test(welcome),
    'expected a Start Your Day door pointing at /action-manager',
  );
});

test("the welcome screen offers a one-click line to the user's workflow", () => {
  // Beta feedback: the flow from the home screen to the user's own workflow
  // must be intuitive - a line on the Start Your Day door, not a detour
  // through Make It Your Own.
  const welcome = readFileSync(path.join(REPO_ROOT, 'src', 'app', '(app)', 'welcome', 'page.tsx'), 'utf8');
  assert.ok(
    welcome.includes('href="/workflows"'),
    'expected the welcome page to link to /workflows',
  );
  assert.ok(
    /workflowLine: true/.test(welcome),
    'expected the Start Your Day door to carry the workflow line',
  );
});

test('the welcome doors collapse behind an applied workflow', () => {
  // Once the user applies a workflow (Make It Your Own -> Your workflows),
  // repeat logins go straight to the start button instead of re-prompting;
  // the choice persists in the profile. Nothing about the doors is persisted
  // locally: the old restore override could never be cleared, trapping a
  // saved standard behind the doors even after a hard reset.
  const welcome = readFileSync(path.join(REPO_ROOT, 'src', 'app', '(app)', 'welcome', 'page.tsx'), 'utf8');
  assert.ok(
    welcome.includes('activeWorkflowName'),
    'expected the doors to be gated on the applied workflow',
  );
  assert.ok(
    !welcome.includes('ogeemo-welcome-doors'),
    'expected no persisted doors override - a saved standard must win on load',
  );
  assert.ok(
    welcome.includes('Show the getting-started doors'),
    'expected a click that brings the doors back',
  );
});

test('setting a standard workflow leaves no local doors state behind', () => {
  // /workflows must not write any local doors override either - the welcome
  // view is decided purely by the profile's activeWorkflowId.
  const workflows = readFileSync(
    path.join(REPO_ROOT, 'src', 'app', '(app)', 'workflows', 'page.tsx'),
    'utf8',
  );
  assert.ok(
    !workflows.includes('ogeemo-welcome-doors') && !workflows.includes('welcome-doors'),
    'expected no doors-override writes from the workflows page',
  );
});

test('Your Day can jump straight into editing the workflow order', () => {
  // "Edit order" on Welcome deep-links to /workflows?edit=<id>, which opens
  // that workflow's editor directly - one click instead of list -> Edit.
  const welcome = readFileSync(path.join(REPO_ROOT, 'src', 'app', '(app)', 'welcome', 'page.tsx'), 'utf8');
  assert.ok(
    welcome.includes('workflows?edit='),
    'expected an Edit order deep link on Your Day',
  );
  const workflows = readFileSync(
    path.join(REPO_ROOT, 'src', 'app', '(app)', 'workflows', 'page.tsx'),
    'utf8',
  );
  assert.ok(
    workflows.includes("get('edit')"),
    'expected /workflows to honour the edit deep link',
  );
});

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

test('every page shows the last page visited via the shared back link', () => {
  const layout = readFileSync(path.join(REPO_ROOT, 'src', 'app', '(app)', 'layout.tsx'), 'utf8');
  assert.ok(layout.includes('<LastPageBack'), 'expected the app layout to render the shared last-page back link');
  const backLink = readFileSync(path.join(REPO_ROOT, 'src', 'components', 'layout', 'last-page-back.tsx'), 'utf8');
  assert.ok(backLink.includes('sessionStorage'), 'expected the previous-page trail to survive full reloads');
  assert.ok(backLink.includes('usePathname'), 'expected pathname tracking in the last-page back link');
  assert.ok(/Back to /.test(backLink), 'expected a Back to label');
  assert.ok(backLink.includes('querySelectorAll'), 'expected the universal link to defer to a page-level back link to the same place');
});

test('shared back-link headers use the outline button style', () => {
  const sectionHeader = readFileSync(path.join(REPO_ROOT, 'src', 'components', 'layout', 'section-header.tsx'), 'utf8');
  assert.ok(sectionHeader.includes('<Button'), 'SectionHeader should render its back link as a button');
  assert.ok(/Back to /.test(sectionHeader), 'SectionHeader should label its back link');
});
