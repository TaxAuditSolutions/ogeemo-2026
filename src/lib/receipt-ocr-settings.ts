/**
 * Receipt OCR rules: normalization, prompt building and the rule engine (pure:
 * no React, Firebase or Genkit imports, so it is shared by the Settings card,
 * the review screen and the server OCR route, and is unit-tested).
 *
 * Rules are stored per workspace on the organization document under
 * `receiptOcrSettings` and are edited in Settings by workspace administrators.
 */
import {
  DEFAULT_RECEIPT_OCR_SETTINGS,
  HARD_MAX_FILE_MB,
  MAX_CUSTOM_INSTRUCTIONS,
  MAX_VENDOR_RULES,
  OCR_DATE_FORMATS,
  OCR_DUPLICATE_MODES,
  OCR_LANGUAGES,
  OCR_MODELS,
  OCR_TAX_MODES,
  RECORD_KEEPING_MODES,
  RECEIPT_FIELD_OPTIONS,
  RECEIPT_LEDGER_TYPES,
  type ReceiptLedgerType,
  type ReceiptOcrSettings,
  type ReceiptRequiredField,
  type ReceiptVendorRule,
} from '@/lib/receipt-ocr-options';

export * from '@/lib/receipt-ocr-options';
export * from '@/lib/receipt-ocr-rules';

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number, decimals = 2): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  const factor = 10 ** decimals;
  return Math.round(Math.min(max, Math.max(min, n)) * factor) / factor;
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength) : '';
}

function normalizeVendorRules(input: unknown): ReceiptVendorRule[] {
  const rules: ReceiptVendorRule[] = [];
  for (const item of Array.isArray(input) ? input : []) {
    if (!item || typeof item !== 'object') continue;
    const rule = item as Record<string, unknown>;
    const contains = cleanText(rule.contains, 80);
    if (!contains) continue;
    const vendorName = cleanText(rule.vendorName, 120);
    const category = cleanText(rule.category, 120);
    const ledgerType = RECEIPT_LEDGER_TYPES.includes(rule.ledgerType as ReceiptLedgerType)
      ? (rule.ledgerType as ReceiptLedgerType)
      : undefined;
    rules.push({
      contains,
      ...(vendorName ? { vendorName } : {}),
      ...(category ? { category } : {}),
      ...(ledgerType ? { ledgerType } : {}),
    });
    if (rules.length >= MAX_VENDOR_RULES) break;
  }
  return rules;
}

function normalizeTaxRates(input: unknown): number[] {
  const rates = (Array.isArray(input) ? input : [])
    .map((rate) => clampNumber(rate, 0, 100, NaN, 3))
    .filter((rate) => Number.isFinite(rate) && rate > 0);
  return Array.from(new Set(rates)).sort((a, b) => a - b).slice(0, 12);
}

/** Validates stored or user-entered rules, replacing anything invalid with its default. */
export function normalizeReceiptOcrSettings(input: unknown): ReceiptOcrSettings {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const defaults = DEFAULT_RECEIPT_OCR_SETTINGS;

  const currency = cleanText(raw.defaultCurrency, 3).toUpperCase();
  const requiredRaw = Array.isArray(raw.requiredFields) ? raw.requiredFields : defaults.requiredFields;
  const requiredFields = RECEIPT_FIELD_OPTIONS.map((o) => o.value).filter((field) =>
    requiredRaw.includes(field)
  ) as ReceiptRequiredField[];

  return {
    recordKeepingMode: oneOf(raw.recordKeepingMode, RECORD_KEEPING_MODES, defaults.recordKeepingMode),
    keepScan: raw.keepScan === false ? false : true,
    requireScanToPost: raw.requireScanToPost === true,
    model: oneOf(raw.model, OCR_MODELS.map((m) => m.value), defaults.model),
    language: oneOf(raw.language, OCR_LANGUAGES.map((l) => l.value) as readonly string[], defaults.language),
    dateFormat: oneOf(raw.dateFormat, OCR_DATE_FORMATS.map((d) => d.value), defaults.dateFormat),
    taxMode: oneOf(raw.taxMode, OCR_TAX_MODES.map((t) => t.value), defaults.taxMode),
    defaultCurrency: /^[A-Z]{3}$/.test(currency) ? currency : defaults.defaultCurrency,
    customInstructions: cleanText(raw.customInstructions, MAX_CUSTOM_INSTRUCTIONS),
    autoRunOcrOnUpload: raw.autoRunOcrOnUpload === true,
    maxFileSizeMB: Math.round(clampNumber(raw.maxFileSizeMB, 1, HARD_MAX_FILE_MB, defaults.maxFileSizeMB, 0)),
    defaultLedgerType: oneOf(raw.defaultLedgerType, RECEIPT_LEDGER_TYPES, defaults.defaultLedgerType),
    defaultCategory: cleanText(raw.defaultCategory, 120),
    vendorRules: normalizeVendorRules(raw.vendorRules),
    requiredFields,
    amountTolerance: clampNumber(raw.amountTolerance, 0, 10, defaults.amountTolerance, 2),
    expectedTaxRates: normalizeTaxRates(raw.expectedTaxRates),
    maxFutureDays: Math.round(clampNumber(raw.maxFutureDays, 0, 365, defaults.maxFutureDays, 0)),
    maxAgeDays: Math.round(clampNumber(raw.maxAgeDays, 0, 3650, defaults.maxAgeDays, 0)),
    maxReceiptAmount: clampNumber(raw.maxReceiptAmount, 0, 10_000_000, defaults.maxReceiptAmount, 2),
    duplicateMode: oneOf(raw.duplicateMode, OCR_DUPLICATE_MODES.map((d) => d.value), defaults.duplicateMode),
    blockPostingOnErrors: raw.blockPostingOnErrors === false ? false : true,
  };
}

export function maxReceiptFileBytes(settings: Pick<ReceiptOcrSettings, 'maxFileSizeMB'>): number {
  return Math.min(settings.maxFileSizeMB, HARD_MAX_FILE_MB) * 1024 * 1024;
}
