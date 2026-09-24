import { readdirSync, readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

/**
 * Guard test for the Events Manager naming cleanup.
 *
 * The page used to be called "Master Mind" / "Command Centre" and lived at
 * /master-mind. It is now the "Event Manager" at /event-manager, with a redirect
 * from the old path. Marketing pages deliberately keep the old phrases as brand
 * copy, and one ledger sentence uses "command center" as a metaphor, so those are
 * allowlisted below.
 */

const SRC_ROOT = path.join(import.meta.dirname, '..', 'src');

// Deliberately untouched marketing/brand copy.
const MARKETING_ALLOWLIST = new Set([
    'src/app/empowerment/page.tsx',
    'src/app/features/page.tsx',
    'src/app/for-virtual-assistants/page.tsx',
    'src/app/(app)/marketing-manager/page.tsx',
]);

// "The BKS General Ledger ... master command center" - a metaphor, not the module.
const METAPHOR_ALLOWLIST = new Set(['src/components/accounting/ledgers-view.tsx']);

function listSourceFiles(directory: string): string[] {
    const entries = readdirSync(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...listSourceFiles(full));
        } else if (/\.(ts|tsx|md)$/.test(entry.name)) {
            files.push(full);
        }
    }

    return files;
}

function findViolations(pattern: RegExp, allowlist: Set<string>) {
    const violations: string[] = [];

    for (const file of listSourceFiles(SRC_ROOT)) {
        const relative = path.relative(path.join(SRC_ROOT, '..'), file).split(path.sep).join('/');
        if (allowlist.has(relative)) continue;

        const lines = readFileSync(file, 'utf8').split(/\r?\n/);
        lines.forEach((line, index) => {
            if (pattern.test(line)) {
                violations.push(`${relative}:${index + 1}: ${line.trim()}`);
            }
        });
    }

    return violations;
}

test('no source file hardcodes the retired /master-mind route', () => {
    assert.deepEqual(findViolations(/master-mind/, new Set()), []);
});

test('the retired term "Command Centre" is gone from app copy', () => {
    const allowlist = new Set([...MARKETING_ALLOWLIST, ...METAPHOR_ALLOWLIST]);
    assert.deepEqual(findViolations(/command cent/i, allowlist), []);
});

test('the retired term "Master Mind" is gone from app copy', () => {
    assert.deepEqual(findViolations(/master mind/i, MARKETING_ALLOWLIST), []);
});

test('the guard test actually scans the source tree', () => {
    const files = listSourceFiles(SRC_ROOT);
    assert.ok(files.length > 100, `expected to scan many files, saw ${files.length}`);
    assert.ok(files.some((file) => file.endsWith('menu-items.ts')));
    assert.ok(statSync(path.join(SRC_ROOT, 'lib', 'menu-items.ts')).isFile());
});
