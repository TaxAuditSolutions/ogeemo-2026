import assert from 'node:assert/strict';
import test from 'node:test';

import {
    COPILOT_SIDEBAR_COLLAPSED_WIDTH,
    COPILOT_SIDEBAR_DEFAULT_WIDTH,
    clampCopilotSidebarWidth,
    getEffectiveCopilotSidebarWidth,
    parseStoredCopilotSidebarWidth,
} from '../src/lib/copilot-sidebar-state';

test('uses a 300px default for a missing or malformed stored width', () => {
    assert.equal(parseStoredCopilotSidebarWidth(null), COPILOT_SIDEBAR_DEFAULT_WIDTH);
    assert.equal(parseStoredCopilotSidebarWidth(''), COPILOT_SIDEBAR_DEFAULT_WIDTH);
    assert.equal(parseStoredCopilotSidebarWidth('not-a-number'), COPILOT_SIDEBAR_DEFAULT_WIDTH);
});

test('rounds and clamps preferred width to 240-600px', () => {
    assert.equal(clampCopilotSidebarWidth(239), 240);
    assert.equal(clampCopilotSidebarWidth(420.6), 421);
    assert.equal(clampCopilotSidebarWidth(601), 600);
});

test('caps effective width to preserve main content space', () => {
    assert.equal(getEffectiveCopilotSidebarWidth(600, 1024, 256), 448);
    assert.equal(getEffectiveCopilotSidebarWidth(300, 1440, 256), 300);
    assert.equal(getEffectiveCopilotSidebarWidth(300, 500, 256), COPILOT_SIDEBAR_COLLAPSED_WIDTH);
});