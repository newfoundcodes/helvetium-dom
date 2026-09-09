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

test.describe('reconciliation and lifecycle', () => {
  test('preserves keyed element identity during reorder', async ({ page }) => {
    await fresh(page);

    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const a = document.querySelector('#app'),
          r = H.createRoot(a),
          v = (xs) => H.h('ul', null, ...xs.map((x) => H.h('li', { key: x }, x)));
        r.render(v(['a', 'b', 'c']));

        const old = [...a.querySelectorAll('li')];
        r.render(v(['c', 'a', 'b']));

        const next = [...a.querySelectorAll('li')];
        return next[0] === old[2] && next[1] === old[0] && next[2] === old[1];
      }),
    ).toBe(true);
  });

  test('inserts a new keyed sibling at the correct position', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = document.querySelector('#app'),
        r = H.createRoot(a),
        v = (xs) => H.h('ul', null, ...xs.map((x) => H.h('li', { key: x }, x)));

      r.render(v(['a', 'c']));
      r.render(v(['a', 'b', 'c']));
    });

    expect(await page.locator('li').allTextContents()).toEqual(['a', 'b', 'c']);
  });

  test('deletes a missing keyed sibling', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = document.querySelector('#app'),
        r = H.createRoot(a),
        v = (xs) => H.h('ul', null, ...xs.map((x) => H.h('li', { key: x }, x)));

      r.render(v(['a', 'b', 'c']));
      r.render(v(['a', 'c']));
    });

    expect(await page.locator('li').allTextContents()).toEqual(['a', 'c']);
  });

  test('moves keyed multi-node component ranges', async ({ page }) => {
    await fresh(page);

    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const Pair = ({ id }) =>
          H.h(H.Fragment, null, H.h('dt', null, id), H.h('dd', null, id + 'd'));
        const a = document.querySelector('#app'),
          r = H.createRoot(a),
          v = (xs) => H.h('dl', null, ...xs.map((x) => H.h(Pair, { key: x, id: x })));
        r.render(v(['a', 'b']));

        const aDt = a.querySelectorAll('dt')[0];
        r.render(v(['b', 'a']));
        return a.querySelectorAll('dt')[1] === aDt;
      }),
    ).toBe(true);
  });

  test('moves keyed fragment ranges', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const a = document.querySelector('#app'),
          r = H.createRoot(a),
          f = (k) =>
            H.h(H.Fragment, { key: k }, H.h('span', null, k + '1'), H.h('span', null, k + '2'));
        r.render(H.h('div', null, f('a'), f('b')));

        const old = a.querySelectorAll('span')[0];
        r.render(H.h('div', null, f('b'), f('a')));
        return a.querySelectorAll('span')[2] === old;
      }),
    ).toBe(true);
  });

  test('uses positional identity for unkeyed compatible siblings', async ({ page }) => {
    await fresh(page);
    const result = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = document.querySelector('#app'),
        r = H.createRoot(a);
      r.render(H.h('ul', null, H.h('li', null, 'a'), H.h('li', null, 'b')));

      const old = [...a.querySelectorAll('li')];
      r.render(H.h('ul', null, H.h('li', null, 'b'), H.h('li', null, 'a')));

      const n = [...a.querySelectorAll('li')];
      return [n[0] === old[0], n[1] === old[1]];
    });
    expect(result).toEqual([true, true]);
  });

  test('replaces DOM when VNode kind changes', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const a = document.querySelector('#app'),
          r = H.createRoot(a);
        r.render(H.h('p', null, 'x'));

        const old = a.firstElementChild;
        r.render(H.h('strong', null, 'x'));
        return old !== a.firstElementChild;
      }),
    ).toBe(true);
  });

  test('preserves element DOM when VNode kind and key match', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const a = document.querySelector('#app'),
          r = H.createRoot(a);
        r.render(H.h('p', { id: 'a' }, 'x'));

        const old = a.firstElementChild;
        r.render(H.h('p', { id: 'b' }, 'y'));
        return old === a.firstElementChild;
      }),
    ).toBe(true);
  });

  test('reports duplicate new keys as recoverable', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const errors = [];
        const r = H.createRoot(document.querySelector('#app'), {
          onRecoverableError: (e) => errors.push(String(e.message || e)),
        });

        r.render(H.h('ul', null, H.h('li', { key: 'x' }, '1'), H.h('li', { key: 'x' }, '2')));
        r.render(H.h('ul', null, H.h('li', { key: 'x' }, '1'), H.h('li', { key: 'x' }, '2')));
        return errors.some((x) => x.includes('Duplicate new sibling key'));
      }),
    ).toBe(true);
  });

  test('preserves component state across compatible parent rerenders', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      let set;

      const C = () => {
        const [n, s] = H.useState(0);
        set = s;
        return H.h('p', null, n);
      };

      const a = document.querySelector('#app'),
        r = H.createRoot(a);
      r.render(H.h('div', { title: 'a' }, H.h(C, { key: 'c' })));

      set(5);
      r.flush();
      r.render(H.h('div', { title: 'b' }, H.h(C, { key: 'c' })));
    });

    await expect(page.locator('p')).toHaveText('5');
  });

  test('changing component key resets component state', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      let set;

      const C = () => {
        const [n, s] = H.useState(0);
        set = s;
        return H.h('p', null, n);
      };

      const a = document.querySelector('#app'),
        r = H.createRoot(a);
      r.render(H.h(C, { key: 'a' }));
      set(5);

      r.flush();
      r.render(H.h(C, { key: 'b' }));
    });
    await expect(page.locator('p')).toHaveText('0');
  });

  test('rendering null removes the current root tree', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const r = H.createRoot(document.querySelector('#app'));

      r.render(H.h('p', null, 'x'));
      r.render(null);
    });
    await expect(page.locator('#app')).toBeEmpty();
  });

  test('unmount removes current root content', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const r = H.createRoot(document.querySelector('#app'));

      r.render(H.h('p', null, 'x'));
      r.unmount();
    });
    await expect(page.locator('#app')).toBeEmpty();
  });

  test('render after root unmount throws', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const r = H.createRoot(document.querySelector('#app'));
        r.unmount();

        try {
          r.render(H.h('p', null, 'x'));
          return false;
        } catch {
          return true;
        }
      }),
    ).toBe(true);
  });
});
