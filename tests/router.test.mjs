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

import assert from 'node:assert/strict';
import test from 'node:test';
import { installMiniDOM } from './mini-dom.mjs';

function createFakeWindow(initialHref = 'http://helvetium.test/') {
  let current = new URL(initialHref, 'http://helvetium.test/');
  let state = null;

  const listeners = new Map();
  const calls = [];
  const doc = {
    title: '',
    getElementById() {
      return null;
    },
  };

  const location = {};
  for (const key of ['href', 'origin', 'pathname', 'search', 'hash']) {
    Object.defineProperty(location, key, { enumerable: true, get: () => current[key] });
  }

  const history = {
    get state() {
      return state;
    },
    pushState(nextState, _unused, href) {
      calls.push(['pushState', nextState, href]);

      state = nextState;
      current = new URL(href, current);
    },
    replaceState(nextState, _unused, href) {
      calls.push(['replaceState', nextState, href]);

      state = nextState;
      current = new URL(href, current);
    },
  };

  const win = {
    location,
    history,
    document: doc,
    scrollTo(...args) {
      calls.push(['scrollTo', ...args]);
    },
    addEventListener(type, listener) {
      const set = listeners.get(type) ?? new Set();

      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    __set(url, nextState = null) {
      current = new URL(url, current);
      state = nextState;
    },
    __pop(url, nextState = null) {
      current = new URL(url, current);
      state = nextState;

      for (const listener of listeners.get('popstate') ?? []) {
        listener({ type: 'popstate', state });
      }
    },
    __calls: calls,
  };
  return win;
}

const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

function clickEvent(overrides = {}) {
  return {
    type: 'click',
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...overrides,
  };
}

test('browser router matches a root route', async () => {
  const H = await import('../dist/index.js');
  const win = createFakeWindow();
  const router = H.createBrowserRouter([{ path: '/', component: () => null }], { window: win });

  assert.equal(router.match?.route.path, '/');
  router.dispose();
});

test('static routes outrank dynamic routes', async () => {
  const H = await import('../dist/index.js');
  const win = createFakeWindow('http://helvetium.test/users/new');
  const router = H.createBrowserRouter(
    [
      { path: '/users/:id', component: () => null },
      { path: '/users/new', component: () => null },
    ],
    { window: win },
  );

  assert.equal(router.match?.route.path, '/users/new');
  router.dispose();
});

test('dynamic route parameters are decoded', async () => {
  const H = await import('../dist/index.js');
  const win = createFakeWindow('http://helvetium.test/users/Ada%20Lovelace');
  const router = H.createBrowserRouter([{ path: '/users/:name', component: () => null }], {
    window: win,
  });

  assert.equal(router.match?.params.name, 'Ada Lovelace');
  router.dispose();
});

test('optional route parameters match with and without a value', async () => {
  const H = await import('../dist/index.js');
  const win = createFakeWindow('http://helvetium.test/reports');
  const router = H.createBrowserRouter([{ path: '/reports/:year?', component: () => null }], {
    window: win,
  });

  assert.deepEqual(router.match?.params, {});
  router.navigate('/reports/2026', { preventScrollReset: true });

  assert.equal(router.match?.params.year, '2026');
  router.dispose();
});

test('splat routes capture the remaining pathname', async () => {
  const H = await import('../dist/index.js');
  const win = createFakeWindow('http://helvetium.test/files/a/b/c.txt');
  const router = H.createBrowserRouter([{ path: '/files/*path', component: () => null }], {
    window: win,
  });

  assert.equal(router.match?.params.path, 'a/b/c.txt');
  router.dispose();
});

test('basePath scopes matching and generated hrefs', async () => {
  const H = await import('../dist/index.js');
  const win = createFakeWindow('http://helvetium.test/app/dashboard');
  const router = H.createBrowserRouter([{ path: '/dashboard', component: () => null }], {
    basePath: '/app',
    window: win,
  });

  assert.equal(router.match?.route.path, '/dashboard');
  assert.equal(router.href('/settings'), '/app/settings');
  assert.equal(router.isInternal(new URL('http://helvetium.test/outside')), false);

  router.dispose();
});

test('navigate uses pushState and updates location without a document load', async () => {
  const H = await import('../dist/index.js');
  const win = createFakeWindow();
  const router = H.createBrowserRouter(
    [
      { path: '/', component: () => null },
      { path: '/about', component: () => null },
    ],
    { window: win },
  );
  router.navigate('/about?from=home#team', { state: { source: 'home' }, preventScrollReset: true });

  assert.equal(router.location.pathname, '/about');
  assert.equal(router.location.search, '?from=home');
  assert.equal(router.location.hash, '#team');

  assert.deepEqual(router.location.state, { source: 'home' });
  assert.equal(win.__calls[0][0], 'pushState');

  router.dispose();
});

test('navigate can replace the current history entry', async () => {
  const H = await import('../dist/index.js');
  const win = createFakeWindow('/');
  const router = H.createBrowserRouter(
    [
      { path: '/login', component: () => null },
      { path: '/', component: () => null },
    ],
    { window: win },
  );
  router.navigate('/login', { replace: true, preventScrollReset: true });

  assert.equal(win.__calls[0][0], 'replaceState');
  router.dispose();
});

test('router subscribers are notified by programmatic navigation', async () => {
  const H = await import('../dist/index.js');
  const win = createFakeWindow();
  const router = H.createBrowserRouter(
    [
      { path: '/', component: () => null },
      { path: '/x', component: () => null },
    ],
    { window: win },
  );

  let notifications = 0;
  const unsubscribe = router.subscribe(() => notifications++);

  router.navigate('/x', { preventScrollReset: true });
  assert.equal(notifications, 1);
  unsubscribe();

  router.navigate('/', { preventScrollReset: true });
  assert.equal(notifications, 1);

  router.dispose();
});

test('popstate refreshes the matched route for Back and Forward navigation', async () => {
  const H = await import('../dist/index.js');
  const win = createFakeWindow('/one');
  const router = H.createBrowserRouter(
    [
      { path: '/one', component: () => null },
      { path: '/two', component: () => null },
    ],
    { window: win },
  );

  win.__pop('/two', { via: 'history' });

  assert.equal(router.match?.route.path, '/two');
  assert.deepEqual(router.location.state, { via: 'history' });

  router.dispose();
});

test('programmatic external navigation is rejected', async () => {
  const H = await import('../dist/index.js');
  const win = createFakeWindow();
  const router = H.createBrowserRouter([{ path: '/', component: () => null }], { window: win });

  assert.throws(() => router.navigate('https://example.com/'), /same-origin/);
  router.dispose();
});

test('route titles update document.title', async () => {
  const H = await import('../dist/index.js');
  const win = createFakeWindow('/users/42');
  const router = H.createBrowserRouter(
    [{ path: '/users/:id', component: () => null, title: (match) => `User ${match.params.id}` }],
    { window: win },
  );

  assert.equal(win.document.title, 'User 42');
  router.dispose();
});

test('RouterProvider and RouterOutlet render the current page component', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = (id) => document.querySelector(`#${id}`);

  const win = createFakeWindow('/');
  win.document = document;

  const Home = () =>
    H.h('section', { id: 'home' }, 'Home', H.h(H.Anchor, { to: '/about' }, 'About'));
  const About = () => H.h('section', { id: 'about' }, 'About');
  const router = H.createBrowserRouter(
    [
      { path: '/', component: Home },
      { path: '/about', component: About },
    ],
    { window: win },
  );
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }));
  await tick();

  assert.equal(host.querySelector('#home')?.textContent, 'HomeAbout');
  router.dispose();
});

test('Anchor performs client navigation and swaps route components', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = (id) => document.querySelector(`#${id}`);

  const win = createFakeWindow('/');
  win.document = document;

  const Home = () =>
    H.h('section', { id: 'home' }, H.h(H.Anchor, { to: '/about', preventScrollReset: true }, 'Go'));
  const About = () => H.h('section', { id: 'about' }, 'About page');
  const router = H.createBrowserRouter(
    [
      { path: '/', component: Home },
      { path: '/about', component: About },
    ],
    { window: win },
  );
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }));
  await tick();

  const anchor = host.querySelector('a');
  const event = clickEvent();

  anchor.dispatchEvent(event);
  await tick();

  assert.equal(event.defaultPrevented, true);
  assert.equal(router.location.pathname, '/about');
  assert.equal(host.querySelector('#home'), null);
  assert.equal(host.querySelector('#about')?.textContent, 'About page');

  router.dispose();
});

test('Anchor preserves modified-click browser behavior', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = () => null;

  const win = createFakeWindow('/');
  win.document = document;

  const Home = () => H.h(H.Anchor, { to: '/about' }, 'About');
  const router = H.createBrowserRouter(
    [
      { path: '/', component: Home },
      { path: '/about', component: () => null },
    ],
    { window: win },
  );
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }));
  await tick();

  const event = clickEvent({ ctrlKey: true });
  host.querySelector('a').dispatchEvent(event);
  await tick();

  assert.equal(event.defaultPrevented, false);
  assert.equal(router.location.pathname, '/');

  router.dispose();
});

test('Anchor preserves target=_blank behavior', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = () => null;

  const win = createFakeWindow('/');
  win.document = document;

  const Home = () => H.h(H.Anchor, { to: '/about', target: '_blank' }, 'About');
  const router = H.createBrowserRouter(
    [
      { path: '/', component: Home },
      { path: '/about', component: () => null },
    ],
    { window: win },
  );
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }));
  await tick();

  const event = clickEvent();
  host.querySelector('a').dispatchEvent(event);
  await tick();

  assert.equal(event.defaultPrevented, false);
  assert.equal(router.location.pathname, '/');

  router.dispose();
});

test('Anchor preserves reloadDocument behavior', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = () => null;

  const win = createFakeWindow('/');
  win.document = document;

  const Home = () => H.h(H.Anchor, { to: '/about', reloadDocument: true }, 'About');
  const router = H.createBrowserRouter(
    [
      { path: '/', component: Home },
      { path: '/about', component: () => null },
    ],
    { window: win },
  );
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }));
  await tick();

  const event = clickEvent();
  host.querySelector('a').dispatchEvent(event);
  await tick();

  assert.equal(event.defaultPrevented, false);
  assert.equal(router.location.pathname, '/');

  router.dispose();
});

test('notFound component renders for an unmatched URL', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = () => null;

  const win = createFakeWindow('/missing');
  win.document = document;

  const NotFound = ({ location }) => H.h('p', { id: 'missing' }, `Missing ${location.pathname}`);
  const router = H.createBrowserRouter([{ path: '/', component: () => H.h('p', null, 'home') }], {
    window: win,
    notFound: NotFound,
  });
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }));
  await tick();

  assert.equal(host.querySelector('#missing')?.textContent, 'Missing /missing');
  router.dispose();
});

test('RouterProvider can keep a persistent shell around RouterOutlet', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = () => null;

  const win = createFakeWindow('/');
  win.document = document;

  const Shell = () =>
    H.h(
      'div',
      { id: 'shell' },
      H.h(H.Anchor, { to: '/settings', preventScrollReset: true }, 'Settings'),
      H.h(H.RouterOutlet, null),
    );

  const Home = () => H.h('p', { id: 'home-page' }, 'Home page');
  const Settings = () => H.h('p', { id: 'settings-page' }, 'Settings page');
  const router = H.createBrowserRouter(
    [
      { path: '/', component: Home },
      { path: '/settings', component: Settings },
    ],
    { window: win },
  );
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }, H.h(Shell, null)));
  await tick();

  const shell = host.querySelector('#shell');
  shell.querySelector('a').dispatchEvent(clickEvent());
  await tick();

  assert.equal(host.querySelector('#shell'), shell);
  assert.equal(host.querySelector('#home-page'), null);
  assert.equal(host.querySelector('#settings-page')?.textContent, 'Settings page');

  router.dispose();
});

test('useNavigate performs programmatic route navigation', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = () => null;

  const win = createFakeWindow('/');
  win.document = document;

  const Home = () => {
    const navigate = H.useNavigate();
    return H.h(
      'button',
      { id: 'go', onClick: () => navigate('/done', { preventScrollReset: true }) },
      'Go',
    );
  };

  const router = H.createBrowserRouter(
    [
      { path: '/', component: Home },
      { path: '/done', component: () => H.h('p', { id: 'done' }, 'Done') },
    ],
    { window: win },
  );
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }));
  await tick();

  host.querySelector('#go').dispatchEvent(clickEvent({ type: 'click' }));
  await tick();

  assert.equal(router.location.pathname, '/done');
  assert.equal(host.querySelector('#done')?.textContent, 'Done');

  router.dispose();
});

test('useLocation exposes Anchor history state on the destination route', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = () => null;

  const win = createFakeWindow('/');
  win.document = document;

  const Home = () =>
    H.h(
      H.Anchor,
      { to: '/checkout', state: { source: 'cart' }, preventScrollReset: true },
      'Checkout',
    );
  const Checkout = () => {
    const location = H.useLocation();
    return H.h('p', { id: 'source' }, location.state?.source ?? 'none');
  };

  const router = H.createBrowserRouter(
    [
      { path: '/', component: Home },
      { path: '/checkout', component: Checkout },
    ],
    { window: win },
  );
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }));
  await tick();

  host.querySelector('a').dispatchEvent(clickEvent());
  await tick();

  assert.equal(host.querySelector('#source')?.textContent, 'cart');
  router.dispose();
});

test('Anchor user onClick can cancel client navigation', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = () => null;

  const win = createFakeWindow('/');
  win.document = document;

  const Home = () =>
    H.h(H.Anchor, { to: '/blocked', onClick: (event) => event.preventDefault() }, 'Blocked');
  const router = H.createBrowserRouter(
    [
      { path: '/', component: Home },
      { path: '/blocked', component: () => null },
    ],
    { window: win },
  );
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }));
  await tick();

  const event = clickEvent();
  host.querySelector('a').dispatchEvent(event);
  await tick();

  assert.equal(event.defaultPrevented, true);
  assert.equal(router.location.pathname, '/');

  router.dispose();
});

test('external Anchor keeps an absolute external href', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = () => null;

  const win = createFakeWindow('/');
  win.document = document;

  const Home = () => H.h(H.Anchor, { to: 'https://example.com/docs' }, 'External');
  const router = H.createBrowserRouter([{ path: '/', component: Home }], { window: win });
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }));
  await tick();

  assert.equal(host.querySelector('a').getAttribute('href'), 'https://example.com/docs');
  router.dispose();
});

test('RouterProvider subscribes before createRoot.render returns', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = () => null;

  const win = createFakeWindow('/');
  win.document = document;

  const router = H.createBrowserRouter(
    [
      { path: '/', component: () => H.h('p', { id: 'home-now' }, 'Home') },
      { path: '/now', component: () => H.h('p', { id: 'now' }, 'Now') },
    ],
    { window: win },
  );
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }));
  router.navigate('/now', { preventScrollReset: true });
  await tick();

  assert.equal(host.querySelector('#now')?.textContent, 'Now');
  router.dispose();
});

test('route component state is preserved when only params change within one pattern', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = () => null;

  const win = createFakeWindow('/users/1');
  win.document = document;

  const User = ({ params }) => {
    const [count, setCount] = H.useState(0);
    return H.h(
      'button',
      { id: 'user-count', onClick: () => setCount((n) => n + 1) },
      `${params.id}:${count}`,
    );
  };

  const router = H.createBrowserRouter([{ path: '/users/:id', component: User }], { window: win });
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }));
  host.querySelector('#user-count').dispatchEvent(clickEvent());
  await tick();

  assert.equal(host.querySelector('#user-count').textContent, '1:1');
  router.navigate('/users/2', { preventScrollReset: true });
  await tick();

  assert.equal(host.querySelector('#user-count').textContent, '2:1');
  router.dispose();
});

test('different route definitions reset page identity even when they reuse one component', async () => {
  const H = await import('../dist/index.js');
  const document = installMiniDOM();

  document.title = '';
  document.getElementById = () => null;

  const win = createFakeWindow('/one');
  win.document = document;

  const Page = () => {
    const [count, setCount] = H.useState(0);
    return H.h(
      'button',
      { id: 'page-count', onClick: () => setCount((n) => n + 1) },
      String(count),
    );
  };

  const router = H.createBrowserRouter(
    [
      { path: '/one', component: Page },
      { path: '/two', component: Page },
    ],
    { window: win },
  );
  const host = document.createElement('div');

  document.body.appendChild(host);
  H.createRoot(host).render(H.h(H.RouterProvider, { router }));
  host.querySelector('#page-count').dispatchEvent(clickEvent());
  await tick();

  assert.equal(host.querySelector('#page-count').textContent, '1');
  router.navigate('/two', { preventScrollReset: true });
  await tick();

  assert.equal(host.querySelector('#page-count').textContent, '0');
  router.dispose();
});
