import type { MenuItem } from '@/lib/menu-items';

export type MenuSortDirection = 'asc' | 'desc';

export function sortMenuItemsByLabel(items: MenuItem[], direction: MenuSortDirection): MenuItem[] {
    return [...items].sort((firstItem, secondItem) => (
        direction === 'asc'
            ? firstItem.label.localeCompare(secondItem.label)
            : secondItem.label.localeCompare(firstItem.label)
    ));
}

export function filterMenuItems(items: MenuItem[], query: string): MenuItem[] {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);

    if (terms.length === 0) return items;

    return items.filter((item) => {
        const words = item.label.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
        return terms.every((term) => words.some((word) => word.startsWith(term)));
    });
}