/**
 * Products & Services catalogue rules (pure; see tests/service-items.test.ts).
 *
 * The catalogue holds reusable lines (description, price, tax) for quotes and invoices. Two rules
 * matter most:
 *  - Choosing "None" for tax means 0%. It used to fall back to the workspace default rate, so a
 *    "no tax" item was saved with tax.
 *  - A document line copies the catalogue price when it is added. Changing the catalogue later must
 *    not silently reprice a document that was already saved or issued, so lines are only refreshed
 *    from the catalogue while the document is still a draft.
 */
import { roundCents } from '@/lib/document-totals';

export type ItemKind = 'service' | 'product';

export interface ItemForm {
  description: string;
  price: string | number;
  taxType: string;
  taxRate: string | number;
  itemType?: ItemKind;
}

export interface CleanItem {
  description: string;
  price: number;
  taxType: string;
  taxRate: number;
  itemType: ItemKind;
}

export const NO_TAX = 'None';

function number(value: unknown): number | null {
  const text = typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
  if (text === '' || text === null || text === undefined) return null;
  const parsed = typeof text === 'string' ? parseFloat(text) : Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The tax type and rate to store for a choice. None (or nothing chosen) is always 0%. */
export function taxForChoice(
  chosenName: string,
  taxTypes: readonly { name: string; rate: number }[]
): { taxType: string; taxRate: number } {
  if (!chosenName || chosenName === NO_TAX) return { taxType: '', taxRate: 0 };
  const found = taxTypes.find((t) => t.name === chosenName);
  return found ? { taxType: found.name, taxRate: Number(found.rate) || 0 } : { taxType: '', taxRate: 0 };
}

/** Why an item cannot be saved, or the cleaned item (price to the cent, rate 0-100, name trimmed). */
export function validateServiceItem(form: ItemForm): { error: string } | { error: null; item: CleanItem } {
  const description = form.description.trim();
  if (!description) return { error: 'Enter a description for the item.' };
  const price = number(form.price);
  if (price === null) return { error: 'Enter a price (0 is allowed for a free item).' };
  if (price < 0) return { error: 'The price cannot be negative.' };
  const rate = number(form.taxRate) ?? 0;
  if (rate < 0 || rate > 100) return { error: 'The tax rate must be between 0 and 100 percent.' };
  const taxType = !form.taxType || form.taxType === NO_TAX ? '' : form.taxType;
  return {
    error: null,
    item: { description, price: roundCents(price), taxType, taxRate: taxType === '' && rate === 0 ? 0 : rate, itemType: form.itemType === 'product' ? 'product' : 'service' },
  };
}

/** True when another item already has this description (ignoring case and spacing), for a duplicate warning. */
export function isDuplicateDescription(
  items: readonly { id: string; description: string }[],
  description: string,
  ignoreId?: string
): boolean {
  const key = description.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!key) return false;
  return items.some((item) => item.id !== ignoreId && item.description.trim().toLowerCase().replace(/\s+/g, ' ') === key);
}

export interface LineLike {
  serviceItemId?: string;
  description: string;
  price: number;
  taxType?: string;
  taxRate?: number;
}

export interface LibraryItemLike {
  id: string;
  description: string;
  price: number;
  taxType?: string;
  taxRate?: number;
}

/** Only a document that is still a draft (or brand new) follows catalogue changes; saved and issued ones keep their prices. */
export function followsCatalogue(documentStatus: string | null | undefined, isSaved: boolean): boolean {
  if (!isSaved) return true;
  return documentStatus === 'draft';
}

/**
 * Refreshes lines that came from the catalogue so they match it now. Lines with no catalogue link, or whose
 * item was deleted, are left alone. Returns the same array when nothing changed.
 */
export function refreshFromCatalogue<T extends LineLike>(lines: readonly T[], library: readonly LibraryItemLike[], follow: boolean): T[] {
  if (!follow) return lines as T[];
  let changed = false;
  const next = lines.map((line) => {
    if (!line.serviceItemId) return line;
    const item = library.find((entry) => entry.id === line.serviceItemId);
    if (!item) return line;
    const same =
      item.price === line.price &&
      item.description === line.description &&
      (item.taxType || '') === (line.taxType || '') &&
      (item.taxRate || 0) === (line.taxRate || 0);
    if (same) return line;
    changed = true;
    return { ...line, description: item.description, price: item.price, taxType: item.taxType || '', taxRate: item.taxRate || 0 };
  });
  return changed ? next : (lines as T[]);
}
