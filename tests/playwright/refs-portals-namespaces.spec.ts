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

test.describe('refs, portals, and namespaces', () => {
  test('assigns an object ref on mount', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const ref = H.createRef();

        H.createRoot(document.querySelector('#app')).render(H.h('button', { ref }, 'x'));
        return ref.current?.tagName;
      }),
    ).toBe('BUTTON');
  });

  test('clears an object ref on unmount', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const ref = H.createRef();
        const r = H.createRoot(document.querySelector('#app'));

        r.render(H.h('button', { ref }, 'x'));
        r.unmount();
        return ref.current;
      }),
    ).toBeNull();
  });

  test('calls callback refs with element and null', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const seen = [];
        const r = H.createRoot(document.querySelector('#app'));

        r.render(H.h('span', { ref: (v) => seen.push(v?.tagName ?? null) }, 'x'));
        r.unmount();
        return seen;
      }),
    ).toEqual(['SPAN', null]);
  });

  test('updates changed refs on a stable element', async ({ page }) => {
    await fresh(page);

    const result = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const a = H.createRef(),
        b = H.createRef(),
        host = document.querySelector('#app'),
        r = H.createRoot(host);
      r.render(H.h('div', { ref: a }, 'x'));

      const el = host.firstElementChild;
      r.render(H.h('div', { ref: b }, 'x'));
      return { same: el === host.firstElementChild, a: a.current, b: b.current === el };
    });
    expect(result).toEqual({ same: true, a: null, b: true });
  });

  test('forwards refs through forwardRef', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const Input = H.forwardRef((props, ref) => H.h('input', { ref, value: props.value }));
        const ref = H.createRef();

        H.createRoot(document.querySelector('#app')).render(H.h(Input, { value: 'x', ref }));
        return [ref.current?.tagName, ref.current?.value];
      }),
    ).toEqual(['INPUT', 'x']);
  });

  test('renders portal content into its target', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      H.createRoot(document.querySelector('#app')).render(
        H.h(
          'main',
          null,
          'base',
          H.createPortal(H.h('strong', null, 'portal'), document.querySelector('#portal')),
        ),
      );
    });

    await expect(page.locator('#app')).toHaveText('base');
    await expect(page.locator('#portal strong')).toHaveText('portal');
  });

  test('patches portal content in place', async ({ page }) => {
    await fresh(page);

    const same = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const host = document.querySelector('#app'),
        target = document.querySelector('#portal'),
        r = H.createRoot(host);
      r.render(H.createPortal(H.h('span', null, 'a'), target));

      const el = target.querySelector('span');
      r.render(H.createPortal(H.h('span', null, 'b'), target));
      return el === target.querySelector('span');
    });

    expect(same).toBe(true);
    await expect(page.locator('#portal span')).toHaveText('b');
  });

  test('removes portal content on unmount', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const r = H.createRoot(document.querySelector('#app'));

      r.render(H.createPortal(H.h('span', null, 'x'), document.querySelector('#portal')));
      r.unmount();
    });
    await expect(page.locator('#portal span')).toHaveCount(0);
  });

  test('moves portal output when the target changes', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const one = document.querySelector('#portal'),
        two = document.createElement('aside');

      two.id = 'portal2';
      document.body.append(two);

      const r = H.createRoot(document.querySelector('#app'));
      r.render(H.createPortal(H.h('span', null, 'x'), one));
      r.render(H.createPortal(H.h('span', null, 'x'), two));
    });

    await expect(page.locator('#portal span')).toHaveCount(0);
    await expect(page.locator('#portal2 span')).toHaveText('x');
  });

  test('creates SVG elements in the SVG namespace', async ({ page }) => {
    await fresh(page);

    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        H.createRoot(document.querySelector('#app')).render(
          H.h('svg', null, H.h('circle', { cx: 1, cy: 1, r: 1 })),
        );

        return document.querySelector('circle').namespaceURI;
      }),
    ).toBe('http://www.w3.org/2000/svg');
  });

  test('maps SVG presentation attributes', async ({ page }) => {
    await fresh(page);

    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      H.createRoot(document.querySelector('#app')).render(
        H.h('svg', null, H.h('circle', { strokeWidth: 3 })),
      );
    });

    await expect(page.locator('circle')).toHaveAttribute('stroke-width', '3');
  });

  test('uses HTML namespace under SVG foreignObject', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        H.createRoot(document.querySelector('#app')).render(
          H.h('svg', null, H.h('foreignObject', null, H.h('div', null, 'x'))),
        );
        return document.querySelector('foreignObject div').namespaceURI;
      }),
    ).toBe('http://www.w3.org/1999/xhtml');
  });

  test('creates MathML and descendants in the MathML namespace', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        H.createRoot(document.querySelector('#app')).render(
          H.h('math', null, H.h('mi', null, 'x')),
        );

        return [
          document.querySelector('math').namespaceURI,
          document.querySelector('mi').namespaceURI,
        ];
      }),
    ).toEqual(['http://www.w3.org/1998/Math/MathML', 'http://www.w3.org/1998/Math/MathML']);
  });

  test('renders into a DocumentFragment root', async ({ page }) => {
    await fresh(page);
    expect(
      await page.evaluate(async () => {
        const H = await import('/dist/index.js');
        const f = document.createDocumentFragment();

        H.createRoot(f).render(H.h('p', null, 'detached'));
        return f.textContent;
      }),
    ).toBe('detached');
  });
});
