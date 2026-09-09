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

test.describe('scheduler, errors, and root boundaries', () => {
  test('batch combines multiple updates into one component rerender', async ({ page }) => {
    await fresh(page);

    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        let renders = 0,
          a,
          b;

        const C = () => {
          renders++;

          const [x, sx] = H.useState(0),
            [y, sy] = H.useState(0);

          a = sx;
          b = sy;
          return H.h('p', null, x + y);
        };

        const r = H.createRoot(document.querySelector('#app'));
        r.render(H.h(C));

        H.batch(() => {
          a(1);
          b(2);
        });

        r.flush();
        return renders;
      }),
    ).toBe(2);
  });

  test('flushSync commits enclosed updates synchronously', async ({ page }) => {
    await fresh(page);

    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        let set;

        const C = () => {
          const [n, s] = H.useState(0);
          set = s;
          return H.h('p', null, n);
        };

        H.createRoot(document.querySelector('#app')).render(H.h(C));
        H.flushSync(() => set(4));
        return document.querySelector('p').textContent;
      }),
    ).toBe('4');
  });

  test('root.flush commits a pending state update', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        let set;

        const C = () => {
          const [n, s] = H.useState(0);
          set = s;
          return H.h('p', null, n);
        };

        const r = H.createRoot(document.querySelector('#app'));
        r.render(H.h(C));
        set(6);

        r.flush();
        return document.querySelector('p').textContent;
      }),
    ).toBe('6');
  });

  test('passive effect cleanup runs on unmount', async ({ page }) => {
    await fresh(page);

    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const calls = [];
        const C = () => {
          H.useEffect(() => () => calls.push('clean'), []);
          return H.h('p', null, 'x');
        };

        const r = H.createRoot(document.querySelector('#app'));
        r.render(H.h(C));
        await Promise.resolve();

        r.unmount();
        return calls;
      }),
    ).toEqual(['clean']);
  });

  test('layout effect cleanup runs on unmount', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const calls = [];
        const C = () => {
          H.useLayoutEffect(() => () => calls.push('clean'), []);
          return H.h('p', null, 'x');
        };

        const r = H.createRoot(document.querySelector('#app'));
        r.render(H.h(C));
        r.unmount();
        return calls;
      }),
    ).toEqual(['clean']);
  });
  test('onError receives layout-effect failures', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const errors = [];
        const C = () => {
          H.useLayoutEffect(() => {
            throw new Error('layout-boom');
          }, []);
          return H.h('p', null, 'x');
        };

        H.createRoot(document.querySelector('#app'), {
          onError: (e) => errors.push(String(e.message || e)),
        }).render(H.h(C));
        return errors;
      }),
    ).toContain('layout-boom');
  });

  test('onError receives component render failures', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const errors = [];
        const C = () => {
          throw new Error('render-boom');
        };

        H.createRoot(document.querySelector('#app'), {
          onError: (e) => errors.push(String(e.message || e)),
        }).render(H.h(C));
        return errors;
      }),
    ).toContain('render-boom');
  });

  test('hooks called outside a component render throw', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');

        try {
          H.useState(0);
          return false;
        } catch (e) {
          return String(e.message).includes('Hooks can only be called');
        }
      }),
    ).toBe(true);
  });

  test('changing hook kind at one slot reports an error', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const errors = [];
        let set;

        const C = () => {
          const [flag, s] = H.useState(false);
          set = s;

          if (flag) {
            H.useMemo(() => 1, []);
          } else {
            H.useRef(1);
          }

          return H.h('p', null, 'x');
        };

        const r = H.createRoot(document.querySelector('#app'), {
          onError: (e) => errors.push(String(e.message || e)),
        });

        r.render(H.h(C));
        set(true);

        r.flush();
        return errors.some((x) => x.includes('Hook order changed'));
      }),
    ).toBe(true);
  });

  test('changing hook count reports an error', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const errors = [];
        let set;

        const C = () => {
          const [flag, s] = H.useState(false);
          set = s;

          if (flag) {
            H.useRef(1);
          }

          return H.h('p', null, 'x');
        };

        const r = H.createRoot(document.querySelector('#app'), {
          onError: (e) => errors.push(String(e.message || e)),
        });

        r.render(H.h(C));
        set(true);

        r.flush();
        return errors.some((x) => x.includes('Hook count changed'));
      }),
    ).toBe(true);
  });

  test('state updates during render are rejected', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const errors = [];
        const C = () => {
          const [n, setN] = H.useState(0);
          if (n === 0) {
            setN(1);
          }

          return H.h('p', null, n);
        };

        H.createRoot(document.querySelector('#app'), {
          onError: (e) => errors.push(String(e.message || e)),
        }).render(H.h(C));
        return errors.some((x) => x.includes('during component rendering'));
      }),
    ).toBe(true);
  });

  test('createRoot rejects an invalid container', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');

        try {
          H.createRoot(null);
          return false;
        } catch (e) {
          return e instanceof TypeError;
        }
      }),
    ).toBe(true);
  });

  test('hydrateRoot rejects an invalid container', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');

        try {
          H.hydrateRoot(null, H.h('p', null, 'x'));
          return false;
        } catch (e) {
          return e instanceof TypeError;
        }
      }),
    ).toBe(true);
  });
});
