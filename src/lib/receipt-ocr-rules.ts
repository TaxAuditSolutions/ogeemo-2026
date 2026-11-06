/**
 * OCR prompt builder and rule engine (pure; see tests/receipt-ocr-settings.test.ts).
 * The prompt tells the model how this workspace's receipts look; the rule engine
 * then cleans what the model returned before it reaches the review screen.
 */
import type { ReceiptLedgerType, ReceiptOcrSettings, ReceiptVendorRule } from '@/lib/receipt-ocr-options';

/** The instructions sent to the OCR model, built from the workspace's rules. */
export function buildExtractionPrompt(settings: ReceiptOcrSettings): string {
  const lines = [
    'Read the actual document (a PDF or a photo/scan of a receipt) and extract vendor_name, invoice_number, date, subtotal, tax, total_amount, and currency.',
    "invoice_number is the vendor's own receipt or invoice number; never use an Ogeemo REC document number.",
    'Return the date as YYYY-MM-DD and the currency as its ISO code.',
    'Only report values that are visible on the document; leave a field out when it is not shown. Do not infer or invent values.',
  ];

  if (settings.language !== 'auto') {
    lines.push(`The document is most likely written in ${settings.language}.`);
  }
  if (settings.dateFormat === 'mdy') {
    lines.push('Read ambiguous numeric dates such as 03/04/2026 as month/day/year.');
  } else if (settings.dateFormat === 'dmy') {
    lines.push('Read ambiguous numeric dates such as 03/04/2026 as day/month/year.');
  } else if (settings.dateFormat === 'ymd') {
    lines.push('Read numeric dates as year-month-day.');
  }
  if (settings.taxMode === 'included') {
    lines.push('Prices on this document already include tax: total_amount is the amount paid, tax is the tax portion contained in it, and subtotal is total_amount minus tax.');
  } else if (settings.taxMode === 'excluded') {
    lines.push('Prices on this document exclude tax: subtotal is the sum before tax, tax is added separately, and total_amount is subtotal plus tax.');
  }
  lines.push(`If no currency is shown on the document, use ${settings.defaultCurrency}.`);
  if (settings.customInstructions) {
    lines.push(`Additional instructions from the business: ${settings.customInstructions}`);
  }
  return lines.join(' ');
}

export interface RawReceiptExtraction {
  vendor_name?: string;
  invoice_number?: string;
  date?: string;
  subtotal?: number;
  tax?: number;
  total_amount?: number;
  currency?: string;
}

export interface RuledReceiptExtraction {
  vendor_name: string;
  invoice_number: string;
  date: string;
  subtotal: number;
  tax: number;
  total_amount: number;
  currency: string;
}

export interface ReceiptSuggestions {
  category?: string;
  ledgerType?: ReceiptLedgerType;
}

export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function money(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
}

/** First vendor rule whose text is contained in the vendor name (case-insensitive). */
export function matchVendorRule(vendorName: string, rules: readonly ReceiptVendorRule[]): ReceiptVendorRule | undefined {
  const haystack = vendorName.toLocaleLowerCase();
  return rules.find((rule) => rule.contains && haystack.includes(rule.contains.toLocaleLowerCase()));
}

/**
 * Applies the workspace rules to what the model returned: validates the date,
 * rounds amounts, completes the amounts when two of the three are known,
 * applies the default currency, and applies vendor rules.
 */
export function applyOcrRules(
  raw: RawReceiptExtraction,
  settings: ReceiptOcrSettings
): { data: RuledReceiptExtraction; suggested: ReceiptSuggestions } {
  const rule = matchVendorRule((raw.vendor_name ?? '').trim(), settings.vendorRules);
  const vendor = rule?.vendorName || (raw.vendor_name ?? '').trim();

  let subtotal = money(raw.subtotal);
  let tax = money(raw.tax);
  let total = money(raw.total_amount);
  if (total !== undefined && tax !== undefined && subtotal === undefined) subtotal = money(total - tax);
  else if (total !== undefined && subtotal !== undefined && tax === undefined) tax = money(total - subtotal);
  else if (subtotal !== undefined && tax !== undefined && total === undefined) total = money(subtotal + tax);

  const currencyRaw = (raw.currency ?? '').trim().toUpperCase();
  const date = (raw.date ?? '').trim();

  return {
    data: {
      vendor_name: vendor,
      invoice_number: (raw.invoice_number ?? '').trim(),
      date: isValidIsoDate(date) ? date : '',
      subtotal: subtotal ?? 0,
      tax: tax ?? 0,
      total_amount: total ?? 0,
      currency: /^[A-Z]{3}$/.test(currencyRaw) ? currencyRaw : settings.defaultCurrency,
    },
    suggested: {
      ...(rule?.category ? { category: rule.category } : {}),
      ...(rule?.ledgerType ? { ledgerType: rule.ledgerType } : {}),
    },
  };
}
