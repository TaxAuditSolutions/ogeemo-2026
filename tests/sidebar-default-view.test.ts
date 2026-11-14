import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (...p: string[]) => readFileSync(path.join(root, ...p), 'utf8');

test('the sidebar has a Save button that stores the shown view as the default (regression: it was removed)', () => {
  const menu = read('src', 'components', 'layout', 'main-menu.tsx');
  // Saves the same preference Settings > Sidebar Layout writes and the
  // SidebarViewProvider reads on the next visit.
  assert.match(menu, /updatePreferences\(\{ defaultSidebarView: view \}\)/);
  assert.match(menu, /onClick=\{handleSetDefaultView\}/);
  // It sits in the top row beside the view buttons, before the pin control.
  assert.ok(menu.indexOf('onClick={handleSetDefaultView}') < menu.indexOf('onClick={togglePinned}'));
  // The provider restores the saved default.
  const ctx = read('src', 'context', 'sidebar-view-context.tsx');
  assert.match(ctx, /setView\(preferences\.defaultSidebarView \|\| 'grouped'\)/);
  const settings = read('src', 'app', '(app)', 'settings', 'page.tsx');
  assert.match(settings, /updatePreferences\(\{ defaultSidebarView: value \}\)/);
});
