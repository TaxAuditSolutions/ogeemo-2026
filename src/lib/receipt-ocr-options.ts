/**
 * Option lists and types for the receipt OCR rules (pure data, no imports).
 * Used by the Settings card, the settings normalizer, and the rule engine.
 */

export type ReceiptLedgerType = 'expense' | 'payable_bill' | 'income';

// Google retires models over time (2.5 Pro and 2.5 Flash-Lite already return 404 for accounts that
// did not use them before, and 2.5 Flash is deprecated). A saved model that is no longer listed here
// falls back to the default in normalizeReceiptOcrSettings, so an old setting never breaks OCR.
export const OCR_MODELS = [
  { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite - fast, lowest cost (recommended)' },
  { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash - more accurate' },
  { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash - accurate' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (preview) - most accurate, slowest' },
] as const;
export type OcrModelName = (typeof OCR_MODELS)[number]['value'];

export const OCR_CURRENCIES = [
  'CAD', 'USD', 'EUR', 'GBP', 'AUD', 'NZD', 'MXN', 'CHF', 'JPY', 'CNY', 'INR', 'HKD', 'SGD',
] as const;

export const OCR_DATE_FORMATS = [
  { value: 'auto', label: 'Detect automatically' },
  { value: 'ymd', label: 'Year-Month-Day (2026-10-31)' },
  { value: 'mdy', label: 'Month/Day/Year (10/31/2026)' },
  { value: 'dmy', label: 'Day/Month/Year (31/10/2026)' },
] as const;
export type OcrDateFormat = (typeof OCR_DATE_FORMATS)[number]['value'];

export const OCR_LANGUAGES = [
  { value: 'auto', label: 'Detect automatically' },
  { value: 'English', label: 'English' },
  { value: 'French', label: 'French' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'German', label: 'German' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
] as const;

export const OCR_TAX_MODES = [
  { value: 'auto', label: 'Detect from the receipt' },
  { value: 'included', label: 'Prices already include tax' },
  { value: 'excluded', label: 'Prices exclude tax (tax added at the end)' },
] as const;
export type OcrTaxMode = (typeof OCR_TAX_MODES)[number]['value'];

/**
 * How tax is worked out for a receipt.
 *  from_total   - OCR reads only the total; the reviewer picks a tax type and the tax is calculated
 *                 from it. Net + tax always equals the total, and the tax printed on the receipt
 *                 is kept only as a reference for comparison.
 *  from_receipt - the net and tax printed on the receipt are used as OCR read them.
 */
export const TAX_CALCULATION_OPTIONS = [
  { value: 'from_total', label: 'Calculate from the total (recommended)' },
  { value: 'from_receipt', label: 'Use the tax printed on the receipt' },
] as const;
export type TaxCalculation = (typeof TAX_CALCULATION_OPTIONS)[number]['value'];

/** A tax the reviewer can choose for a receipt, such as "HST 13%". The rate is a percentage of the pre-tax amount. */
export interface ReceiptTaxChoice {
  id: string;
  name: string;
  rate: number;
}

/** Special choice on a receipt: the reviewer enters the tax amount by hand (mixed or exempt items). */
export const RECEIPT_TAX_MANUAL = '__manual__';
export const MAX_TAX_CHOICES = 20;

/**
 * Starting list for a new workspace. Rates change and differ by province, so the list is
 * editable in Settings; check each rate before relying on it.
 */
export const DEFAULT_TAX_CHOICES: readonly ReceiptTaxChoice[] = [
  { id: 'none', name: 'No tax', rate: 0 },
  { id: 'gst-5', name: 'GST 5%', rate: 5 },
  { id: 'hst-13', name: 'HST 13%', rate: 13 },
  { id: 'hst-14', name: 'HST 14%', rate: 14 },
  { id: 'hst-15', name: 'HST 15%', rate: 15 },
  { id: 'pst-6', name: 'PST 6%', rate: 6 },
  { id: 'pst-7', name: 'PST 7%', rate: 7 },
  { id: 'gst-pst-11', name: 'GST + PST 11%', rate: 11 },
  { id: 'gst-pst-12', name: 'GST + PST 12%', rate: 12 },
];

export const OCR_DUPLICATE_MODES = [
  { value: 'file', label: 'Identical file only' },
  { value: 'file_and_fields', label: 'Identical file, and flag same vendor + date + total' },
] as const;
export type OcrDuplicateMode = (typeof OCR_DUPLICATE_MODES)[number]['value'];

export const RECEIPT_FIELD_OPTIONS = [
  { value: 'vendor', label: 'Vendor' },
  { value: 'date', label: 'Transaction date' },
  { value: 'vendorDocumentNumber', label: 'Vendor invoice / receipt number' },
  { value: 'netAmount', label: 'Net amount' },
  { value: 'taxAmount', label: 'Tax amount' },
  { value: 'totalAmount', label: 'Total amount' },
  { value: 'category', label: 'Category' },
  { value: 'businessReason', label: 'Business reason' },
] as const;
export type ReceiptRequiredField = (typeof RECEIPT_FIELD_OPTIONS)[number]['value'];

export const RECEIPT_LEDGER_TYPES: readonly ReceiptLedgerType[] = ['expense', 'payable_bill', 'income'];

export const RECEIPT_LEDGER_LABELS: Record<ReceiptLedgerType, string> = {
  expense: 'Expense',
  payable_bill: 'Payable bill',
  income: 'Income',
};

export interface ReceiptVendorRule {
  /** Case-insensitive text the OCR vendor name must contain. */
  contains: string;
  /** Replaces the OCR vendor name (a clean, consistent name). */
  vendorName?: string;
  /** Default category for this vendor. */
  category?: string;
  /** Default ledger type for this vendor. */
  ledgerType?: ReceiptLedgerType;
  /** Id of the tax choice this vendor's receipts use (see ReceiptTaxChoice). */
  taxChoice?: string;
}

/** simple = paper receipts are the record; audit = digital controls; custom = choose each control. */
export type RecordKeepingMode = 'simple' | 'audit' | 'custom';
export const RECORD_KEEPING_MODES: readonly RecordKeepingMode[] = ['simple', 'audit', 'custom'];

export interface ReceiptOcrSettings {
  // Record keeping (see receipt-record-keeping.ts for what each mode switches on)
  recordKeepingMode: RecordKeepingMode;
  /** Store a private scan of each receipt so its GL document number opens it. */
  keepScan: boolean;
  /** Refuse to post a receipt that has no stored scan. */
  requireScanToPost: boolean;
  // Reading
  model: OcrModelName;
  language: string;
  dateFormat: OcrDateFormat;
  taxMode: OcrTaxMode;
  defaultCurrency: string;
  customInstructions: string;
  autoRunOcrOnUpload: boolean;
  maxFileSizeMB: number;
  // Tax
  taxCalculation: TaxCalculation;
  taxChoices: ReceiptTaxChoice[];
  /** Id of the tax choice new receipts start with; empty means the reviewer chooses each time. */
  defaultTaxChoice: string;
  // Defaults for new receipts
  defaultLedgerType: ReceiptLedgerType;
  defaultCategory: string;
  vendorRules: ReceiptVendorRule[];
  // Validation
  requiredFields: ReceiptRequiredField[];
  amountTolerance: number;
  expectedTaxRates: number[];
  maxFutureDays: number;
  maxAgeDays: number;
  maxReceiptAmount: number;
  duplicateMode: OcrDuplicateMode;
  blockPostingOnErrors: boolean;
}

export const DEFAULT_RECEIPT_OCR_SETTINGS: ReceiptOcrSettings = {
  recordKeepingMode: 'simple',
  keepScan: true,
  requireScanToPost: false,
  model: 'gemini-3.5-flash-lite',
  language: 'auto',
  dateFormat: 'auto',
  taxMode: 'auto',
  defaultCurrency: 'CAD',
  customInstructions: '',
  autoRunOcrOnUpload: false,
  maxFileSizeMB: 10,
  taxCalculation: 'from_total',
  taxChoices: DEFAULT_TAX_CHOICES.map((choice) => ({ ...choice })),
  defaultTaxChoice: '',
  defaultLedgerType: 'expense',
  defaultCategory: '',
  vendorRules: [],
  requiredFields: ['vendor', 'date', 'totalAmount', 'category', 'businessReason'],
  amountTolerance: 0.01,
  expectedTaxRates: [],
  maxFutureDays: 1,
  maxAgeDays: 0,
  maxReceiptAmount: 0,
  duplicateMode: 'file_and_fields',
  blockPostingOnErrors: true,
};

export const MAX_VENDOR_RULES = 100;
export const MAX_CUSTOM_INSTRUCTIONS = 600;
export const HARD_MAX_FILE_MB = 10;
