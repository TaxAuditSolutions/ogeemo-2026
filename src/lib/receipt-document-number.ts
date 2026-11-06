import { DEFAULT_NUMBERING, formatDocumentNumber } from '@/core/document-numbering';

/**
 * Returns the next receipt document number for a business date (YYYYMMDD),
 * continuing after the highest REC-YYYYMMDD-### already present in the queue.
 */
export function nextReceiptDocumentNumber(
  existingNumbers: readonly (string | null | undefined)[],
  businessDate: string
): string {
  const prefix = `${DEFAULT_NUMBERING.REC.prefix}-${businessDate}-`;
  let highest = 0;
  for (const number of existingNumbers) {
    if (typeof number !== 'string' || !number.startsWith(prefix)) continue;
    const sequence = Number(number.slice(prefix.length));
    if (Number.isInteger(sequence) && sequence > highest) highest = sequence;
  }
  return formatDocumentNumber('REC', DEFAULT_NUMBERING.REC, businessDate, highest + 1);
}
