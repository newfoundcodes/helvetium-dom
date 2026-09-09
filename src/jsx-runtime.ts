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

import { Fragment, createVNode } from './vnode.js';
import type { ComponentType, VNode, VNodeChild } from '../type/core.js';

export type { JSX } from '../type/jsx-runtime.js';

export { Fragment };

export function jsx(
  type: string | ComponentType<never> | typeof Fragment,
  props: Record<string, unknown> | null,
  key?: string | number,
): VNode {
  const input = props ? { ...props } : {};
  const children = input.children as VNodeChild;

  delete input.children;

  if (key != null) {
    input.key = key;
  }

  return createVNode(type, input, children === undefined ? [] : [children]);
}

export const jsxs = jsx;
export const jsxDEV = jsx;
