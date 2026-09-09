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

test.describe('client router and Anchor', () => {
  test('Anchor renders a real href for progressive enhancement', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const Home = () => H.h(H.Anchor, { to: '/about' }, 'About');
      const router = H.createBrowserRouter([
        { path: '/tests/playwright/fixture.html', component: Home },
        { path: '/about', component: () => H.h('p', null, 'About') },
      ]);

      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
    });

    await expect(page.locator('#app a')).toHaveAttribute('href', '/about');
  });

  test('Anchor navigation preserves the current document', async ({ page }) => {
    await fresh(page);

    const preserved = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      (
        window as unknown as { __helvetiumDocumentToken?: { stable?: boolean } }
      ).__helvetiumDocumentToken = { stable: true };

      const Home = () => H.h(H.Anchor, { to: '/about', preventScrollReset: true }, 'About');
      const About = () => H.h('p', { id: 'about' }, 'About');

      const router = H.createBrowserRouter([
        { path: '/tests/playwright/fixture.html', component: Home },
        { path: '/about', component: About },
      ]);
      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));

      await Promise.resolve();
      (document.querySelector('#app a') as HTMLAnchorElement).click();

      await Promise.resolve();
      return (
        (window as unknown as { __helvetiumDocumentToken?: { stable?: boolean } })
          .__helvetiumDocumentToken?.stable === true
      );
    });

    expect(preserved).toBe(true);
    await expect(page.locator('#about')).toHaveText('About');
    expect(new URL(page.url()).pathname).toBe('/about');
  });

  test('RouterOutlet swaps page components after an Anchor click', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const Home = () =>
        H.h(
          'main',
          { id: 'home' },
          H.h(H.Anchor, { to: '/products', preventScrollReset: true }, 'Products'),
        );
      const Products = () => H.h('main', { id: 'products' }, 'Products page');
      const router = H.createBrowserRouter([
        { path: '/tests/playwright/fixture.html', component: Home },
        { path: '/products', component: Products },
      ]);

      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
    });

    await page.locator('a').click();
    await expect(page.locator('#home')).toHaveCount(0);
    await expect(page.locator('#products')).toHaveText('Products page');
  });

  test('navigation keeps query parameters and hashes', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const Home = () =>
        H.h(H.Anchor, { to: '/search?q=helvetium#results', preventScrollReset: true }, 'Search');
      const Search = () => H.h('p', { id: 'search' }, 'Search');
      const router = H.createBrowserRouter([
        { path: '/tests/playwright/fixture.html', component: Home },
        { path: '/search', component: Search },
      ]);

      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
    });
    await page.locator('a').click();

    const url = new URL(page.url());
    expect(url.pathname).toBe('/search');
    expect(url.search).toBe('?q=helvetium');
    expect(url.hash).toBe('#results');
  });

  test('dynamic parameters are passed to route components', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const Home = () =>
        H.h(H.Anchor, { to: '/users/Ada%20Lovelace', preventScrollReset: true }, 'User');
      const User = ({ params }: { params: { name: string } }) =>
        H.h('p', { id: 'user' }, params.name);
      const router = H.createBrowserRouter([
        { path: '/tests/playwright/fixture.html', component: Home },
        { path: '/users/:name', component: User },
      ]);

      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
    });

    await page.locator('a').click();
    await expect(page.locator('#user')).toHaveText('Ada Lovelace');
  });

  test('optional route parameters match missing values', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      history.replaceState(null, '', '/reports');

      const Report = ({ params }: { params: { year?: string } }) =>
        H.h('p', { id: 'report' }, params.year ?? 'all');

      const router = H.createBrowserRouter([{ path: '/reports/:year?', component: Report }]);
      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
    });

    await expect(page.locator('#report')).toHaveText('all');
  });

  test('splat routes expose the remaining pathname', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      history.replaceState(null, '', '/files/a/b/c.txt');

      const File = ({ params }: { params: { path: string } }) =>
        H.h('p', { id: 'file' }, params.path);

      const router = H.createBrowserRouter([{ path: '/files/*path', component: File }]);
      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
    });

    await expect(page.locator('#file')).toHaveText('a/b/c.txt');
  });

  test('Back restores the previous rendered route through popstate', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const Home = () =>
        H.h(
          'div',
          { id: 'home' },
          H.h(H.Anchor, { to: '/second', preventScrollReset: true }, 'Second'),
        );

      const Second = () => H.h('div', { id: 'second' }, 'Second');
      const router = H.createBrowserRouter([
        { path: '/tests/playwright/fixture.html', component: Home },
        { path: '/second', component: Second },
      ]);

      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
    });

    await page.locator('a').click();
    await expect(page.locator('#second')).toHaveText('Second');

    await page.goBack();
    await expect(page.locator('#home')).toBeVisible();
  });

  test('replace navigation does not append another history entry', async ({ page }) => {
    await fresh(page);

    const result = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const before = history.length;
      const Home = () =>
        H.h(H.Anchor, { to: '/replaced', replace: true, preventScrollReset: true }, 'Replace');
      const router = H.createBrowserRouter([
        { path: '/tests/playwright/fixture.html', component: Home },
        { path: '/replaced', component: () => H.h('p', null, 'R') },
      ]);

      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
      await Promise.resolve();
      (document.querySelector('#app a') as HTMLAnchorElement).click();

      await Promise.resolve();
      return { before, after: history.length, pathname: location.pathname };
    });

    expect(result.after).toBe(result.before);
    expect(result.pathname).toBe('/replaced');
  });

  test('history state is available from useLocation', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const Home = () =>
        H.h(
          H.Anchor,
          { to: '/state', state: { source: 'anchor' }, preventScrollReset: true },
          'State',
        );
      const StatePage = () => {
        const current = H.useLocation();
        return H.h('p', { id: 'state' }, (current.state as { source?: string })?.source ?? 'none');
      };

      const router = H.createBrowserRouter([
        { path: '/tests/playwright/fixture.html', component: Home },
        { path: '/state', component: StatePage },
      ]);

      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
    });

    await page.locator('a').click();
    await expect(page.locator('#state')).toHaveText('anchor');
  });

  test('useParams exposes current dynamic params', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      history.replaceState(null, '', '/items/42');

      const Item = () => {
        const params = H.useParams();
        return H.h('p', { id: 'item' }, params.id);
      };

      const router = H.createBrowserRouter([{ path: '/items/:id', component: Item }]);
      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
    });

    await expect(page.locator('#item')).toHaveText('42');
  });

  test('useNavigate performs programmatic client navigation', async ({ page }) => {
    await fresh(page);

    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const Home = () => {
        const navigate = H.useNavigate();
        return H.h(
          'button',
          { id: 'go', onClick: () => navigate('/programmatic', { preventScrollReset: true }) },
          'Go',
        );
      };

      const router = H.createBrowserRouter([
        { path: '/tests/playwright/fixture.html', component: Home },
        { path: '/programmatic', component: () => H.h('p', { id: 'done' }, 'Done') },
      ]);
      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
    });

    await page.locator('#go').click();
    await expect(page.locator('#done')).toHaveText('Done');

    expect(new URL(page.url()).pathname).toBe('/programmatic');
  });

  test('a user onClick can cancel Anchor navigation', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const Home = () =>
        H.h(
          H.Anchor,
          { to: '/blocked', onClick: (event: MouseEvent) => event.preventDefault() },
          'Blocked',
        );
      const router = H.createBrowserRouter([
        { path: '/tests/playwright/fixture.html', component: Home },
        { path: '/blocked', component: () => H.h('p', null, 'blocked') },
      ]);

      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
    });

    await page.locator('a').click();
    expect(new URL(page.url()).pathname).toBe('/tests/playwright/fixture.html');
  });

  test('an external Anchor renders an external href and is not classified internal', async ({
    page,
  }) => {
    await fresh(page);

    const result = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      const router = H.createBrowserRouter([
        {
          path: '/tests/playwright/fixture.html',
          component: () => H.h(H.Anchor, { to: 'https://example.com/docs' }, 'External'),
        },
      ]);

      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
      return {
        href: (document.querySelector('#app a') as HTMLAnchorElement).href,
        internal: router.isInternal('https://example.com/docs'),
      };
    });

    expect(result.href).toBe('https://example.com/docs');
    expect(result.internal).toBe(false);
  });

  test('notFound renders for unmatched URLs', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      history.replaceState(null, '', '/does-not-exist');

      const NotFound = ({ location }: { location: { pathname: string } }) =>
        H.h('p', { 'data-testid': 'not-found' }, `Missing ${location.pathname}`);
      const router = H.createBrowserRouter(
        [{ path: '/', component: () => H.h('p', null, 'Home') }],
        { notFound: NotFound },
      );

      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
    });

    await expect(page.getByTestId('not-found')).toHaveText('Missing /does-not-exist');
  });

  test('basePath scopes routing and generated Anchor hrefs', async ({ page }) => {
    await fresh(page);

    const result = await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      history.replaceState(null, '', '/app/home');

      const Home = () => H.h(H.Anchor, { to: '/settings' }, 'Settings');
      const router = H.createBrowserRouter(
        [
          { path: '/home', component: Home },
          { path: '/settings', component: () => H.h('p', null, 'Settings') },
        ],
        { basePath: '/app' },
      );

      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
      return {
        route: router.match?.route.path,
        href: (document.querySelector('#app a') as HTMLAnchorElement).getAttribute('href'),
      };
    });

    expect(result).toEqual({ route: '/home', href: '/app/settings' });
  });

  test('matched route title updates document.title', async ({ page }) => {
    await fresh(page);
    await page.evaluate(async () => {
      const H = await import('/dist/index.js');
      history.replaceState(null, '', '/articles/7');

      const router = H.createBrowserRouter([
        {
          path: '/articles/:id',
          component: () => H.h('p', null, 'Article'),
          title: (match) => `Article ${match.params.id}`,
        },
      ]);
      H.createRoot(document.querySelector('#app')!).render(H.h(H.RouterProvider, { router }));
    });

    await expect(page).toHaveTitle('Article 7');
  });
});
