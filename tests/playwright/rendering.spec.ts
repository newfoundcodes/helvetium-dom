/*
 * Helvetium DOM - Helvetium Framework, A Newfoundcodes project.
 *
 * Copyright (C) 2026 Jonathan Eldy Baldivicio
 *
 * Author: Jonathan Eldy Baldivicio
 * Contact: jonathaneldy.baldivicio@newfoundcodes.com
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { expect, test, type Page } from '@playwright/test';

async function fresh(page: Page): Promise<void> {
  await page.goto('/tests/playwright/fixture.html');
}

test.describe('rendering and DOM props', () => {
  test('renders a primitive text child', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      H.createRoot(document.querySelector('#app')).render(H.h('p', null, 'hello'));
    });
    await expect(page.locator('#app p')).toHaveText('hello');
  });

  test('patches text without replacing the element', async ({ page }) => {
    await fresh(page);
    const same = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const app = document.querySelector('#app');
      const root = H.createRoot(app);
      root.render(H.h('p', null, 'one'));

      const first = app.firstElementChild;
      root.render(H.h('p', null, 'two'));
      return first === app.firstElementChild;
    });

    expect(same).toBe(true);
    await expect(page.locator('#app p')).toHaveText('two');
  });

  test('clears pre-existing children on first client render', async ({ page }) => {
    await fresh(page);
    await page.locator('#app').evaluate((el) => {
      el.innerHTML = '<span>stale</span>';
    });

    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      H.createRoot(document.querySelector('#app')).render(H.h('strong', null, 'fresh'));
    });

    await expect(page.locator('#app span')).toHaveCount(0);
    await expect(page.locator('#app strong')).toHaveText('fresh');
  });

  test('maps className to class', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      H.createRoot(document.querySelector('#app')).render(H.h('div', { className: 'card' }, 'x'));
    });
    await expect(page.locator('#app div')).toHaveClass('card');
  });

  test('removes attributes absent from the next render', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = document.querySelector('#app');
      const r = H.createRoot(a);

      r.render(H.h('div', { title: 'old', 'data-x': '1' }, 'x'));
      r.render(H.h('div', null, 'x'));
    });

    await expect(page.locator('#app div')).not.toHaveAttribute('title');
    await expect(page.locator('#app div')).not.toHaveAttribute('data-x');
  });

  test('patches boolean properties', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = document.querySelector('#app');
      const r = H.createRoot(a);

      r.render(H.h('button', { disabled: true }, 'x'));
    });

    await expect(page.locator('button')).toBeDisabled();
  });

  test('patches live input value through the DOM property', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = document.querySelector('#app');
      const r = H.createRoot(a);

      r.render(H.h('input', { value: 'alpha' }));
      r.render(H.h('input', { value: 'beta' }));
    });
    await expect(page.locator('input')).toHaveValue('beta');
  });

  test('serializes data and aria attributes in the client DOM', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      H.createRoot(document.querySelector('#app')).render(
        H.h('button', { 'data-action': 'save', 'aria-pressed': false }, 'Save'),
      );
    });

    await expect(page.locator('button')).toHaveAttribute('data-action', 'save');
    await expect(page.locator('button')).toHaveAttribute('aria-pressed', 'false');
  });

  test('adds px to dimensional numeric style values', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      H.createRoot(document.querySelector('#app')).render(
        H.h('div', { style: { width: 12 } }, 'x'),
      );
    });

    expect(await page.locator('#app div').evaluate((el) => getComputedStyle(el).width)).toBe(
      '12px',
    );
  });

  test('keeps unitless style values unitless', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      H.createRoot(document.querySelector('#app')).render(
        H.h('div', { style: { opacity: 0.5 } }, 'x'),
      );
    });

    await expect(page.locator('#app div')).toHaveCSS('opacity', '0.5');
  });

  test('supports CSS custom properties', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      H.createRoot(document.querySelector('#app')).render(
        H.h('div', { style: { '--gap': 8 } }, 'x'),
      );
    });

    expect(
      await page
        .locator('#app div')
        .evaluate((el) => (el as HTMLElement).style.getPropertyValue('--gap')),
    ).toBe('8');
  });

  test('supports string cssText styles', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      H.createRoot(document.querySelector('#app')).render(
        H.h('div', { style: 'display:block; margin-left: 3px' }, 'x'),
      );
    });

    await expect(page.locator('#app div')).toHaveCSS('display', 'block');
    await expect(page.locator('#app div')).toHaveCSS('margin-left', '3px');
  });

  test('removes stale object style keys', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = document.querySelector('#app');
      const r = H.createRoot(a);

      r.render(H.h('div', { style: { width: 20, height: 30 } }, 'x'));
      r.render(H.h('div', { style: { width: 25 } }, 'x'));
    });

    expect(await page.locator('#app div').evaluate((el) => (el as HTMLElement).style.height)).toBe(
      '',
    );
  });

  test('renders trusted dangerouslySetInnerHTML', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      H.createRoot(document.querySelector('#app')).render(
        H.h('div', { dangerouslySetInnerHTML: { __html: '<em>trusted</em>' } }),
      );
    });

    await expect(page.locator('#app em')).toHaveText('trusted');
  });

  test('switches from raw HTML back to VDOM children', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = document.querySelector('#app');
      const r = H.createRoot(a);

      r.render(H.h('div', { dangerouslySetInnerHTML: { __html: '<em>raw</em>' } }));
      r.render(H.h('div', null, H.h('span', null, 'vdom')));
    });

    await expect(page.locator('#app em')).toHaveCount(0);
    await expect(page.locator('#app span')).toHaveText('vdom');
  });

  test('normalizes nested primitive child arrays', async ({ page }) => {
    await fresh(page);

    const result = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const c = H.normalizeChildren(['a', [1, null, false, ['b']]]);
      return { length: c.length, text: c.map((v) => v.props.nodeValue ?? '').join('|') };
    });

    expect(result).toEqual({ length: 1, text: 'a1b' });
  });
});
