/**
 * Inventory on hand, for the balance sheet (pure; see tests/inventory-value.test.ts).
 *
 * Value is the quantity in stock times the unit COST (what you paid), never the selling price.
 * Products for sale and raw materials are inventory. Internal supplies (paper, cleaning
 * products) are consumed in running the business and are expensed, so they are not an asset.
 * Items with no cost recorded cannot be valued; they are counted and reported rather than
 * silently valued at nothing. Items that were disposed of are not on hand.
 */
import { roundCents } from '@/lib/document-totals';

export interface InventoryLike {
  name?: string;
  type?: string;
  stockQuantity?: number | null;
  cost?: number | null;
  dispositionDate?: Date | string | null;
}

/** The item types that are an asset on the balance sheet. */
export const ASSET_ITEM_TYPES = ['Product for Sale', 'Raw Material'] as const;

export interface InventoryValuation {
  /** Stock x cost for items that count and have a cost. */
  value: number;
  /** Items included in the value. */
  valuedItems: number;
  /** Items on hand that count but have no cost, so they are NOT in the value. */
  uncostedItems: number;
  /** Items left out because they are internal supplies. */
  suppliesExcluded: number;
  /** Items with a negative stock figure, which cannot be real (counted as zero). */
  negativeStockItems: number;
}

export function isInventoryAsset(item: InventoryLike): boolean {
  return (ASSET_ITEM_TYPES as readonly string[]).includes(item.type ?? '');
}

export function valueInventory(items: readonly InventoryLike[]): InventoryValuation {
  let value = 0;
  let valuedItems = 0;
  let uncostedItems = 0;
  let suppliesExcluded = 0;
  let negativeStockItems = 0;

  for (const item of items) {
    if (item.dispositionDate) continue;
    if (!isInventoryAsset(item)) {
      if (item.type === 'Internal Supply') suppliesExcluded += 1;
      continue;
    }
    const quantity = Number(item.stockQuantity) || 0;
    if (quantity < 0) negativeStockItems += 1;
    const onHand = Math.max(0, quantity);
    if (onHand === 0) continue;
    const cost = item.cost;
    if (cost === null || cost === undefined || !Number.isFinite(Number(cost)) || Number(cost) <= 0) {
      uncostedItems += 1;
      continue;
    }
    value += roundCents(onHand * Number(cost));
    valuedItems += 1;
  }

  return { value: roundCents(value), valuedItems, uncostedItems, suppliesExcluded, negativeStockItems };
}
