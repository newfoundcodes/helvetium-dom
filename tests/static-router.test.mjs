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

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Anchor,
  RouterOutlet,
  RouterProvider,
  createStaticRouter,
  h,
  matchRoutes,
  renderToString,
  useLocation,
  useParams,
} from '../dist/index.js';

const Home = () => h('h1', null, 'Home');
const User = ({ params }) => h('h1', null, `User:${params.id}`);
const Files = ({ params }) => h('h1', null, `Files:${params.path}`);
const routes = [
  { id: 'home', path: '/', component: Home },
  { id: 'new-user', path: '/users/new', component: () => h('h1', null, 'New') },
  { id: 'user', path: '/users/:id', component: User },
  { id: 'files', path: '/files/*path', component: Files },
];

test('static router 01 matchRoutes is server-safe and ranks static before dynamic', () => {
  assert.equal(matchRoutes(routes, '/users/new')?.route.id, 'new-user');
});

test('static router 02 matchRoutes decodes parameters', () => {
  assert.equal(matchRoutes(routes, '/users/a%20b')?.params.id, 'a b');
});

test('static router 03 splat matching returns the remaining path', () => {
  assert.equal(matchRoutes(routes, '/files/a/b/c')?.params.path, 'a/b/c');
});

test('static router 04 createStaticRouter exposes the requested URL without Window', () => {
  const router = createStaticRouter(routes, { url: 'https://example.test/users/42?tab=x#bio' });

  assert.equal(router.kind, 'static');
  assert.equal(router.location.pathname, '/users/42');
  assert.equal(router.location.search, '?tab=x');
  assert.equal(router.location.hash, '#bio');
  assert.equal(router.match?.params.id, '42');
});

test('static router 05 navigate throws because static request state is immutable', () => {
  const router = createStaticRouter(routes, { url: 'https://example.test/' });
  assert.throws(() => router.navigate('/users/1'), /static router/i);
});

test('static router 06 RouterOutlet renders a deep route during SSR', () => {
  const router = createStaticRouter(routes, { url: 'https://example.test/users/42' });
  const html = renderToString(h(RouterProvider, { router }, h(RouterOutlet, null)));

  assert.match(html, /User:42/);
});

test('static router 07 Anchor remains a real server-rendered anchor', () => {
  const router = createStaticRouter(routes, { url: 'https://example.test/' });
  const html = renderToString(h(RouterProvider, { router }, h(Anchor, { to: '/users/9' }, 'Open')));

  assert.match(html, /<a[^>]*href="\/users\/9"[^>]*data-helvetium-anchor=""[^>]*>Open<\/a>/);
});

test('static router 08 hooks read static route location and params during SSR', () => {
  function Probe() {
    const location = useLocation();
    const params = useParams();
    return h('output', null, `${location.pathname}:${params.id}`);
  }

  const localRoutes = [{ path: '/users/:id', component: Probe }];
  const router = createStaticRouter(localRoutes, { url: 'https://example.test/users/7' });
  const html = renderToString(h(RouterProvider, { router }, h(RouterOutlet, null)));

  assert.match(html, /\/users\/7:7/);
});
