/**
 * Pure helpers for document branding (company logos on quotes, invoices and
 * receipts). Kept free of React/Firebase imports so the logic can be
 * unit-tested (tests/branding-utils.test.ts).
 */

/** Files larger than this are rejected to keep prints fast and storage tidy. */
export const MAX_LOGO_FILE_BYTES = 5 * 1024 * 1024;

/** Image types accepted for a document logo (SVG intentionally excluded). */
export const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

export interface LogoFileLike {
    name?: string;
    type: string;
    size: number;
}

export type LogoValidationError = 'unsupported-type' | 'too-large' | null;

/** Validates a chosen logo file; returns an error code the UI can translate. */
export function validateLogoFile(file: LogoFileLike | null | undefined): LogoValidationError {
    if (!file) return null;
    if (!(ALLOWED_LOGO_TYPES as readonly string[]).includes(file.type)) return 'unsupported-type';
    if (!Number.isFinite(file.size) || file.size <= 0) return 'unsupported-type';
    if (file.size > MAX_LOGO_FILE_BYTES) return 'too-large';
    return null;
}

/** Maps a logo upload/save error to a friendly, user-facing message. */
export function brandingErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
        const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
        if (code === 'permission-denied' || code === 'storage/unauthorized') {
            return 'Only workspace administrators can change the document logo.';
        }
        const message = 'message' in error ? (error as { message?: unknown }).message : '';
        if (typeof message === 'string' && message.trim()) return message;
    }
    if (typeof error === 'string' && error.trim()) return error;
    return 'The logo could not be saved. Please try again.';
}

/** Keeps only filesystem-safe characters in an uploaded file name. */
export function sanitizeLogoFileName(fileName: string): string {
    const base = (fileName ?? '').split(/[/\\]/).pop() ?? '';
    const cleaned = base
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/-+\./g, '.')
        .replace(/^[._-]+/, '')
        .replace(/[._-]+$/, '');
    return cleaned || 'logo';
}

/** Storage path for an org's document logo (under the existing siteimages rules). */
export function logoStoragePath(orgId: string, fileName: string): string {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(orgId ?? '')) {
        throw new Error('A valid workspace id is required.');
    }
    return `siteimages/orgbranding/${orgId}/${sanitizeLogoFileName(fileName)}`;
}
