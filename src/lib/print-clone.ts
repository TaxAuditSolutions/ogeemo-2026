/**
 * Which computed styles the print helper copies (pure; see tests/print-clone.test.ts).
 *
 * The print window gets a clone of the on-screen content with every computed style written
 * inline. That is needed for colours, fonts and `visibility` (the global print stylesheet hides
 * everything that is not explicitly shown). But the computed WIDTH, HEIGHT and horizontal MARGINS
 * are resolved to pixels at the screen's layout: a table 1100px wide on screen stayed 1100px on a
 * page about 700px wide, so its right-hand columns (amounts) ran off the paper and were clipped.
 * Those properties are left out, so the content lays itself out to the page width using the
 * same class rules, which are copied into the print window as a stylesheet.
 */

/** Layout properties that hold a screen-sized pixel value and must reflow to the page. */
const LAYOUT_PROPS = new Set([
  'width', 'height',
  'min-width', 'min-height', 'max-width', 'max-height',
  'inline-size', 'block-size',
  'min-inline-size', 'min-block-size', 'max-inline-size', 'max-block-size',
  // Auto margins (mx-auto) resolve to the pixel gap on the screen, which then pushes content off the page.
  'margin-left', 'margin-right', 'margin-inline-start', 'margin-inline-end',
  // Grid tracks resolve to fixed pixel columns.
  'grid-template-columns', 'grid-template-rows',
  // Offsets and origins that are derived from the element's on-screen size.
  'left', 'right', 'inset-inline-start', 'inset-inline-end',
  'perspective-origin', 'transform-origin',
]);

/** Scrolling containers cannot scroll on paper, so whatever they hold must show in full. */
const SCROLL_OVERFLOW = new Set(['auto', 'scroll']);

/**
 * The value to write inline for a computed property in the print clone, or null to leave the
 * property out (so the stylesheet and the page width decide it).
 */
export function printStyleValue(property: string, value: string): string | null {
  if (LAYOUT_PROPS.has(property)) return null;
  if ((property === 'overflow' || property === 'overflow-x' || property === 'overflow-y') && SCROLL_OVERFLOW.has(value)) {
    return 'visible';
  }
  return value;
}
