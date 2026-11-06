import type { ReceiptOcrSettings, RecordKeepingMode } from '@/lib/receipt-ocr-options';

/**
 * Record-keeping modes (pure; see tests/receipt-record-keeping.test.ts).
 *
 * Nothing here is a legal or CRA certification. The modes only decide which
 * controls Ogeemo enforces; what holds up in an audit depends on the business's
 * own process and its accountant or legal adviser.
 */

export interface RecordKeepingControls {
  mode: RecordKeepingMode;
  /** A private scan is stored, so the GL document number opens it. */
  keepScan: boolean;
  /** Posting is refused without a stored scan. */
  requireScanToPost: boolean;
  /** Posting is refused while a receipt has blocking review errors. */
  blockPostingOnErrors: boolean;
}

export const RECORD_KEEPING_LABELS: Record<RecordKeepingMode, string> = {
  simple: 'Simple - paper receipts are the record',
  audit: 'Audit-ready - digital controls',
  custom: 'Custom - choose each control',
};

export const RECORD_KEEPING_DESCRIPTIONS: Record<RecordKeepingMode, string> = {
  simple:
    'You keep the paper receipts. Ogeemo gives each one a document number to write on the paper, stores a scan, and shows check results as warnings that never block posting.',
  audit:
    'A stored scan is required before a receipt can be posted, and receipts with errors cannot be posted. Approval and edit locking are planned for this mode.',
  custom: 'Switch each control on or off yourself.',
};

/** The controls actually in force: presets for Simple and Audit-ready, the saved switches for Custom. */
export function resolveRecordKeeping(
  settings: Pick<ReceiptOcrSettings, 'recordKeepingMode' | 'keepScan' | 'requireScanToPost' | 'blockPostingOnErrors'>
): RecordKeepingControls {
  switch (settings.recordKeepingMode) {
    case 'audit':
      return { mode: 'audit', keepScan: true, requireScanToPost: true, blockPostingOnErrors: true };
    case 'custom':
      return {
        mode: 'custom',
        keepScan: settings.keepScan || settings.requireScanToPost,
        requireScanToPost: settings.requireScanToPost,
        blockPostingOnErrors: settings.blockPostingOnErrors,
      };
    default:
      return { mode: 'simple', keepScan: true, requireScanToPost: false, blockPostingOnErrors: false };
  }
}

/** Why a receipt cannot be posted under the controls, or '' when it can. */
export function postingBlockReason(
  controls: RecordKeepingControls,
  receipt: { storagePath?: string },
  blockingErrorMessages: readonly string[]
): string {
  if (controls.requireScanToPost && !receipt.storagePath) return 'Store the receipt scan first (use Open File).';
  if (controls.blockPostingOnErrors && blockingErrorMessages.length > 0) return blockingErrorMessages[0];
  return '';
}

export interface PaperFilingRow {
  auditReferenceId?: string;
  transactionDate?: string;
  proposedCompany?: string;
  merchantName?: string;
  totalAmount?: number;
  paperLocation?: string;
  status: string;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV used to pull paper receipts: sorted by document number, with where each one is filed. */
export function buildPaperFilingCsv(rows: readonly PaperFilingRow[]): string {
  const header = ['Document #', 'Date', 'Vendor', 'Total', 'Filed at', 'Status'];
  const sorted = [...rows].sort((a, b) => (a.auditReferenceId ?? '').localeCompare(b.auditReferenceId ?? ''));
  const lines = sorted.map((row) =>
    [
      row.auditReferenceId ?? '',
      row.transactionDate ?? '',
      row.proposedCompany || row.merchantName || '',
      typeof row.totalAmount === 'number' ? row.totalAmount.toFixed(2) : '',
      row.paperLocation ?? '',
      row.status,
    ]
      .map(csvCell)
      .join(',')
  );
  return [header.join(','), ...lines].join('\r\n');
}
