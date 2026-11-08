/**
 * The inventory item form's checks (pure; see tests/inventory-sale.test.ts).
 *
 * Cost and price are text in the form. A blank one means "not set" (null), never zero, so an item
 * with no cost is reported on the balance sheet rather than valued at nothing.
 */
import { roundCents } from '@/lib/document-totals';

const QUANTITY_DECIMALS = 3;
const MAX_QUANTITY = 1_000_000;

const roundQuantity = (value: number) => Math.round(value * 10 ** QUANTITY_DECIMALS) / 10 ** QUANTITY_DECIMALS;

export interface ItemFormInput {
  name?: string | null;
  sku?: string | null;
  stockQuantity?: unknown;
  cost?: string | number | null;
  price?: string | number | null;
}

export interface CheckedItem {
  name: string;
  /** Empty when none; never undefined, because the database rejects undefined fields. */
  sku: string;
  stockQuantity: number;
  cost: number | null;
  price: number | null;
}

function parseMoney(label: string, raw: string | number | null | undefined, decimals: number): { value: number | null; error: string | null } {
  const text = String(raw ?? '').replace(/,/g, '').trim();
  if (text === '') return { value: null, error: null };
  if (!/^\d*\.?\d*$/.test(text) || text === '.') return { value: null, error: `${label} must be a number.` };
  const number = Number(text);
  if (!Number.isFinite(number) || number < 0) return { value: null, error: `${label} cannot be negative.` };
  const factor = 10 ** decimals;
  return { value: Math.round(number * factor) / factor, error: null };
}

/** Checks the item form. `others` are the other items, so a SKU already in use is caught. */
export function checkItemForm(
  input: ItemFormInput,
  others: readonly { id: string; name?: string; sku?: string }[],
  editingId?: string
): { error: null; value: CheckedItem } | { error: string; value: null } {
  const fail = (error: string) => ({ error, value: null } as const);

  const name = (input.name ?? '').trim();
  if (!name) return fail('Enter a name for the item.');

  const quantityText = input.stockQuantity;
  const stockQuantity = quantityText === '' || quantityText === null || quantityText === undefined ? 0 : Number(quantityText);
  if (!Number.isFinite(stockQuantity)) return fail('Stock must be a number.');
  if (stockQuantity < 0) return fail('Stock cannot be negative.');
  if (stockQuantity > MAX_QUANTITY) return fail(`Stock cannot be more than ${MAX_QUANTITY.toLocaleString('en-CA')}.`);
  if (roundQuantity(stockQuantity) !== stockQuantity) return fail(`Stock can have at most ${QUANTITY_DECIMALS} decimal places.`);

  // Unit cost keeps 4 decimals (a bolt can cost 0.0125); a selling price is whole cents.
  const cost = parseMoney('Unit cost', input.cost, 4);
  if (cost.error) return fail(cost.error);
  const price = parseMoney('Selling price', input.price, 2);
  if (price.error) return fail(price.error);

  const sku = (input.sku ?? '').trim();
  if (sku) {
    const clash = others.find((o) => o.id !== editingId && (o.sku ?? '').trim().toLowerCase() === sku.toLowerCase());
    if (clash) return fail(`The SKU "${sku}" is already used by "${clash.name || 'another item'}".`);
  }

  return {
    error: null,
    value: { name, sku, stockQuantity, cost: cost.value, price: price.value === null ? null : roundCents(price.value) },
  };
}
