/**
 * Pure helpers for validating receipt files (no React/Firebase imports so they
 * can be unit-tested; see tests/receipt-file-utils.test.ts).
 */

export const MAX_RECEIPT_FILE_BYTES = 10 * 1024 * 1024;

/** Model that reads receipt files (the server prefixes it with `googleai/`). */
export const RECEIPT_OCR_MODEL_NAME = 'gemini-2.5-flash';

export const RECEIPT_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] as const;
export type ReceiptMimeType = (typeof RECEIPT_MIME_TYPES)[number];

/** Comma-separated list for pickers / file inputs. */
export const RECEIPT_MIME_TYPES_CSV = RECEIPT_MIME_TYPES.join(',');

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

/**
 * Identifies a receipt file from its leading bytes. The browser-supplied MIME
 * type is never trusted: returns null for anything that is not a PDF, PNG,
 * JPEG, or WebP image.
 */
export function detectReceiptMime(bytes: Uint8Array): ReceiptMimeType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf'; // %PDF-
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'; // RIFF....WEBP
  return null;
}

export function isReceiptMimeType(value: string | undefined | null): value is ReceiptMimeType {
  return !!value && (RECEIPT_MIME_TYPES as readonly string[]).includes(value);
}

/** SHA-256 of the file bytes as lowercase hex (used for exact-duplicate detection). */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Returns a user-facing message when the size is unusable, otherwise null. */
export function validateReceiptFileSize(size: number | undefined | null): string | null {
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return 'The file is empty.';
  if (size > MAX_RECEIPT_FILE_BYTES) {
    return `The file is larger than ${Math.round(MAX_RECEIPT_FILE_BYTES / (1024 * 1024))} MB.`;
  }
  return null;
}
