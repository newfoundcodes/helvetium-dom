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

test.describe('components and hooks', () => {
  test('renders function component props', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const G = ({ name }) => H.h('p', null, 'Hello ', name);

      H.createRoot(document.querySelector('#app')).render(H.h(G, { name: 'Ada' }));
    });

    await expect(page.locator('p')).toHaveText('Hello Ada');
  });

  test('passes normalized children through component props', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const P = (props) => H.h('section', null, props.children);

      H.createRoot(document.querySelector('#app')).render(H.h(P, null, H.h('b', null, 'child')));
    });

    await expect(page.locator('section b')).toHaveText('child');
  });

  test('useState updates component DOM', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const C = () => {
        const [n, setN] = H.useState(0);
        return H.h('button', { onClick: () => setN(n + 1) }, String(n));
      };

      H.createRoot(document.querySelector('#app')).render(H.h(C));
    });

    await page.getByRole('button').click();
    await expect(page.getByRole('button')).toHaveText('1');
  });

  test('useState functional updaters observe latest slot value', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const C = () => {
        const [n, setN] = H.useState(0);
        return H.h(
          'button',
          {
            onClick: () => {
              H.batch(() => {
                setN((v) => v + 1);
                setN((v) => v + 1);
              });
            },
          },
          String(n),
        );
      };

      H.createRoot(document.querySelector('#app')).render(H.h(C));
    });

    await page.getByRole('button').click();
    await expect(page.getByRole('button')).toHaveText('2');
  });

  test('useState suppresses Object.is no-op updates', async ({ page }) => {
    await fresh(page);

    const renders = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      let renders = 0,
        set;
      const C = () => {
        renders++;
        const [n, s] = H.useState(1);
        set = s;
        return H.h('p', null, n);
      };

      const r = H.createRoot(document.querySelector('#app'));
      r.render(H.h(C));
      set(1);

      r.flush();
      return renders;
    });

    expect(renders).toBe(1);
  });

  test('useState setter identity is stable', async ({ page }) => {
    await fresh(page);

    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const setters = [];

        let set;
        const C = () => {
          const [n, s] = H.useState(0);
          set = s;

          setters.push(s);
          return H.h('p', null, n);
        };

        const r = H.createRoot(document.querySelector('#app'));
        r.render(H.h(C));
        set(1);

        r.flush();
        return setters[0] === setters[1];
      }),
    ).toBe(true);
  });

  test('useReducer dispatches state transitions', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const C = () => {
        const [n, d] = H.useReducer((s, a) => s + a, 0);
        return H.h('button', { onClick: () => d(3) }, n);
      };

      H.createRoot(document.querySelector('#app')).render(H.h(C));
    });

    await page.getByRole('button').click();
    await expect(page.getByRole('button')).toHaveText('3');
  });

  test('useEffect runs after commit', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__effect = 'pending';

      const C = () => {
        H.useEffect(() => {
          window.__effect = 'ran';
        }, []);
        return H.h('p', null, 'x');
      };

      H.createRoot(document.querySelector('#app')).render(H.h(C));
    });

    await expect.poll(() => page.evaluate(() => window.__effect)).toBe('ran');
  });

  test('useEffect cleanup runs before changed effect', async ({ page }) => {
    await fresh(page);

    const calls = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const calls = [];

      let set;
      const C = () => {
        const [n, s] = H.useState(0);
        set = s;

        H.useEffect(() => {
          calls.push('run' + n);
          return () => calls.push('clean' + n);
        }, [n]);
        return H.h('p', null, n);
      };

      const r = H.createRoot(document.querySelector('#app'));
      r.render(H.h(C));
      await Promise.resolve();
      set(1);

      r.flush();
      await Promise.resolve();
      return calls;
    });

    expect(calls).toEqual(['run0', 'clean0', 'run1']);
  });

  test('useLayoutEffect runs synchronously after render commit', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        let state = 'before';

        const C = () => {
          H.useLayoutEffect(() => {
            state = document.querySelector('#app').textContent;
          }, []);
          return H.h('p', null, 'committed');
        };

        H.createRoot(document.querySelector('#app')).render(H.h(C));
        return state;
      }),
    ).toBe('committed');
  });

  test('useMemo reuses value while dependencies stay equal', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        let computes = 0,
          set;
        const C = () => {
          const [n, s] = H.useState(0);
          set = s;

          const v = H.useMemo(() => {
            computes++;
            return 7;
          }, []);
          return H.h('p', null, v, n);
        };

        const r = H.createRoot(document.querySelector('#app'));
        r.render(H.h(C));
        set(1);

        r.flush();
        return computes;
      }),
    ).toBe(1);
  });

  test('useCallback keeps callback identity while deps stay equal', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const values = [];
        let set;

        const C = () => {
          const [n, s] = H.useState(0);
          set = s;

          values.push(H.useCallback(() => 1, []));
          return H.h('p', null, n);
        };

        const r = H.createRoot(document.querySelector('#app'));
        r.render(H.h(C));
        set(1);

        r.flush();
        return values[0] === values[1];
      }),
    ).toBe(true);
  });

  test('useRef returns a stable mutable object', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const refs = [];

        let set;
        const C = () => {
          const [n, s] = H.useState(0);
          set = s;

          refs.push(H.useRef('x'));
          return H.h('p', null, n);
        };

        const r = H.createRoot(document.querySelector('#app'));
        r.render(H.h(C));
        set(1);

        r.flush();
        return refs[0] === refs[1];
      }),
    ).toBe(true);
  });

  test('useContext returns the default value without a provider', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const Ctx = H.createContext('default');
      const C = () => H.h('p', null, H.useContext(Ctx));

      H.createRoot(document.querySelector('#app')).render(H.h(C));
    });
    await expect(page.locator('p')).toHaveText('default');
  });

  test('context provider supplies its subtree value', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const Ctx = H.createContext('default');
      const C = () => H.h('p', null, H.useContext(Ctx));

      H.createRoot(document.querySelector('#app')).render(
        H.h(Ctx.Provider, { value: 'provided' }, H.h(C)),
      );
    });
    await expect(page.locator('p')).toHaveText('provided');
  });

  test('nested providers select the nearest value', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const Ctx = H.createContext('d');
      const C = () => H.h('p', null, H.useContext(Ctx));

      H.createRoot(document.querySelector('#app')).render(
        H.h(
          Ctx.Provider,
          { value: 'outer' },
          H.h('div', null, H.h(C), H.h(Ctx.Provider, { value: 'inner' }, H.h(C))),
        ),
      );
    });

    expect(await page.locator('p').allTextContents()).toEqual(['outer', 'inner']);
  });

  test('provider updates propagate to consumers', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const Ctx = H.createContext('d');
      const C = () => H.h('p', null, H.useContext(Ctx));
      const host = document.querySelector('#app'),
        r = H.createRoot(host);

      r.render(H.h(Ctx.Provider, { value: 'a' }, H.h(C)));
      r.render(H.h(Ctx.Provider, { value: 'b' }, H.h(C)));
    });
    await expect(page.locator('p')).toHaveText('b');
  });

  test('useId includes the root identifier prefix', async ({ page }) => {
    await fresh(page);
    const id = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const C = () => {
        const id = H.useId();
        return H.h('div', { id }, id);
      };

      H.createRoot(document.querySelector('#app'), { identifierPrefix: 'test-' }).render(H.h(C));
      return document.querySelector('#app div').id;
    });

    expect(id.startsWith('test-v-')).toBe(true);
  });

  test('memo skips equal prop renders', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        let renders = 0;

        const C = H.memo(({ value }) => {
          renders++;
          return H.h('p', null, value);
        });

        const r = H.createRoot(document.querySelector('#app'));
        r.render(H.h(C, { value: 'x' }));
        r.render(H.h(C, { value: 'x' }));
        return renders;
      }),
    ).toBe(1);
  });

  test('custom memo comparator controls rerendering', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        let renders = 0;

        const C = H.memo(
          ({ point }) => {
            renders++;
            return H.h('p', null, point.x);
          },
          (a, b) => a.point.x === b.point.x,
        );
        const r = H.createRoot(document.querySelector('#app'));

        r.render(H.h(C, { point: { x: 1, y: 1 } }));
        r.render(H.h(C, { point: { x: 1, y: 2 } }));
        return renders;
      }),
    ).toBe(1);
  });
});
