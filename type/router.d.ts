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

import type { ComponentType, VNodeChild } from './core.js';
import type { HTMLAttributes } from './dom.js';

export type RouterTarget =
  | string
  | {
      pathname?: string;
      search?: string;
      hash?: string;
    };

export interface RouterLocation {
  href: string;
  pathname: string;
  search: string;
  hash: string;
  state: unknown;

  key?: string;
}

export type RouteMetadata = Readonly<Record<string, unknown>>;

export interface RouteComponentProps {
  params: Readonly<Record<string, string>>;
  location: RouterLocation;
  router: Router;
  route: RouteDefinition | null;
}

export interface RouteDefinition {
  id?: string;

  path: string;
  component: ComponentType<RouteComponentProps>;

  end?: boolean;

  title?: string | ((match: RouteMatch) => string);

  meta?: RouteMetadata;
}

export interface RouteMatch {
  route: RouteDefinition;
  params: Readonly<Record<string, string>>;

  pathname: string;
}

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
  preventScrollReset?: boolean;
}

export interface CreateRouterCommonOptions {
  basePath?: string;
  notFound?: ComponentType<RouteComponentProps>;
  manageDocumentTitle?: boolean;
}

export interface CreateBrowserRouterOptions extends CreateRouterCommonOptions {
  window?: Window;
}

export interface CreateStaticRouterOptions extends CreateRouterCommonOptions {
  url?: string | URL;

  state?: unknown;
}

export interface Router {
  readonly kind: 'browser' | 'static';
  readonly routes: readonly RouteDefinition[];
  readonly basePath: string;
  readonly location: RouterLocation;
  readonly match: RouteMatch | null;
  readonly notFound: ComponentType<RouteComponentProps> | undefined;

  resolve(to: RouterTarget): URL;
  href(to: RouterTarget): string;
  isInternal(to: RouterTarget | URL): boolean;
  navigate(to: RouterTarget, options?: NavigateOptions): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export interface BrowserRouter extends Router {
  readonly kind: 'browser';
}
export interface StaticRouter extends Router {
  readonly kind: 'static';
}

export interface MatchRoutesOptions {
  basePath?: string;
}

export interface RouterProviderProps {
  router: Router;
  children?: VNodeChild;
  fallback?: VNodeChild;
}

export interface RouterOutletProps {
  fallback?: VNodeChild;
}

export type AnchorProps = Omit<
  HTMLAttributes<HTMLAnchorElement>,
  'href' | 'onClick' | 'children'
> & {
  to: RouterTarget;
  replace?: boolean;
  state?: unknown;
  reloadDocument?: boolean;
  preventScrollReset?: boolean;
  onClick?: (event: MouseEvent) => void;
  children?: VNodeChild;
};

export function matchRoutes(
  routes: readonly RouteDefinition[],
  pathname: string,
  options?: MatchRoutesOptions,
): RouteMatch | null;
export function createBrowserRouter(
  routes: readonly RouteDefinition[],
  options?: CreateBrowserRouterOptions,
): BrowserRouter;
export function createStaticRouter(
  routes: readonly RouteDefinition[],
  options?: CreateStaticRouterOptions,
): StaticRouter;

export function RouterProvider(props: RouterProviderProps): VNodeChild;
export function RouterOutlet(props?: RouterOutletProps): VNodeChild;
export function Anchor(props: AnchorProps): VNodeChild;
export function useRouter(): Router;
export function useLocation(): RouterLocation;
export function useRouteMatch(): RouteMatch | null;
export function useParams(): Readonly<Record<string, string>>;
export function useNavigate(): Router['navigate'];
