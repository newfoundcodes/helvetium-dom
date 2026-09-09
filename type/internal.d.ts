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

import type { ComponentType, RootOptions, VNode } from './core.js';

export interface HookSlot {
  kind: string;
  value?: unknown;
  deps?: readonly unknown[];

  cleanup?: (() => void) | void;
  create?: () => void | (() => void);
  dispatch?: (...args: unknown[]) => void;
  reducer?: (...args: unknown[]) => unknown;
}

export interface ComponentInstance {
  id: number;
  vnode: VNode;
  type: ComponentType<never>;
  parent: ComponentInstance | null;
  root: RootInternals;
  hooks: HookSlot[];
  hookIndex: number;
  subtree: VNode | null;
  mounted: boolean;
  dirty: boolean;
  depth: number;
  contexts: Map<symbol, unknown>;
  inheritedContexts: Map<symbol, unknown>;
  renderedProps: Record<string, unknown> | null;
}

export interface PortalState {
  target: Element | DocumentFragment;
  current: VNode | null;
  start: Comment;
  end: Comment;
}

export interface RootInternals {
  container: Element | DocumentFragment;
  current: VNode | null;
  options: RootOptions;
  scheduled: Set<ComponentInstance>;
  layoutEffects: Array<() => void>;
  passiveEffects: Array<() => void>;
  flushing: boolean;
  disposed: boolean;
  identifierPrefix: string;
  nextComponentId: number;
  rootContext: Map<symbol, unknown>;
  enqueue(instance: ComponentInstance): void;
  requestFlush(): void;
  flush(): void;
}
