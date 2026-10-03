// One-off coverage check: simulate manage-dashboard-view.tsx grouping rules
// against the real menu inventories to confirm "Other Actions" stays small.
const fs = require('fs');

const mm = fs.readFileSync('src/components/layout/main-menu.tsx', 'utf8');
const block = mm.match(/export const groupedMenuItems[^{]*\{([\s\S]*?)\n\};/)[1];
const groupHrefs = [...block.matchAll(/['"]\/[^'"]*['"]/g)].map((m) => m[0].slice(1, -1));

const menu = fs.readFileSync('src/lib/menu-items.ts', 'utf8');
const core = [...menu.matchAll(/\{ href: "([^"]+)"/g)].map((m) => m[1]);
const acct = [...fs.readFileSync('src/data/accounting-menu-items.ts', 'utf8').matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
const hr = [...fs.readFileSync('src/data/hr-menu-items.ts', 'utf8').matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);

const all = [...new Set([...core, ...acct, ...hr])];
const exact = new Set(groupHrefs);
const prefixes = ['/accounting', '/action-manager', '/hr-manager', '/field-app', '/settings', '/inventory-manager', '/inquiries'];

const inExact = all.filter((h) => exact.has(h.split('?')[0].split('#')[0]));
const inPrefix = all.filter((h) => {
  const p = h.split('?')[0].split('#')[0];
  return !exact.has(p) && prefixes.some((pre) => p === pre || p.startsWith(pre + '/'));
});
const other = all.filter(
  (h) => !exact.has(h.split('?')[0].split('#')[0]) && !prefixes.some((pre) => { const p = h.split('?')[0]; return p === pre || p.startsWith(pre + '/'); })
);

console.log(`total unique hrefs : ${all.length}`);
console.log(`exact group match  : ${inExact.length}`);
console.log(`prefix rule match  : ${inPrefix.length}`);
console.log(`OTHER bucket       : ${other.length} -> ${other.join(', ') || '(empty)'}`);
