/**
 * Which account a bank statement belongs to.
 *
 * Reconciling a statement proves which account the money moved through, so the entries it creates
 * or confirms are recorded against that account rather than a generic "Bank Account". That is what
 * lets the balance sheet place the cash.
 */

export interface StatementAccount {
  id: string;
  name: string;
  type?: 'Bank' | 'Credit Card' | 'Cash' | 'Other';
  businessType?: 'Business' | 'Personal';
}

/** Names that mean "some cash, no particular account". The petty cash box is a real place, so it is not here. */
const GENERIC_ACCOUNT_NAMES = new Set(['cash / default', 'bank account', 'cash account', 'default', '']);

export function isGenericAccountName(name: string | undefined | null): boolean {
  return GENERIC_ACCOUNT_NAMES.has((name ?? '').trim().toLowerCase());
}

/** Business accounts a statement can be for. A personal account's statement does not belong in the business ledger. */
export function accountsForStatement<T extends StatementAccount>(accounts: readonly T[]): T[] {
  return accounts.filter((account) => account.businessType !== 'Personal' && account.name.trim() !== '');
}

/**
 * The account to record on an entry that a statement row confirms. An entry already tied to a real
 * account keeps it (the statement is not allowed to quietly move it); one that names no particular
 * account is assigned to the statement's account.
 */
export function accountAfterReconcile(currentName: string | undefined | null, statementAccountName: string): string {
  return isGenericAccountName(currentName) ? statementAccountName : (currentName as string);
}

/** Looks up the account chosen in the picker. Returns a message instead of an account when none is usable. */
export function chooseStatementAccount<T extends StatementAccount>(
  accounts: readonly T[],
  chosenId: string
): { account: T; error: null } | { account: null; error: string } {
  if (!chosenId) return { account: null, error: 'Choose the account this statement is for.' };
  const account = accountsForStatement(accounts).find((a) => a.id === chosenId);
  if (!account) return { account: null, error: 'That account is no longer available. Choose the account again.' };
  return { account, error: null };
}
