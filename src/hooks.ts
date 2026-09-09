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

import { scheduleUpdate } from './scheduler.js';
import type { StateSetter, StateUpdater } from '../type/hooks.js';
import type { ComponentInstance, HookSlot } from '../type/internal.js';

let currentInstance: ComponentInstance | null = null;

export function setCurrentInstance(instance: ComponentInstance | null): void {
  currentInstance = instance;
}

export function getCurrentInstance(): ComponentInstance {
  if (!currentInstance) {
    throw new Error('Hooks can only be called while rendering a function component.');
  }

  return currentInstance;
}

function nextHook(kind: string): [ComponentInstance, HookSlot, number] {
  const instance = getCurrentInstance();
  const index = instance.hookIndex++;

  let slot = instance.hooks[index];
  if (!slot) {
    slot = { kind };
    instance.hooks[index] = slot;
  } else if (slot.kind !== kind) {
    throw new Error(
      `Hook order changed in ${instance.type.displayName ?? instance.type.name ?? 'component'} at slot ${index}.`,
    );
  }

  return [instance, slot, index];
}

export function useState<T>(initial: T | (() => T)): [T, StateSetter<T>] {
  const [instance, slot] = nextHook('state');
  if (!('value' in slot)) {
    slot.value = typeof initial === 'function' ? (initial as () => T)() : initial;
  }

  if (!slot.dispatch) {
    slot.dispatch = ((next: StateUpdater<T>): void => {
      if (!instance.mounted) {
        return;
      }

      if (currentInstance) {
        throw new Error('State updates during component rendering are not supported.');
      }

      const previous = slot.value as T;
      const value = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;

      if (Object.is(previous, value)) {
        return;
      }

      slot.value = value;
      scheduleUpdate(instance);
    }) as unknown as (...args: unknown[]) => void;
  }

  return [slot.value as T, slot.dispatch as StateSetter<T>];
}

export function useReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
): [S, (action: A) => void] {
  const [instance, slot] = nextHook('reducer');
  if (!('value' in slot)) {
    slot.value = initialState;
  }

  slot.reducer = reducer as (...args: unknown[]) => unknown;
  if (!slot.dispatch) {
    slot.dispatch = ((action: A): void => {
      if (!instance.mounted) {
        return;
      }

      if (currentInstance) {
        throw new Error('Reducer dispatch during component rendering is not supported.');
      }

      const previous = slot.value as S;
      const next = (slot.reducer as (state: S, action: A) => S)(previous, action);

      if (Object.is(previous, next)) {
        return;
      }

      slot.value = next;
      scheduleUpdate(instance);
    }) as unknown as (...args: unknown[]) => void;
  }

  return [slot.value as S, slot.dispatch as (action: A) => void];
}

function depsChanged(
  previous: readonly unknown[] | undefined,
  next: readonly unknown[] | undefined,
): boolean {
  if (!previous || !next || previous.length !== next.length) {
    return true;
  }

  for (let i = 0; i < previous.length; i++) {
    if (!Object.is(previous[i], next[i])) {
      return true;
    }
  }

  return false;
}

function useEffectImpl(
  kind: 'effect' | 'layout-effect',
  create: () => void | (() => void),
  deps?: readonly unknown[],
): void {
  const [instance, slot] = nextHook(kind);
  if (!depsChanged(slot.deps, deps)) {
    return;
  }

  slot.deps = deps;
  slot.create = create;

  const generation = ((slot.value as number | undefined) ?? 0) + 1;
  slot.value = generation;

  const run = (): void => {
    if (!instance.mounted || slot.value !== generation) {
      return;
    }

    if (typeof slot.cleanup === 'function') {
      slot.cleanup();
    }

    slot.cleanup = create();
  };

  if (kind === 'layout-effect') {
    instance.root.layoutEffects.push(run);
  } else {
    instance.root.passiveEffects.push(run);
  }
}

export function useEffect(create: () => void | (() => void), deps?: readonly unknown[]): void {
  useEffectImpl('effect', create, deps);
}

export function useLayoutEffect(
  create: () => void | (() => void),
  deps?: readonly unknown[],
): void {
  useEffectImpl('layout-effect', create, deps);
}

export function useMemo<T>(factory: () => T, deps?: readonly unknown[]): T {
  const [, slot] = nextHook('memo');
  if (!('value' in slot) || depsChanged(slot.deps, deps)) {
    slot.value = factory();
    slot.deps = deps;
  }

  return slot.value as T;
}

export function useCallback<T extends Function>(callback: T, deps?: readonly unknown[]): T {
  return useMemo(() => callback, deps);
}

export function useRef<T>(initialValue: T): { current: T } {
  const [, slot] = nextHook('ref');
  if (!('value' in slot)) {
    slot.value = { current: initialValue };
  }

  return slot.value as { current: T };
}

export function useContext<T>(context: { id: symbol; defaultValue: T }): T {
  const [instance] = nextHook('context');
  return instance.contexts.has(context.id)
    ? (instance.contexts.get(context.id) as T)
    : context.defaultValue;
}

export function useId(): string {
  const [instance, slot, index] = nextHook('id');
  if (!('value' in slot)) {
    slot.value = `${instance.root.identifierPrefix}v-${instance.id}-${index}`;
  }

  return slot.value as string;
}

export function cleanupHooks(instance: ComponentInstance): void {
  for (const slot of instance.hooks) {
    if (typeof slot.cleanup === 'function') {
      try {
        slot.cleanup();
      } catch (error) {
        if (instance.root.options.onError) {
          instance.root.options.onError(error);
        } else {
          setTimeout(() => {
            throw error;
          }, 0);
        }
      }

      slot.cleanup = undefined;
    }
  }
}
