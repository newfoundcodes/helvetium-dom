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

import { normalizeVNode } from './vnode.js';
import { markRootFlushed } from './scheduler.js';
import { patch, performComponentUpdate, unmount } from './reconciler.js';
import type { Root, RootOptions, VNodeChild } from '../type/core.js';
import type { ComponentInstance, RootInternals } from '../type/internal.js';

function runLayoutEffects(root: RootInternals): void {
  if (root.layoutEffects.length === 0) {
    return;
  }

  const effects = root.layoutEffects.splice(0);
  for (const effect of effects) {
    try {
      effect();
    } catch (error) {
      if (root.options.onError) {
        root.options.onError(error);
      } else {
        throw error;
      }
    }
  }
}

function schedulePassiveEffects(root: RootInternals): void {
  if (root.passiveEffects.length === 0) {
    return;
  }

  const effects = root.passiveEffects.splice(0);
  queueMicrotask(() => {
    if (root.disposed) {
      return;
    }

    for (const effect of effects) {
      try {
        effect();
      } catch (error) {
        if (root.options.onError) {
          root.options.onError(error);
        } else {
          setTimeout(() => {
            throw error;
          }, 0);
        }
      }
    }
  });
}

function commitEffects(root: RootInternals): void {
  runLayoutEffects(root);
  schedulePassiveEffects(root);
}

function createInternals(
  container: Element | DocumentFragment,
  options: RootOptions,
): RootInternals {
  const root: RootInternals = {
    container,
    current: null,
    options,
    scheduled: new Set(),
    layoutEffects: [],
    passiveEffects: [],
    flushing: false,
    disposed: false,
    identifierPrefix: options.identifierPrefix ?? '',
    nextComponentId: 0,
    rootContext: new Map(),
    enqueue(instance: ComponentInstance): void {
      root.scheduled.add(instance);
    },
    requestFlush(): void {
      if (root.flushing || root.disposed) {
        return;
      }

      root.flushing = true;
      queueMicrotask(() => root.flush());
    },
    flush(): void {
      markRootFlushed(root);
      if (root.disposed) {
        return;
      }

      root.flushing = true;
      try {
        let guard = 0;
        while (root.scheduled.size > 0) {
          if (++guard > 1000) {
            throw new Error('Update loop exceeded 1000 scheduler passes.');
          }

          const batch = [...root.scheduled].sort((a, b) => a.depth - b.depth);
          root.scheduled.clear();

          for (const instance of batch) {
            performComponentUpdate(instance);
          }
        }
      } finally {
        root.flushing = false;
      }

      commitEffects(root);
    },
  };
  return root;
}

export function createRoot(container: Element | DocumentFragment, options: RootOptions = {}): Root {
  if (!container || typeof container.insertBefore !== 'function') {
    throw new TypeError('createRoot() requires an Element or DocumentFragment container.');
  }

  const internal = createInternals(container, options);
  let initialized = false;
  return {
    render(node: VNodeChild): void {
      if (internal.disposed) {
        throw new Error('Cannot render into an unmounted root.');
      }

      if (!initialized) {
        container.replaceChildren();
        initialized = true;
      }

      const next = normalizeVNode(node);
      internal.current = patch(container, internal.current, next, null, null, internal);

      commitEffects(internal);
    },
    unmount(): void {
      if (internal.disposed) {
        return;
      }

      if (internal.current) {
        unmount(internal.current, internal);
      }

      internal.current = null;
      internal.scheduled.clear();
      internal.layoutEffects.length = 0;
      internal.passiveEffects.length = 0;
      internal.disposed = true;

      markRootFlushed(internal);
    },
    flush(): void {
      internal.flush();
    },
  };
}

export { createInternals as createRootInternals, commitEffects as commitRootEffects };
