import { applicationDefault, cert } from 'firebase-admin/app';

/**
 * Resolves Firebase Admin credentials the same way the application does
 * (src/core/firebase-admin.ts): an inline service account from the environment
 * first, Application Default Credentials as the fallback.
 *
 * This matters because .env.local holds FIREBASE_SERVICE_ACCOUNT_KEY (a JSON
 * string) and the machine has no GOOGLE_APPLICATION_CREDENTIALS file, so the
 * scripts would fail on ADC alone.
 */
export function resolveAdminCredential() {
    const inline = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? process.env.SERVICE_ACCOUNT_KEY;

    if (!inline) return applicationDefault();

    const cleaned = inline.trim().replace(/^['"]|['"]$/g, '');
    const serviceAccount = JSON.parse(cleaned);

    if (serviceAccount.private_key) {
        serviceAccount.private_key = String(serviceAccount.private_key).replace(/\\n/g, '\n');
    }

    return cert(serviceAccount);
}

/** The embedding key used by the guide pipeline (GOOGLE_API_KEY or GEMINI_API_KEY). */
export function resolveEmbeddingApiKey(): string {
    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in .env.local');
    }

    return apiKey;
}
