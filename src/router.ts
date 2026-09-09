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

import { createContext } from './context.js';
import { useCallback, useContext, useLayoutEffect, useState } from './hooks.js';
import { h } from './vnode.js';
import type { ComponentType, VNodeChild } from '../type/core.js';
import type {
  AnchorProps,
  BrowserRouter,
  CreateBrowserRouterOptions,
  CreateStaticRouterOptions,
  MatchRoutesOptions,
  NavigateOptions,
  RouteComponentProps,
  RouteDefinition,
  RouteMatch,
  Router,
  RouterLocation,
  RouterOutletProps,
  RouterProviderProps,
  RouterTarget,
  StaticRouter,
} from '../type/router.js';

import type { CompiledRoute, RouterContextValue } from './interfaces/router.js';

const RouterContext = createContext<RouterContextValue | null>(null);
const EMPTY_PARAMS: Readonly<Record<string, string>> = Object.freeze({});
const STATIC_ORIGIN = 'http://helvetium.local';

export function normalizeBasePath(input: string | undefined): string {
  if (!input || input === '/') {
    return '/';
  }

  const withSlash = input.startsWith('/') ? input : `/${input}`;
  const normalized = withSlash.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return normalized || '/';
}

function normalizePattern(input: string): string {
  if (input === '*' || input === '/*') {
    return '*';
  }

  if (!input) {
    return '/';
  }

  const withSlash = input.startsWith('/') ? input : `/${input}`;
  const normalized = withSlash.replace(/\/{2,}/g, '/');
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileRoute(route: RouteDefinition, index: number): CompiledRoute {
  const pattern = normalizePattern(route.path);
  const keys: string[] = [];

  if (pattern === '*') {
    keys.push('*');
    return { route, expression: /^\/(.*)?\/?$/, keys, score: -1000, index };
  }

  if (pattern === '/') {
    return {
      route,
      expression: route.end === false ? /^\/(?:.*)?$/ : /^\/?$/,
      keys,
      score: route.end === false ? 1 : 100,
      index,
    };
  }

  const segments = pattern.slice(1).split('/');
  let source = '^';
  let score = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment === '*' || segment.startsWith('*')) {
      if (i !== segments.length - 1) {
        throw new Error(`Route splat must be the final segment: ${route.path}`);
      }

      keys.push(segment.length > 1 ? segment.slice(1) : '*');

      source += '(?:/(.*))?';
      score += 1;

      continue;
    }

    if (segment.startsWith(':')) {
      const optional = segment.endsWith('?');
      const name = segment.slice(1, optional ? -1 : undefined);

      if (!name) {
        throw new Error(`Route parameter name cannot be empty: ${route.path}`);
      }

      keys.push(name);

      source += optional ? '(?:/([^/]+))?' : '/([^/]+)';
      score += optional ? 4 : 6;

      continue;
    }

    source += `/${escapeRegExp(segment)}`;
    score += 10;
  }

  source += route.end === false ? '(?:/|$)' : '/?$';
  score += segments.length + (route.end !== false ? 2 : 0);
  return { route, expression: new RegExp(source), keys, score, index };
}

function compileRoutes(routes: readonly RouteDefinition[]): CompiledRoute[] {
  return routes.map(compileRoute).sort((a, b) => b.score - a.score || a.index - b.index);
}

function decodeParam(value: string | undefined): string {
  if (value == null) {
    return '';
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function matchCompiled(routes: readonly CompiledRoute[], pathname: string): RouteMatch | null {
  for (const compiled of routes) {
    const result = compiled.expression.exec(pathname);
    if (!result) {
      continue;
    }

    const params: Record<string, string> = {};
    for (let i = 0; i < compiled.keys.length; i++) {
      const value = result[i + 1];
      if (value != null) {
        params[compiled.keys[i]] = decodeParam(value);
      }
    }

    return { route: compiled.route, params, pathname };
  }

  return null;
}

function isPathWithinBase(pathname: string, basePath: string): boolean {
  if (basePath === '/') {
    return pathname.startsWith('/');
  }

  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function stripBasePath(pathname: string, basePath: string): string | null {
  if (!isPathWithinBase(pathname, basePath)) {
    return null;
  }

  if (basePath === '/') {
    return pathname || '/';
  }

  return pathname.slice(basePath.length) || '/';
}

function addBasePath(pathname: string, basePath: string): string {
  const routePath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (basePath === '/') {
    return routePath;
  }

  if (routePath === '/') {
    return basePath;
  }

  return `${basePath}${routePath}`;
}

function normalizeSearch(value: string | undefined): string {
  if (!value) {
    return '';
  }

  return value.startsWith('?') ? value : `?${value}`;
}

function normalizeHash(value: string | undefined): string {
  if (!value) {
    return '';
  }

  return value.startsWith('#') ? value : `#${value}`;
}

function toAbsoluteURL(input: string | URL | undefined): URL {
  if (input instanceof URL) {
    return new URL(input.href);
  }

  if (!input) {
    return new URL('/', STATIC_ORIGIN);
  }

  return new URL(input, STATIC_ORIGIN);
}

function snapshotFromURL(url: URL, state: unknown = null): RouterLocation {
  return { href: url.href, pathname: url.pathname, search: url.search, hash: url.hash, state };
}

function locationSnapshot(win: Window): RouterLocation {
  return snapshotFromURL(new URL(win.location.href), win.history.state);
}

function makeResolver(getLocation: () => RouterLocation, basePath: string, origin: string) {
  return (to: RouterTarget): URL => {
    const base = new URL(getLocation().href, origin);
    if (typeof to === 'string') {
      if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(to) || to.startsWith('//')) {
        return new URL(to, base);
      }

      if (to.startsWith('/')) {
        return new URL(addBasePath(to, basePath), origin);
      }

      return new URL(to, base);
    }

    const next = new URL(base.href);
    if (to.pathname !== undefined) {
      next.pathname = to.pathname.startsWith('/')
        ? addBasePath(to.pathname, basePath)
        : new URL(to.pathname, next).pathname;
    }

    if (to.search !== undefined) {
      next.search = normalizeSearch(to.search);
    }

    if (to.hash !== undefined) {
      next.hash = normalizeHash(to.hash);
    }

    return next;
  };
}

export function matchRoutes(
  routes: readonly RouteDefinition[],
  pathname: string,
  options: MatchRoutesOptions = {},
): RouteMatch | null {
  const basePath = normalizeBasePath(options.basePath);
  const path = stripBasePath(pathname || '/', basePath);
  return path == null ? null : matchCompiled(compileRoutes(routes), path);
}

function routeProps(router: Router): RouteComponentProps {
  return {
    params: router.match?.params ?? EMPTY_PARAMS,
    location: router.location,
    router,
    route: router.match?.route ?? null,
  };
}

function shouldHandleAnchorClick(
  event: MouseEvent,
  target: string | undefined,
  download: boolean | string | undefined,
): boolean {
  if (event.defaultPrevented || event.button !== 0) {
    return false;
  }

  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  if (target && target.toLowerCase() !== '_self') {
    return false;
  }

  if (download !== undefined && download !== false) {
    return false;
  }

  return true;
}

function safeScroll(
  win: Window,
  location: RouterLocation,
  preventScrollReset: boolean | undefined,
): void {
  if (preventScrollReset) {
    return;
  }

  queueMicrotask(() => {
    if (location.hash) {
      const rawId = location.hash.slice(1);
      let id = rawId;

      try {
        id = decodeURIComponent(rawId);
      } catch {}

      const element = win.document.getElementById(id);
      if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView();
        return;
      }
    }

    if (typeof win.scrollTo === 'function') {
      win.scrollTo(0, 0);
    }
  });
}

export function createBrowserRouter(
  routes: readonly RouteDefinition[],
  options: CreateBrowserRouterOptions = {},
): BrowserRouter {
  const win = options.window ?? (typeof window !== 'undefined' ? window : undefined);
  if (!win) {
    throw new Error(
      'createBrowserRouter() requires a browser Window. Use createStaticRouter() on the server.',
    );
  }

  if (routes.length === 0 && !options.notFound) {
    throw new Error('createBrowserRouter() requires routes or notFound.');
  }

  const basePath = normalizeBasePath(options.basePath);
  const compiled = compileRoutes(routes);
  const listeners = new Set<() => void>();

  let disposed = false;
  let currentLocation = locationSnapshot(win);

  const matchCurrent = (location: RouterLocation) => {
    const path = stripBasePath(location.pathname, basePath);
    return path == null ? null : matchCompiled(compiled, path);
  };

  let currentMatch = matchCurrent(currentLocation);
  const resolve = makeResolver(() => currentLocation, basePath, win.location.origin);

  const applyTitle = () => {
    if (options.manageDocumentTitle === false || !currentMatch?.route.title) {
      return;
    }

    win.document.title =
      typeof currentMatch.route.title === 'function'
        ? currentMatch.route.title(currentMatch)
        : currentMatch.route.title;
  };

  const refresh = () => {
    currentLocation = locationSnapshot(win);
    currentMatch = matchCurrent(currentLocation);

    applyTitle();
  };

  const notify = () => {
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const popstate = () => {
    if (!disposed) {
      refresh();
      notify();
    }
  };

  win.addEventListener('popstate', popstate);
  applyTitle();

  const router: BrowserRouter = {
    kind: 'browser',
    routes,
    basePath,
    get location() {
      return currentLocation;
    },
    get match() {
      return currentMatch;
    },
    get notFound() {
      return options.notFound;
    },
    resolve,
    href(to) {
      const url = resolve(to);
      return url.origin === win.location.origin
        ? `${url.pathname}${url.search}${url.hash}`
        : url.href;
    },
    isInternal(to) {
      const url = to instanceof URL ? to : resolve(to);
      return url.origin === win.location.origin && isPathWithinBase(url.pathname, basePath);
    },
    navigate(to, navigateOptions: NavigateOptions = {}) {
      if (disposed) {
        throw new Error('Cannot navigate with a disposed router.');
      }

      const url = resolve(to);
      if (!router.isInternal(url)) {
        throw new Error(
          `Client navigation is limited to same-origin URLs inside ${basePath}: ${url.href}`,
        );
      }

      const href = `${url.pathname}${url.search}${url.hash}`;
      if (navigateOptions.replace) {
        win.history.replaceState(navigateOptions.state ?? null, '', href);
      } else {
        win.history.pushState(navigateOptions.state ?? null, '', href);
      }

      refresh();
      notify();

      safeScroll(win, currentLocation, navigateOptions.preventScrollReset);
    },
    subscribe(listener) {
      if (disposed) {
        throw new Error('Cannot subscribe to a disposed router.');
      }

      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;

      win.removeEventListener('popstate', popstate);
      listeners.clear();
    },
  };
  return router;
}

export function createStaticRouter(
  routes: readonly RouteDefinition[],
  options: CreateStaticRouterOptions = {},
): StaticRouter {
  if (routes.length === 0 && !options.notFound) {
    throw new Error('createStaticRouter() requires routes or notFound.');
  }

  const basePath = normalizeBasePath(options.basePath);
  const url = toAbsoluteURL(options.url);
  const location = snapshotFromURL(url, options.state ?? null);
  const match = matchRoutes(routes, location.pathname, { basePath });
  const resolve = makeResolver(() => location, basePath, url.origin);

  let disposed = false;
  const router: StaticRouter = {
    kind: 'static',
    routes,
    basePath,
    location,
    match,
    get notFound() {
      return options.notFound;
    },
    resolve,
    href(to) {
      const target = resolve(to);
      return target.origin === url.origin
        ? `${target.pathname}${target.search}${target.hash}`
        : target.href;
    },
    isInternal(to) {
      const target = to instanceof URL ? to : resolve(to);
      return target.origin === url.origin && isPathWithinBase(target.pathname, basePath);
    },
    navigate() {
      throw new Error('Static routers are immutable. Use createBrowserRouter() for navigation.');
    },
    subscribe() {
      if (disposed) {
        throw new Error('Cannot subscribe to a disposed router.');
      }

      return () => {};
    },
    dispose() {
      disposed = true;
    },
  };
  return router;
}

export function RouterProvider(props: RouterProviderProps): VNodeChild {
  const [version, setVersion] = useState(0);

  useLayoutEffect(
    () => props.router.subscribe(() => setVersion((value) => value + 1)),
    [props.router],
  );
  void version;

  const value: RouterContextValue = {
    router: props.router,
    location: props.router.location,
    match: props.router.match,
    fallback: props.fallback,
  };
  return h(RouterContext.Provider, { value }, props.children ?? h(RouterOutlet, null));
}

function contextValue(): RouterContextValue {
  const value = useContext(RouterContext);
  if (!value) {
    throw new Error('Router APIs must be used under <RouterProvider router={...}>.');
  }

  return value;
}

export function RouterOutlet(props: RouterOutletProps = {}): VNodeChild {
  const context = contextValue();
  const { router } = context;

  if (context.match) {
    const Component = context.match.route.component;
    const key = context.match.route.id ?? context.match.route.path;
    return h(
      Component as unknown as ComponentType<Record<string, unknown>>,
      { ...routeProps(router), key } as unknown as Record<string, unknown>,
    );
  }

  if (router.notFound) {
    return h(
      router.notFound as unknown as ComponentType<Record<string, unknown>>,
      { ...routeProps(router), key: '__helvetium_not_found__' } as unknown as Record<
        string,
        unknown
      >,
    );
  }

  return props.fallback ?? context.fallback ?? null;
}

export function Anchor(props: AnchorProps): VNodeChild {
  const router = useRouter();
  const {
    to,
    replace,
    state,
    reloadDocument,
    preventScrollReset,
    onClick,
    target,
    download,
    children,
    ...anchorProps
  } = props;

  const href = router.href(to);
  const handleClick = (event: MouseEvent): void => {
    onClick?.(event);
    if (
      reloadDocument ||
      router.kind !== 'browser' ||
      !shouldHandleAnchorClick(event, target, download)
    ) {
      return;
    }

    const resolved = router.resolve(to);
    if (!router.isInternal(resolved)) {
      return;
    }

    event.preventDefault();
    router.navigate(to, { replace, state, preventScrollReset });
  };

  return h(
    'a',
    {
      ...anchorProps,
      href,
      target,
      download,
      onClick: handleClick,
      'data-helvetium-anchor': '',
      'data-helvetium-replace': replace ? '' : undefined,
      'data-helvetium-reload-document': reloadDocument ? '' : undefined,
      'data-helvetium-prevent-scroll-reset': preventScrollReset ? '' : undefined,
    },
    children ?? null,
  );
}

export function useRouter(): Router {
  return contextValue().router;
}

export function useLocation(): RouterLocation {
  return contextValue().location;
}

export function useRouteMatch(): RouteMatch | null {
  return contextValue().match;
}

export function useParams(): Readonly<Record<string, string>> {
  return contextValue().match?.params ?? EMPTY_PARAMS;
}

export function useNavigate(): Router['navigate'] {
  const router = useRouter();
  return useCallback(
    (to: RouterTarget, options?: NavigateOptions) => router.navigate(to, options),
    [router],
  );
}

export type {
  AnchorProps,
  BrowserRouter,
  CreateBrowserRouterOptions,
  CreateStaticRouterOptions,
  MatchRoutesOptions,
  NavigateOptions,
  RouteComponentProps,
  RouteDefinition,
  RouteMatch,
  Router,
  RouterLocation,
  RouterOutletProps,
  RouterProviderProps,
  RouterTarget,
  StaticRouter,
} from '../type/router.js';
