/**
 * Capital Cost Allowance helpers (pure; see tests/cca.test.ts).
 *
 * CCA is a declining-balance deduction: each year you may claim up to the class rate times the
 * balance (UCC) left at the end of the year. In the year an asset is bought the half-year rule
 * limits the claim to half of the usual amount (the "Accelerated Investment Incentive" and some
 * classes change this; this is the standard rule and the figures are a maximum, not advice).
 *
 * The balance on an asset is the opening balance (what it was worth when entered) less the claims
 * recorded against it. It is kept as one derived number so the register, the totals and the
 * balance shown in the form can never disagree.
 */
import { roundCents } from '@/lib/document-totals';

/** Class rates (percent) for the classes offered in the asset form. */
export const CCA_RATES: Readonly<Record<string, number>> = {
  '1': 4,
  '8': 20,
  '10': 30,
  '10.1': 30,
  '12': 100,
  '16': 40,
  '43': 30,
  '45': 45,
  '50': 55,
  '53': 50,
};

export function ccaRateFor(assetClass: string | undefined): number | null {
  if (!assetClass) return null;
  return Object.prototype.hasOwnProperty.call(CCA_RATES, assetClass) ? CCA_RATES[assetClass] : null;
}

export interface DepreciationClaim {
  date: string;
  amount: number;
}

/**
 * The balance to show for an asset: the opening balance saved on it less the claims recorded against
 * it. The register, the financial snapshot and the loan application all use this, so a claim lowers
 * the balance everywhere instead of only inside the asset form.
 */
export function assetBalance(asset: { undepreciatedCapitalCost?: number; depreciationEntries?: readonly DepreciationClaim[] }): number {
  return remainingBalance(asset.undepreciatedCapitalCost ?? 0, asset.depreciationEntries ?? []);
}

/** What is left after the claims, to the cent, never below zero. */
export function remainingBalance(openingBalance: number, claims: readonly DepreciationClaim[]): number {
  const claimed = claims.reduce((sum, claim) => sum + (Number(claim.amount) || 0), 0);
  return Math.max(0, roundCents((Number(openingBalance) || 0) - claimed));
}

/** Total claimed in one calendar year. */
export function claimedInYear(claims: readonly DepreciationClaim[], year: number): number {
  return roundCents(
    claims
      .filter((claim) => Number(String(claim.date).slice(0, 4)) === year)
      .reduce((sum, claim) => sum + (Number(claim.amount) || 0), 0)
  );
}

/**
 * The most CCA that can be claimed for a year. `balanceBeforeClaims` is the balance at the start of
 * that year's claims. In the purchase year the half-year rule halves the claim.
 */
export function maxClaimForYear(params: {
  assetClass: string | undefined;
  balanceBeforeClaims: number;
  year: number;
  purchaseYear: number;
  applyHalfYearRule: boolean;
}): number | null {
  const rate = ccaRateFor(params.assetClass);
  if (rate === null) return null;
  const balance = Math.max(0, Number(params.balanceBeforeClaims) || 0);
  const half = params.applyHalfYearRule && params.year === params.purchaseYear;
  return roundCents(balance * (rate / 100) * (half ? 0.5 : 1));
}

export interface ClaimCheck {
  ok: boolean;
  message?: string;
  /** Set when the claim is allowed but above the usual maximum for the class. */
  warning?: string;
}

/** Whether a claim can be recorded: positive, within the balance, and a warning above the class maximum. */
export function checkClaim(params: {
  amount: number;
  date: string;
  balance: number;
  assetClass: string | undefined;
  purchaseDate: string;
  applyHalfYearRule: boolean;
  existingClaims: readonly DepreciationClaim[];
  openingBalance: number;
}): ClaimCheck {
  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: 'Enter an amount greater than zero.' };
  if (roundCents(amount) > roundCents(params.balance) + 0.001) {
    return { ok: false, message: 'A claim cannot be more than the balance left on the asset.' };
  }
  const year = Number(params.date.slice(0, 4));
  const purchaseYear = Number(params.purchaseDate.slice(0, 4));
  if (!Number.isFinite(year)) return { ok: false, message: 'Choose a valid date.' };
  if (Number.isFinite(purchaseYear) && year < purchaseYear) {
    return { ok: false, message: 'A claim cannot be dated before the year the asset was bought.' };
  }
  const priorClaims = params.existingClaims.filter((claim) => Number(String(claim.date).slice(0, 4)) < year);
  const balanceAtStartOfYear = remainingBalance(params.openingBalance, priorClaims);
  const max = maxClaimForYear({
    assetClass: params.assetClass,
    balanceBeforeClaims: balanceAtStartOfYear,
    year,
    purchaseYear,
    applyHalfYearRule: params.applyHalfYearRule,
  });
  if (max !== null) {
    const claimedSoFar = claimedInYear(params.existingClaims, year);
    if (roundCents(claimedSoFar + amount) > max + 0.005) {
      return { ok: true, warning: `Claims for ${year} would total ${roundCents(claimedSoFar + amount).toFixed(2)}, above the usual maximum of ${max.toFixed(2)} for this class.` };
    }
  }
  return { ok: true };
}
