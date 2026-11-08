/**
 * What a receipt must satisfy before it becomes a ledger entry (pure; see tests/receipt-posting.test.ts).
 *
 * Review checks on the screen are only warnings in Simple record-keeping mode, so this is the last
 * line: no entry is written for a zero total, an impossible date or amounts that do not add up.
 * It also turns the category the reviewer chose (a NAME such as "Office expenses") into the category
 * LINE the rest of Ogeemo uses (8810). The Income Statement and the ledger match on the line, so an
 * entry saved with the name was counted under "Other expenses" and showed a raw name.
 */
import { roundCents } from '@/lib/document-totals';
import { isValidIsoDate } from '@/lib/receipt-ocr-rules';

/** T2125 "Other expenses" and "Other income": where an entry goes when no category matches. */
export const FALLBACK_EXPENSE_LINE = '9270';
export const FALLBACK_INCOME_LINE = 'Part 3D';

export interface CategoryLike {
  name: string;
  categoryNumber?: string;
  isArchived?: boolean;
}

const norm = (value: string | undefined | null) => (value ?? '').trim().toLowerCase();

/**
 * The category line for what the reviewer chose, which may be a name or a line number. Active
 * categories win over archived ones. With no match the entry goes to the fallback line, and
 * `matched` is false so the caller can say so.
 */
export function resolveCategoryLine(
  chosen: string | undefined | null,
  categories: readonly CategoryLike[],
  fallbackLine: string
): { line: string; matched: boolean } {
  const wanted = norm(chosen);
  if (!wanted) return { line: fallbackLine, matched: false };
  const ordered = [...categories].sort((a, b) => Number(!!a.isArchived) - Number(!!b.isArchived));
  const hit =
    ordered.find((c) => c.categoryNumber && norm(c.categoryNumber) === wanted) ??
    ordered.find((c) => norm(c.name) === wanted);
  return hit?.categoryNumber ? { line: hit.categoryNumber, matched: true } : { line: fallbackLine, matched: false };
}

export interface PostingInput {
  totalAmount?: number | null;
  netAmount?: number | null;
  taxAmount?: number | null;
  transactionDate?: string | null;
}

export interface PostingValues {
  date: string;
  totalAmount: number;
  preTaxAmount: number;
  taxAmount: number;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** A cent or two is normal when a vendor rounds each line; more than this is a real difference. */
const TOLERANCE = 0.02;

/** Checks a receipt and returns the amounts and date to post, or the first problem as a message. */
export function checkReceiptForPosting(
  input: PostingInput,
  today: string
): { values: PostingValues; error: null } | { values: null; error: string } {
  const fail = (error: string) => ({ values: null, error } as const);

  if (!finite(input.totalAmount) || input.totalAmount <= 0) return fail('Enter a total above zero before posting.');
  const total = roundCents(input.totalAmount);

  const date = (input.transactionDate ?? '').trim() || today;
  if (!isValidIsoDate(date)) return fail('The transaction date is not a valid date. Correct it before posting.');

  const hasNet = finite(input.netAmount);
  const hasTax = finite(input.taxAmount);
  if ((hasNet && (input.netAmount as number) < 0) || (hasTax && (input.taxAmount as number) < 0)) {
    return fail('The net amount and the tax cannot be negative.');
  }

  let net: number;
  let tax: number;
  if (hasNet && hasTax) {
    net = roundCents(input.netAmount as number);
    tax = roundCents(input.taxAmount as number);
    if (Math.abs(roundCents(net + tax) - total) > TOLERANCE + 1e-9) {
      return fail(`Net ${net.toFixed(2)} plus tax ${tax.toFixed(2)} is ${roundCents(net + tax).toFixed(2)}, which is not the total ${total.toFixed(2)}. Correct the amounts before posting.`);
    }
    // Within a couple of cents: the total is what was paid, so the net takes up the difference.
    net = roundCents(total - tax);
  } else if (hasNet) {
    net = roundCents(input.netAmount as number);
    tax = roundCents(total - net);
    if (tax < 0) return fail(`The net amount ${net.toFixed(2)} is more than the total ${total.toFixed(2)}.`);
  } else if (hasTax) {
    tax = roundCents(input.taxAmount as number);
    net = roundCents(total - tax);
    if (net < 0) return fail(`The tax ${tax.toFixed(2)} is more than the total ${total.toFixed(2)}.`);
  } else {
    net = total;
    tax = 0;
  }

  return { error: null, values: { date, totalAmount: total, preTaxAmount: net, taxAmount: tax } };
}
