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

export {
  Fragment,
  createPortal,
  createTextVNode,
  createVNode,
  fragment,
  h,
  isVNode,
  normalizeChildren,
  normalizeVNode,
} from './vnode.js';
export { createRoot } from './renderer.js';
export { hydrateRoot } from './hydrate.js';
export { renderToStaticMarkup, renderToString } from './ssr.js';
export { createRef } from './ref.js';
export { createContext } from './context.js';
export { memo, forwardRef } from './component.js';
export {
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from './hooks.js';
export {
  Anchor,
  RouterOutlet,
  RouterProvider,
  createBrowserRouter,
  createStaticRouter,
  matchRoutes,
  useLocation,
  useNavigate,
  useParams,
  useRouteMatch,
  useRouter,
} from './router.js';
export { batch, flushSync } from './scheduler.js';
export type {
  ComponentType,
  FunctionComponent,
  Key,
  Ref,
  RefCallback,
  RefObject,
  Root,
  RootOptions,
  VNode,
  VNodeChild,
} from '../type/core.js';
export type {
  CSSProperties,
  DOMAttributes,
  EventHandler,
  HTMLAttributes,
  SVGAttributes,
} from '../type/dom.js';
export type { Context } from '../type/context.js';
export type { StateSetter, StateUpdater } from '../type/hooks.js';
export type { RenderToStringOptions } from '../type/server.js';
export type { IntrinsicElementMap, JSX } from '../type/jsx-runtime.js';

export type {
  AnchorProps,
  BrowserRouter,
  StaticRouter,
  Router,
  CreateBrowserRouterOptions,
  CreateStaticRouterOptions,
  CreateRouterCommonOptions,
  MatchRoutesOptions,
  NavigateOptions,
  RouteComponentProps,
  RouteDefinition,
  RouteMetadata,
  RouteMatch,
  RouterLocation,
  RouterOutletProps,
  RouterProviderProps,
  RouterTarget,
} from '../type/router.js';
