'use client';

import React from 'react';
import Link from 'next/link';
import type { BalanceSheetNotes } from '@/lib/balance-sheet-inputs';

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/**
 * What the balance sheet could not include, in plain words, so nobody reads a figure as complete when it is not.
 * Shows nothing when there is nothing to say.
 */
export function BalanceSheetNotesPanel({ notes }: { notes: BalanceSheetNotes }) {
  const lines: React.ReactNode[] = [];

  if (notes.accountsWithoutOpeningBalance > 0) {
    lines.push(
      <li key="opening">
        {notes.accountsWithoutOpeningBalance} bank or cash account{notes.accountsWithoutOpeningBalance === 1 ? ' has' : 's have'} no opening balance, so
        its cash counts only the deposits and payments recorded in Ogeemo. Add the opening balance and date in{' '}
        <Link href="/accounting/bank-statements" className="underline">Bank Statements</Link>.
      </li>
    );
  }
  if (notes.unassignedCashCount > 0) {
    lines.push(
      <li key="unassigned">
        {notes.unassignedCashCount} ledger entr{notes.unassignedCashCount === 1 ? 'y was' : 'ies were'} paid from or deposited to an account that is not in your
        account list (net {money(notes.unassignedCashNet)}). {notes.unassignedCashCount === 1 ? 'It is' : 'They are'} not in the cash figure.
      </li>
    );
  }
  if (notes.uncostedInventoryItems > 0) {
    lines.push(
      <li key="uncosted">
        {notes.uncostedInventoryItems} stock item{notes.uncostedInventoryItems === 1 ? ' has' : 's have'} no unit cost, so {notes.uncostedInventoryItems === 1 ? 'it is' : 'they are'} not in the inventory value.
      </li>
    );
  }
  if (notes.negativeStockItems > 0) {
    lines.push(
      <li key="negative">
        {notes.negativeStockItems} stock item{notes.negativeStockItems === 1 ? ' shows' : 's show'} a negative quantity, counted as zero. Check the stock count.
      </li>
    );
  }
  if (lines.length === 0) return null;

  return (
    <div className="md:col-span-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
      <p className="mb-1 font-semibold">What this balance sheet does not fully include</p>
      <ul className="list-disc space-y-1 pl-4">{lines}</ul>
    </div>
  );
}
