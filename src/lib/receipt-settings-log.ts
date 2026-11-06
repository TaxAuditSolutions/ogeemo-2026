import type { ReceiptOcrSettings } from '@/lib/receipt-ocr-options';
import { RECORD_KEEPING_LABELS, resolveRecordKeeping } from '@/lib/receipt-record-keeping';

/**
 * Change log for the record-keeping controls (pure; see
 * tests/receipt-record-keeping.test.ts). Each entry records which controls
 * changed, who changed them and when, so a later review can see how the
 * workspace's receipt handling has varied over time.
 */

export interface RecordKeepingLogEntry {
  at: string;
  byUserId: string;
  byName?: string;
  fromMode: string;
  toMode: string;
  /** Plain-language list of controls that changed. */
  changes: string[];
}

type Tracked = Pick<ReceiptOcrSettings, 'recordKeepingMode' | 'keepScan' | 'requireScanToPost' | 'blockPostingOnErrors'>;

const yesNo = (value: boolean) => (value ? 'on' : 'off');

/** The effective controls that differ between two saved settings, in plain language. */
export function describeRecordKeepingChanges(before: Tracked, after: Tracked): string[] {
  const a = resolveRecordKeeping(before);
  const b = resolveRecordKeeping(after);
  const changes: string[] = [];
  if (before.recordKeepingMode !== after.recordKeepingMode) {
    changes.push(`Mode changed to ${RECORD_KEEPING_LABELS[after.recordKeepingMode]}`);
  }
  if (a.keepScan !== b.keepScan) changes.push(`Keep a scan of each receipt: ${yesNo(b.keepScan)}`);
  if (a.requireScanToPost !== b.requireScanToPost) changes.push(`Require a scan before posting: ${yesNo(b.requireScanToPost)}`);
  if (a.blockPostingOnErrors !== b.blockPostingOnErrors) changes.push(`Block posting while a receipt has errors: ${yesNo(b.blockPostingOnErrors)}`);
  return changes;
}

/** Builds a log entry, or null when no record-keeping control changed. */
export function buildRecordKeepingLogEntry(
  before: Tracked,
  after: Tracked,
  who: { userId: string; name?: string },
  now: Date = new Date()
): RecordKeepingLogEntry | null {
  const changes = describeRecordKeepingChanges(before, after);
  if (changes.length === 0) return null;
  return {
    at: now.toISOString(),
    byUserId: who.userId,
    ...(who.name ? { byName: who.name } : {}),
    fromMode: before.recordKeepingMode,
    toMode: after.recordKeepingMode,
    changes,
  };
}
