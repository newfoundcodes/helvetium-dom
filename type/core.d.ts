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

import type { FRAGMENT, PORTAL, TEXT } from './symbols.js';
import type { ComponentInstance } from './internal.js';
import type { PortalState } from './internal.js';

export type Key = string | number;

export type RefCallback<T> = (value: T | null) => void;

export interface RefObject<T> {
  current: T | null;
}

export type Ref<T> = RefCallback<T> | RefObject<T> | null | undefined;

export interface FunctionComponent<P = never> {
  (props: P): VNodeChild;
  displayName?: string;

  __helvetiumMemoCompare?: (prev: Readonly<P>, next: Readonly<P>) => boolean;
  __helvetiumForwardRef?: boolean;
  __helvetiumContextProvider?: symbol;
}

export type ComponentType<P = never> = FunctionComponent<P>;

export type VNodeKind =
  typeof TEXT | typeof FRAGMENT | typeof PORTAL | string | ComponentType<never>;

export interface VNode<P = Record<string, unknown>> {
  kind: VNodeKind;
  props: P;
  children: VNode[];
  key: Key | null;
  ref: Ref<unknown>;

  _start: Node | null;
  _end: Node | null;
  _instance?: ComponentInstance;
  _portalState?: PortalState;
}

export type PrimitiveChild = string | number | bigint;

export type VNodeChild =
  VNode | PrimitiveChild | boolean | null | undefined | readonly VNodeChild[];

export interface RootOptions {
  onError?: (error: unknown) => void;
  onRecoverableError?: (error: unknown) => void;

  identifierPrefix?: string;
}

export interface Root {
  render(node: VNodeChild): void;
  unmount(): void;
  flush(): void;
}
