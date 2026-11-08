import assert from 'node:assert/strict';
import test from 'node:test';

import { printStyleValue } from '../src/lib/print-clone';

test('screen-sized layout properties are not copied, so tables reflow to the page width', () => {
  for (const property of [
    'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'inline-size', 'block-size', 'min-inline-size', 'max-inline-size',
    'margin-left', 'margin-right', 'margin-inline-start', 'margin-inline-end',
    'grid-template-columns', 'grid-template-rows', 'left', 'right', 'transform-origin',
  ]) {
    assert.equal(printStyleValue(property, '1100px'), null, property);
  }
});

test('the styles that make the printout look right are still copied unchanged', () => {
  for (const [property, value] of [
    ['color', 'rgb(22, 163, 74)'],
    ['font-family', 'ui-monospace, monospace'],
    ['font-weight', '700'],
    ['text-align', 'right'],
    ['background-color', 'rgb(244, 244, 245)'],
    ['border-bottom-width', '1px'],
    ['padding-left', '8px'],
    ['display', 'table-cell'],
    ['table-layout', 'auto'],
    ['border-collapse', 'collapse'],
    ['margin-top', '16px'],
    ['margin-bottom', '16px'],
  ] as const) {
    assert.equal(printStyleValue(property, value), value, property);
  }
});

test('visibility is always copied: the global print stylesheet hides everything not marked visible', () => {
  assert.equal(printStyleValue('visibility', 'visible'), 'visible');
  assert.equal(printStyleValue('visibility', 'hidden'), 'hidden');
});

test('a scrolling container is opened up so nothing inside it is clipped on paper', () => {
  assert.equal(printStyleValue('overflow', 'auto'), 'visible');
  assert.equal(printStyleValue('overflow-x', 'scroll'), 'visible');
  assert.equal(printStyleValue('overflow-y', 'auto'), 'visible');
  assert.equal(printStyleValue('overflow', 'visible'), 'visible');
});

test('a container that deliberately hides overflow keeps doing so', () => {
  assert.equal(printStyleValue('overflow', 'hidden'), 'hidden');
  assert.equal(printStyleValue('overflow-x', 'clip'), 'clip');
});

test('only the listed layout properties are dropped: a sample of everything else passes through', () => {
  const dropped = new Set([
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'inline-size', 'block-size', 'min-inline-size', 'min-block-size', 'max-inline-size', 'max-block-size',
    'margin-left', 'margin-right', 'margin-inline-start', 'margin-inline-end',
    'grid-template-columns', 'grid-template-rows', 'left', 'right', 'inset-inline-start', 'inset-inline-end',
    'perspective-origin', 'transform-origin',
  ]);
  for (const property of ['position', 'top', 'bottom', 'flex-direction', 'gap', 'line-height', 'letter-spacing', 'white-space', 'opacity', 'z-index']) {
    assert.ok(!dropped.has(property));
    assert.equal(printStyleValue(property, 'x'), 'x', property);
  }
});
