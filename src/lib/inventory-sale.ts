/**
 * Inventory item and Point of Sale rules (pure; see tests/inventory-sale.test.ts).
 *
 * A sale must take stock out exactly once for what was sold, at the price on the item, rounded to
 * the cent. A quantity has to be a positive number, otherwise a "sale" of -3 puts stock back and
 * records negative income. An item form must have a name, sane numbers and a SKU nobody else has.
 */
import { roundCents } from '@/lib/document-totals';

/** Quantities may be fractional (metres, kilograms) up to this many decimals. */
const QUANTITY_DECIMALS = 3;
const MAX_QUANTITY = 1_000_000;

const roundQuantity = (value: number) => Math.round(value * 10 ** QUANTITY_DECIMALS) / 10 ** QUANTITY_DECIMALS;

export interface SellableLike {
  type?: string;
  dispositionDate?: Date | string | null;
}

/** Internal supplies are used up in the business and disposed items are gone, so neither is for sale. */
export function isSellable(item: SellableLike): boolean {
  return !item.dispositionDate && item.type !== 'Internal Supply';
}

export type QuantityCheck = { quantity: number; error: null } | { quantity: null; error: string };

/** A quantity to sell or stock: a positive, finite number with at most 3 decimals. */
export function checkSaleQuantity(value: unknown): QuantityCheck {
  if (value === '' || value === null || value === undefined) return { quantity: null, error: 'Enter a quantity.' };
  const number = Number(value);
  if (!Number.isFinite(number)) return { quantity: null, error: 'The quantity must be a number.' };
  if (number <= 0) return { quantity: null, error: 'The quantity must be more than zero.' };
  if (number > MAX_QUANTITY) return { quantity: null, error: `The quantity cannot be more than ${MAX_QUANTITY.toLocaleString('en-CA')}.` };
  if (roundQuantity(number) !== number) return { quantity: null, error: `The quantity can have at most ${QUANTITY_DECIMALS} decimal places.` };
  return { quantity: number, error: null };
}

export interface SaleLine {
  itemId: string;
  quantity: number;
}

/** Total quantity per item. The same item on two lines (say, with different tax types) is one stock movement. */
export function quantitiesByItem(lines: readonly SaleLine[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) totals.set(line.itemId, roundQuantity((totals.get(line.itemId) ?? 0) + line.quantity));
  return totals;
}

/** Why this much cannot be sold from this stock, or null when it can. */
export function stockProblem(name: string, onHand: number, wanted: number): string | null {
  if (wanted <= onHand) return null;
  return `Only ${roundQuantity(Math.max(0, onHand))} of ${name} in stock, but ${wanted} were requested.`;
}

/** Why an item cannot be sold at its stored price, or null when it can. A price of 0 is allowed only if it was entered. */
export function priceProblem(name: string, price: number | null | undefined): string | null {
  if (price === null || price === undefined || !Number.isFinite(Number(price)) || Number(price) < 0) {
    return `${name} has no selling price. Set one in Inventory Central before selling it.`;
  }
  return null;
}

/** "Widget x2, Gadget x1 and 2 more", for the ledger entry's description. */
export function describeSale(parts: readonly { name: string; quantity: number }[], show = 3): string {
  if (parts.length === 0) return 'POS Sale';
  const shown = parts.slice(0, show).map((p) => `${p.name} x${p.quantity}`);
  const more = parts.length - shown.length;
  return `POS Sale: ${shown.join(', ')}${more > 0 ? ` and ${more} more` : ''}`;
}

export interface StockItem extends SellableLike {
  id: string;
  name: string;
  stockQuantity: number;
  price?: number | null;
}

export interface CartLine {
  itemId: string;
  quantity: number;
  /** Tax rate as a percentage; missing means untaxed. */
  taxRate?: number | null;
}

export interface SalePlan {
  /** One stock movement per item, with the stock left after the sale. */
  movements: { itemId: string; name: string; quantity: number; newQuantity: number }[];
  /** Whole cents, worked out line by line from the prices stored on the items (not from what the screen showed). */
  subtotal: number;
  tax: number;
  total: number;
  description: string;
}

/**
 * Plans a sale from the items as they are NOW in the database. The screen's copy of the stock and
 * prices can be stale (another till, another tab), so the check and the money both come from here.
 * Returns the first problem as a message, or the plan.
 */
export function planSale(
  items: ReadonlyMap<string, StockItem>,
  lines: readonly CartLine[]
): { plan: SalePlan; error: null } | { plan: null; error: string } {
  if (lines.length === 0) return { plan: null, error: 'Add at least one item to the sale.' };

  let subtotal = 0;
  let tax = 0;
  for (const line of lines) {
    const item = items.get(line.itemId);
    if (!item) return { plan: null, error: 'An item in this sale no longer exists. Remove it and try again.' };
    if (!isSellable(item)) return { plan: null, error: `${item.name} is not for sale.` };
    const quantity = checkSaleQuantity(line.quantity);
    if (quantity.quantity === null) return { plan: null, error: `${item.name}: ${quantity.error}` };
    const problem = priceProblem(item.name, item.price);
    if (problem) return { plan: null, error: problem };

    const net = roundCents(Number(item.price) * quantity.quantity);
    subtotal += net;
    tax += roundCents(net * ((Number(line.taxRate) || 0) / 100));
  }

  const movements: SalePlan['movements'] = [];
  for (const [itemId, quantity] of quantitiesByItem(lines)) {
    const item = items.get(itemId)!;
    const problem = stockProblem(item.name, Number(item.stockQuantity) || 0, quantity);
    if (problem) return { plan: null, error: problem };
    movements.push({ itemId, name: item.name, quantity, newQuantity: roundQuantity((Number(item.stockQuantity) || 0) - quantity) });
  }

  subtotal = roundCents(subtotal);
  tax = roundCents(tax);
  return {
    error: null,
    plan: {
      movements,
      subtotal,
      tax,
      total: roundCents(subtotal + tax),
      description: describeSale(movements.map((m) => ({ name: m.name, quantity: m.quantity }))),
    },
  };
}

