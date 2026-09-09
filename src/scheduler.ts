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

import type { ComponentInstance, RootInternals } from '../type/internal.js';

let batchDepth = 0;
const pendingRoots = new Set<RootInternals>();

export function scheduleUpdate(instance: ComponentInstance): void {
  if (!instance.mounted || instance.root.disposed) {
    return;
  }

  instance.dirty = true;
  instance.root.enqueue(instance);
  pendingRoots.add(instance.root);

  if (batchDepth === 0) {
    instance.root.requestFlush();
  }
}

export function markRootFlushed(root: RootInternals): void {
  pendingRoots.delete(root);
}

export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      for (const root of pendingRoots) {
        root.requestFlush();
      }
    }
  }
}

export function flushSync<T>(fn?: () => T): T | undefined {
  batchDepth++;
  let result: T | undefined;
  try {
    result = fn?.();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      const roots = [...pendingRoots];
      for (const root of roots) {
        root.flush();
      }
    }
  }

  return result;
}
