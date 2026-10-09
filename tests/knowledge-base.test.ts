import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { allMenuItems } from '../src/lib/menu-items';

const kbDir = path.join(process.cwd(), 'src', 'ai', 'knowledge');
const readKb = (name: string) => fs.readFileSync(path.join(kbDir, name), 'utf-8');

test('knowledge directory contains exactly the four canonical files', () => {
    const files = fs.readdirSync(kbDir).sort();
    assert.deepEqual(files, [
        '01_platform_identity.md',
        '02_ui_navigation_map.json',
        '03_operational_qna.md',
        '04_tool_definitions.json',
    ]);
});

test('every documented route exists in the menu with the exact label', () => {
    const nav = JSON.parse(readKb('02_ui_navigation_map.json'));
    const routes = nav.modules.map((m: any) => m.route);
    assert.equal(new Set(routes).size, routes.length, 'duplicate routes in nav map');
    for (const m of nav.modules) {
        const item = allMenuItems.find((i) => i.href === m.route);
        assert.ok(item, `unknown route in nav map: ${m.route}`);
        assert.equal(m.label, item.label, `label drift for ${m.route}: menu='${item.label}' kb='${m.label}'`);
    }
});

test('every menu destination is documented (no silent sidebar additions)', () => {
    const nav = JSON.parse(readKb('02_ui_navigation_map.json'));
    const documented = new Set(nav.modules.map((m: any) => m.route));
    for (const item of allMenuItems) {
        assert.ok(documented.has(item.href), `route missing from nav map: ${item.href} (${item.label})`);
    }
});

test('tool definitions match the tools actually defined in the agent', () => {
    const agentSource = fs.readFileSync(path.join('src', 'ai', 'flows', 'ogeemo-chat.ts'), 'utf-8');
    const defined = [...agentSource.matchAll(/defineTool\(\s*\{\s*name:\s*'([^']+)'/g)].map((m) => m[1]).sort();
    assert.ok(defined.length > 0, 'regex found no tools - check ogeemo-chat.ts tool shape');
    const kb = JSON.parse(readKb('04_tool_definitions.json'));
    const documented = kb.tools.map((t: any) => t.name).sort();
    assert.deepEqual(documented, defined, '04_tool_definitions.json out of sync with agent tools');
    assert.ok(Array.isArray(kb.cannotYet) && kb.cannotYet.length > 0, 'cannotYet guidance missing');
});

test('identity document carries only product-real vocabulary', () => {
    const identity = readKb('01_platform_identity.md');
    for (const term of ['Activity Manager', 'BKS', 'Shortcuts', 'Success-Scaled', 'Audit-Ready', 'Workflows']) {
        assert.ok(identity.includes(term), `identity doc missing term: ${term}`);
    }
    // "Master Action Chip" appears in external notes but nowhere in this
    // repository - the knowledge base must not introduce invented terms.
    assert.ok(!identity.includes('Master Action Chip'), 'invented term leaked into identity doc');
});
