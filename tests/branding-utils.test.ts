import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    MAX_LOGO_FILE_BYTES,
    brandingErrorMessage,
    logoStoragePath,
    sanitizeLogoFileName,
    validateLogoFile,
} from '../src/lib/branding-utils';

test('validateLogoFile accepts supported image types within the size limit', () => {
    assert.equal(validateLogoFile({ type: 'image/png', size: 1024 }), null);
    assert.equal(validateLogoFile({ type: 'image/jpeg', size: 1024 }), null);
    assert.equal(validateLogoFile({ type: 'image/webp', size: 1024 }), null);
    assert.equal(validateLogoFile({ type: 'image/gif', size: 1024 }), null);
    assert.equal(validateLogoFile({ type: 'image/png', size: MAX_LOGO_FILE_BYTES }), null);
});

test('validateLogoFile rejects unsupported types and oversized files', () => {
    assert.equal(validateLogoFile({ type: 'image/svg+xml', size: 1024 }), 'unsupported-type');
    assert.equal(validateLogoFile({ type: 'application/pdf', size: 1024 }), 'unsupported-type');
    assert.equal(validateLogoFile({ type: 'image/png', size: 0 }), 'unsupported-type');
    assert.equal(validateLogoFile({ type: 'image/png', size: Number.NaN }), 'unsupported-type');
    assert.equal(validateLogoFile({ type: 'image/png', size: MAX_LOGO_FILE_BYTES + 1 }), 'too-large');
    assert.equal(validateLogoFile(null), null);
});

test('brandingErrorMessage translates permission errors and never returns empty', () => {
    assert.equal(
        brandingErrorMessage({ code: 'permission-denied', message: 'raw firestore message' }),
        'Only workspace administrators can change the document logo.'
    );
    assert.equal(
        brandingErrorMessage({ code: 'storage/unauthorized', message: 'raw storage message' }),
        'Only workspace administrators can change the document logo.'
    );
    assert.equal(brandingErrorMessage(new Error('quota exceeded')), 'quota exceeded');
    assert.equal(brandingErrorMessage('plain failure'), 'plain failure');
    assert.ok(brandingErrorMessage(undefined).length > 0);
    assert.ok(brandingErrorMessage({}).length > 0);
});

test('sanitizeLogoFileName produces safe, readable file names', () => {
    assert.equal(sanitizeLogoFileName('My Logo (Final).PNG'), 'my-logo-final.png');
    assert.equal(sanitizeLogoFileName('../../evil.png'), 'evil.png');
    assert.equal(sanitizeLogoFileName('C:\\Users\\dw\\logo 2.png'), 'logo-2.png');
    assert.equal(sanitizeLogoFileName('.hidden'), 'hidden');
    assert.equal(sanitizeLogoFileName(''), 'logo');
    assert.equal(sanitizeLogoFileName('///'), 'logo');
});

test('logoStoragePath scopes files under orgbranding and validates the org id', () => {
    assert.equal(
        logoStoragePath('org-123', 'My Logo.png'),
        'siteimages/orgbranding/org-123/my-logo.png'
    );
    assert.throws(() => logoStoragePath('../evil', 'logo.png'), /workspace id/);
    assert.throws(() => logoStoragePath('', 'logo.png'), /workspace id/);
});
