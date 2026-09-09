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

test.describe('native event system', () => {
  test('dispatches click handlers', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__count = 0;

      H.createRoot(document.querySelector('#app')).render(
        H.h('button', { onClick: () => window.__count++ }, 'Run'),
      );
    });

    await page.getByRole('button').click();
    expect(await page.evaluate(() => window.__count)).toBe(1);
  });

  test('updates handler without replacing the element', async ({ page }) => {
    await fresh(page);

    const same = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__calls = [];

      const a = document.querySelector('#app');
      const r = H.createRoot(a);
      r.render(H.h('button', { onClick: () => window.__calls.push('a') }, 'x'));

      const b = a.firstElementChild;
      r.render(H.h('button', { onClick: () => window.__calls.push('b') }, 'x'));
      return b === a.firstElementChild;
    });

    expect(same).toBe(true);
    await page.getByRole('button').click();

    expect(await page.evaluate(() => window.__calls)).toEqual(['b']);
  });

  test('removes a handler when the prop disappears', async ({ page }) => {
    await fresh(page);

    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__count = 0;

      const a = document.querySelector('#app');
      const r = H.createRoot(a);

      r.render(H.h('button', { onClick: () => window.__count++ }, 'x'));
      r.render(H.h('button', null, 'x'));
    });

    await page.getByRole('button').click();
    expect(await page.evaluate(() => window.__count)).toBe(0);
  });

  test('runs capture handlers before bubble handlers', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__order = [];

      H.createRoot(document.querySelector('#app')).render(
        H.h(
          'div',
          {
            onClickCapture: () => window.__order.push('capture'),
            onClick: () => window.__order.push('bubble'),
          },
          H.h('button', null, 'x'),
        ),
      );
    });

    await page.getByRole('button').click();
    expect(await page.evaluate(() => window.__order)).toEqual(['capture', 'bubble']);
  });

  test('runs once listeners only once', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__count = 0;

      H.createRoot(document.querySelector('#app')).render(
        H.h('button', { onClickOnce: () => window.__count++ }, 'x'),
      );
    });

    await page.getByRole('button').click();
    await page.getByRole('button').click();

    expect(await page.evaluate(() => window.__count)).toBe(1);
  });

  test('re-arms a once listener on a later render', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__count = 0;
      window.__root = H.createRoot(document.querySelector('#app'));
      window.__handler = () => window.__count++;
      window.__root.render(H.h('button', { onClickOnce: window.__handler }, 'x'));
    });

    await page.getByRole('button').click();
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__root.render(H.h('button', { onClickOnce: window.__handler }, 'x'));
    });

    await page.getByRole('button').click();
    expect(await page.evaluate(() => window.__count)).toBe(2);
  });

  test('maps onDblClick to dblclick', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__count = 0;

      H.createRoot(document.querySelector('#app')).render(
        H.h('button', { onDblClick: () => window.__count++ }, 'x'),
      );
    });

    await page.getByRole('button').dblclick();
    expect(await page.evaluate(() => window.__count)).toBe(1);
  });

  test('maps onDoubleClick to dblclick', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__count = 0;

      H.createRoot(document.querySelector('#app')).render(
        H.h('button', { onDoubleClick: () => window.__count++ }, 'x'),
      );
    });

    await page.getByRole('button').dblclick();
    expect(await page.evaluate(() => window.__count)).toBe(1);
  });

  test('handles input events', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__value = '';

      H.createRoot(document.querySelector('#app')).render(
        H.h('input', { onInput: (e) => (window.__value = e.currentTarget.value) }),
      );
    });

    await page.locator('input').fill('hello');
    expect(await page.evaluate(() => window.__value)).toBe('hello');
  });

  test('handles keyboard events', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__key = '';

      H.createRoot(document.querySelector('#app')).render(
        H.h('input', { onKeyDown: (e) => (window.__key = e.key) }),
      );
    });

    await page.locator('input').press('Enter');
    expect(await page.evaluate(() => window.__key)).toBe('Enter');
  });

  test('supports custom native event names through on* props', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__count = 0;

      const a = document.querySelector('#app');
      H.createRoot(a).render(H.h('div', { onAnimationEnd: () => window.__count++ }, 'x'));
      a.firstElementChild.dispatchEvent(new Event('animationend'));
    });

    expect(await page.evaluate(() => window.__count)).toBe(1);
  });

  test('passive listeners cannot cancel a cancelable event', async ({ page }) => {
    await fresh(page);

    const prevented = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = document.querySelector('#app');
      H.createRoot(a).render(H.h('div', { onWheelPassive: (e) => e.preventDefault() }, 'x'));

      const event = new WheelEvent('wheel', { cancelable: true });
      a.firstElementChild.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(prevented).toBe(false);
  });

  test('clears native listeners when an element unmounts', async ({ page }) => {
    await fresh(page);

    const count = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      let calls = 0;

      const a = document.querySelector('#app');
      const r = H.createRoot(a);
      r.render(H.h('button', { onClick: () => calls++ }, 'x'));

      const old = a.firstElementChild;
      r.render(null);

      old.dispatchEvent(new Event('click'));
      return calls;
    });
    expect(count).toBe(0);
  });
});
