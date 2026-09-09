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

test.describe('SSR and hydration', () => {
  test('renderToString emits component markers', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const C = () => H.h('p', null, 'x');
        return H.renderToString(H.h(C));
      }),
    ).toContain('<!--v:c-->');
  });

  test('renderToString escapes text', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        return H.renderToString(H.h('p', null, '<script>'));
      }),
    ).toContain('&lt;script&gt;');
  });

  test('renderToString escapes quoted attributes', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        return H.renderToString(H.h('p', { title: '"x"' }, 'a'));
      }),
    ).toContain('title="&quot;x&quot;"');
  });

  test('renderToString emits truthy boolean attributes by presence', async ({ page }) => {
    await fresh(page);

    const html = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      return H.renderToString(H.h('button', { disabled: true }, 'x'));
    });

    expect(html).toContain(' disabled');
    expect(html).not.toContain('disabled="true"');
  });

  test('renderToString serializes style objects', async ({ page }) => {
    await fresh(page);

    const html = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      return H.renderToString(H.h('div', { style: { width: 10, opacity: 0.5 } }, 'x'));
    });

    expect(html).toContain('width:10px');
    expect(html).toContain('opacity:0.5');
  });

  test('renderToString omits event props', async ({ page }) => {
    await fresh(page);

    const html = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      return H.renderToString(H.h('button', { onClick: () => {} }, 'x'));
    });

    expect(html).not.toContain('onClick');
  });

  test('renderToStaticMarkup omits component and fragment markers', async ({ page }) => {
    await fresh(page);

    const html = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const C = () => H.h(H.Fragment, null, H.h('p', null, 'x'));
      return H.renderToStaticMarkup(H.h(C));
    });

    expect(html).toBe('<p>x</p>');
  });

  test('SSR rejects portals', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');

        try {
          H.renderToString(H.createPortal(H.h('p', null, 'x'), document.querySelector('#portal')));
          return false;
        } catch (e) {
          return String(e.message).includes('Portals cannot be serialized');
        }
      }),
    ).toBe(true);
  });

  test('SSR useId is deterministic across independent roots', async ({ page }) => {
    await fresh(page);

    const pair = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const C = () => {
        const id = H.useId();
        return H.h('div', { id }, id);
      };

      return [
        H.renderToString(H.h(C), { identifierPrefix: 'srv-' }),
        H.renderToString(H.h(C), { identifierPrefix: 'srv-' }),
      ];
    });

    expect(pair[0]).toBe(pair[1]);
  });

  test('hydrateRoot preserves matching element identity', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const a = document.querySelector('#app');
        a.innerHTML = '<section id="x"><span>Hello</span></section>';

        const old = a.firstElementChild;
        H.hydrateRoot(a, H.h('section', { id: 'x' }, H.h('span', null, 'Hello')));
        return old === a.firstElementChild;
      }),
    ).toBe(true);
  });

  test('hydration patches text mismatches and reports recovery', async ({ page }) => {
    await fresh(page);

    const result = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = document.querySelector('#app'),
        errors = [];

      a.innerHTML = '<p>old</p>';
      H.hydrateRoot(a, H.h('p', null, 'new'), {
        onRecoverableError: (e) => errors.push(String(e.message || e)),
      });
      return { text: a.textContent, errors };
    });

    expect(result.text).toBe('new');
    expect(result.errors.some((e) => e.includes('text mismatch'))).toBe(true);
  });

  test('hydration replaces structural mismatches', async ({ page }) => {
    await fresh(page);

    const result = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = document.querySelector('#app'),
        errors = [];
      a.innerHTML = '<p>x</p>';

      const old = a.firstElementChild;
      H.hydrateRoot(a, H.h('section', null, 'x'), {
        onRecoverableError: (e) => errors.push(String(e.message || e)),
      });
      return {
        tag: a.firstElementChild.tagName,
        same: old === a.firstElementChild,
        count: errors.length,
      };
    });

    expect(result.tag).toBe('SECTION');
    expect(result.same).toBe(false);
    expect(result.count).toBeGreaterThan(0);
  });

  test('hydration removes extra server siblings', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = document.querySelector('#app');

      a.innerHTML = '<p>x</p><span>extra</span>';
      H.hydrateRoot(a, H.h('p', null, 'x'));
    });

    await expect(page.locator('#app > *')).toHaveCount(1);
  });

  test('hydration reconciles stale attributes', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = document.querySelector('#app');

      a.innerHTML = '<button title="stale" data-old="1">x</button>';
      H.hydrateRoot(a, H.h('button', { id: 'fresh' }, 'x'));
    });

    await expect(page.locator('button')).toHaveAttribute('id', 'fresh');
    await expect(page.locator('button')).not.toHaveAttribute('title');
  });

  test('hydration attaches event handlers to adopted elements', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      window.__count = 0;

      const a = document.querySelector('#app');
      a.innerHTML = '<button>Run</button>';
      H.hydrateRoot(a, H.h('button', { onClick: () => window.__count++ }, 'Run'));
    });

    await page.getByRole('button').click();
    expect(await page.evaluate(() => window.__count)).toBe(1);
  });

  test('hydrated components can update state', async ({ page }) => {
    await fresh(page);

    const html = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const C = () => {
        const [n] = H.useState(0);
        return H.h('p', null, n);
      };

      return H.renderToString(H.h(C));
    });

    await page.locator('#app').evaluate((el, markup) => {
      el.innerHTML = markup;
    }, html);

    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const C = () => {
        const [n, setN] = H.useState(0);
        return H.h('button', { onClick: () => setN(n + 1) }, n);
      };

      const a = document.querySelector('#app');
      a.innerHTML = H.renderToString(H.h(C));
      H.hydrateRoot(a, H.h(C));
    });

    await page.getByRole('button').click();
    await expect(page.getByRole('button')).toHaveText('1');
  });

  test('SSR and hydration produce the same useId with matching prefix', async ({ page }) => {
    await fresh(page);

    const result = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const C = () => {
        const id = H.useId();
        return H.h('div', { id }, id);
      };

      const a = document.querySelector('#app');
      a.innerHTML = H.renderToString(H.h(C), { identifierPrefix: 'same-' });

      const before = a.querySelector('div').id;
      H.hydrateRoot(a, H.h(C), { identifierPrefix: 'same-' });
      return [before, a.querySelector('div').id, a.textContent];
    });

    expect(result[0]).toBe(result[1]);
    expect(result[2]).toBe(result[0]);
  });
});
