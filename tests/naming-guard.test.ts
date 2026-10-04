import { readdirSync, readFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

/**
 * Guard test for the Events Manager naming cleanup.
 *
 * The page used to be called "Master Mind" / "Command Centre" and lived at
 * /master-mind. It is now the "Activity Manager" at /event-manager, with a redirect
 * from the old path (see next.config.js).
 *
 * Everything user-facing has been renamed - app copy, marketing pages, the
 * assistant's knowledge base and the guide seeds that get ingested into the
 * remote assistant's help_guides corpus - so this test scans all of it and fails
 * on a regression. There is no allowlist: if a retired name is needed in future,
 * add it deliberately and document why.
 */

const REPO_ROOT = path.join(import.meta.dirname, '..');

const SCAN_ROOTS = [
    path.join(REPO_ROOT, 'src'),
    path.join(REPO_ROOT, 'dev', 'guides'),
];

const SCANNED_EXTENSIONS = /\.(ts|tsx|md|json|csv)$/;

function listFiles(directory: string): string[] {
    const entries = readdirSync(directory, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...listFiles(full));
        } else if (SCANNED_EXTENSIONS.test(entry.name)) {
            files.push(full);
        }
    }

    return files;
}

function findViolationsInFiles(files: string[], pattern: RegExp): string[] {
    const violations: string[] = [];

    for (const file of files) {
        const relative = path.relative(REPO_ROOT, file).split(path.sep).join('/');
        readFileSync(file, 'utf8')
            .split(/\r?\n/)
            .forEach((line, index) => {
                if (pattern.test(line)) {
                    violations.push(`${relative}:${index + 1}: ${line.trim()}`);
                }
            });
    }

    return violations;
}

function findViolations(pattern: RegExp): string[] {
    const files: string[] = [];

    for (const root of SCAN_ROOTS) {
        files.push(...listFiles(root));
    }

    return findViolationsInFiles(files, pattern);
}

/**
 * Terminology retirement guard ("Action Manager" rename, 2026-10-03).
 *
 * The feature is now "My Shortcuts" / "Shortcuts" (beta feedback: proprietary
 * terminology made users learn Ogeemo language before understanding a familiar
 * concept). Scope decision (Option A): all of src/ plus the LIVE guide seeds
 * (top-level dev/guides/*.json) must be free of the retired terms. The archived
 * transcripts under dev/guides/archive/ deliberately record what the UI looked
 * like at the time and are exempt.
 *
 * Patterns use a literal space so routes (/action-manager), hrefs
 * (/action-chips-info) and identifiers (ActionChip, actionChipView) are
 * unaffected - only prose and user-facing labels are covered.
 */
function findRetiredTerminology(pattern: RegExp): string[] {
    const files = listFiles(path.join(REPO_ROOT, 'src'));

    const liveGuides = readdirSync(path.join(REPO_ROOT, 'dev', 'guides'), { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => path.join(REPO_ROOT, 'dev', 'guides', entry.name));

    return findViolationsInFiles([...files, ...liveGuides], pattern);
}

test('no file hardcodes the retired /master-mind route', () => {
    assert.deepEqual(findViolations(/master-mind/), []);
});

test('the retired term "Command Centre" is gone from app copy and guides', () => {
    assert.deepEqual(findViolations(/command cent/i), []);
});

test('the retired term "Master Mind" is gone from app copy and guides', () => {
    assert.deepEqual(findViolations(/master mind/i), []);
});

test('the retired term "Event Manager" is gone after the Activity Manager rename', () => {
    assert.deepEqual(findViolations(/event manager/i), []);
});

test('the guard test actually scans the source and guide trees', () => {
    const sourceFiles = listFiles(SCAN_ROOTS[0]).length;
    const guideFiles = listFiles(SCAN_ROOTS[1]).length;

    assert.ok(sourceFiles > 100, `expected many source files, saw ${sourceFiles}`);
    assert.ok(guideFiles > 10, `expected guide seeds, saw ${guideFiles}`);
    assert.ok(statSync(path.join(REPO_ROOT, 'src', 'lib', 'menu-items.ts')).isFile());
    assert.ok(statSync(path.join(REPO_ROOT, 'dev', 'guides')).isDirectory());
});

test('the retired term "Action Manager" is gone from app copy and live guides', () => {
    assert.deepEqual(findRetiredTerminology(/action manager/i), []);
});

test('the retired term "Action Chip" is gone from app copy and live guides', () => {
    assert.deepEqual(findRetiredTerminology(/action chip/i), []);
});
