/**
 * Pure helpers for the Receipt Archive (the permanent record of every stored
 * receipt, including ones already posted to the ledger). See
 * tests/receipt-archive-utils.test.ts.
 */

export interface ArchiveReceipt {
  id: string;
  status: 'queued' | 'processing' | 'reviewed' | 'posted' | 'rejected';
  auditReferenceId?: string;
  merchantName?: string;
  proposedCompany?: string;
  fileName?: string;
  vendorDocumentNumber?: string;
  transactionDate?: string;
  totalAmount?: number;
  proposedCategory?: string;
  storagePath?: string;
  /** Legacy sample markers - such records are never shown. */
  demoReceiptId?: string;
  isDemo?: boolean;
  fileHash?: string;
}

export type ArchiveStatusFilter = 'all' | 'posted' | 'open' | 'removed';

/** Real receipts only: legacy samples are excluded, removed (rejected) ones are kept for the record. */
export function isArchiveReceipt(item: ArchiveReceipt): boolean {
  if (item.demoReceiptId) return false;
  return !(item.isDemo && !item.fileHash);
}

export function archiveStatusLabel(status: ArchiveReceipt['status']): string {
  switch (status) {
    case 'posted':
      return 'Posted';
    case 'rejected':
      return 'Removed';
    case 'reviewed':
      return 'Reviewed';
    case 'processing':
      return 'Processing';
    default:
      return 'In queue';
  }
}

function matchesStatus(item: ArchiveReceipt, filter: ArchiveStatusFilter): boolean {
  switch (filter) {
    case 'posted':
      return item.status === 'posted';
    case 'removed':
      return item.status === 'rejected';
    case 'open':
      return item.status !== 'posted' && item.status !== 'rejected';
    default:
      return true;
  }
}

/** Filters by status and by free text across number, vendor, file name, category and date. */
export function filterArchive<T extends ArchiveReceipt>(items: readonly T[], search: string, status: ArchiveStatusFilter): T[] {
  const terms = search.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (!isArchiveReceipt(item) || !matchesStatus(item, status)) return false;
    if (terms.length === 0) return true;
    const haystack = [
      item.auditReferenceId,
      item.proposedCompany,
      item.merchantName,
      item.fileName,
      item.vendorDocumentNumber,
      item.proposedCategory,
      item.transactionDate,
      typeof item.totalAmount === 'number' ? item.totalAmount.toFixed(2) : '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
