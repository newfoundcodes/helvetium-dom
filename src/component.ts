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

import { setCurrentInstance } from './hooks.js';
import { normalizeVNode } from './vnode.js';
import type { ComponentType, FunctionComponent, Ref, VNode, VNodeChild } from '../type/core.js';
import type { ComponentInstance, RootInternals } from '../type/internal.js';

export function createComponentInstance(
  vnode: VNode,
  parent: ComponentInstance | null,
  root: RootInternals,
): ComponentInstance {
  const type = vnode.kind as ComponentType<never>;
  return {
    id: ++root.nextComponentId,
    vnode,
    type,
    parent,
    root,
    hooks: [],
    hookIndex: 0,
    subtree: null,
    mounted: true,
    dirty: false,
    depth: parent ? parent.depth + 1 : 0,
    contexts: parent?.contexts ?? root.rootContext,
    inheritedContexts: parent?.contexts ?? root.rootContext,
    renderedProps: null,
  };
}

function contextFor(instance: ComponentInstance): Map<symbol, unknown> {
  const inherited = instance.parent?.contexts ?? instance.root.rootContext;
  const providerId = instance.type.__helvetiumContextProvider;

  if (!providerId) {
    instance.inheritedContexts = inherited;
    return inherited;
  }

  const nextValue = instance.vnode.props.value;
  if (
    instance.inheritedContexts === inherited &&
    Object.is(instance.contexts.get(providerId), nextValue)
  ) {
    return instance.contexts;
  }

  const next = new Map(inherited);
  next.set(providerId, nextValue);

  instance.inheritedContexts = inherited;
  return next;
}

export function renderComponent(instance: ComponentInstance): VNode | null {
  const previousHookCount = instance.renderedProps === null ? null : instance.hooks.length;
  instance.hookIndex = 0;
  instance.contexts = contextFor(instance);

  setCurrentInstance(instance);
  try {
    const type = instance.type;
    let output: VNodeChild;

    if (type.__helvetiumForwardRef) {
      output = (
        type as unknown as (props: Record<string, unknown>, ref: Ref<unknown>) => VNodeChild
      )(instance.vnode.props, instance.vnode.ref);
    } else {
      output = (type as Function)(instance.vnode.props);
    }

    if (previousHookCount !== null && instance.hookIndex !== previousHookCount) {
      throw new Error(
        `Hook count changed in ${instance.type.displayName ?? instance.type.name ?? 'component'}: ` +
          `expected ${previousHookCount}, received ${instance.hookIndex}.`,
      );
    }

    instance.renderedProps = instance.vnode.props;
    return normalizeVNode(output);
  } finally {
    setCurrentInstance(null);
  }
}

export function memo<P>(
  component: FunctionComponent<P>,
  compare: (previous: Readonly<P>, next: Readonly<P>) => boolean = shallowEqual,
): FunctionComponent<P> {
  const wrapped = ((props: P, ref?: Ref<unknown>) => {
    if (component.__helvetiumForwardRef) {
      return (component as unknown as (props: P, ref: Ref<unknown>) => VNodeChild)(props, ref);
    }

    return component(props);
  }) as FunctionComponent<P>;

  wrapped.displayName = `Memo(${component.displayName ?? component.name ?? 'Component'})`;
  wrapped.__helvetiumMemoCompare = compare;
  wrapped.__helvetiumForwardRef = component.__helvetiumForwardRef;
  wrapped.__helvetiumContextProvider = component.__helvetiumContextProvider;
  return wrapped;
}

export function forwardRef<P, T>(
  render: (props: P, ref: Ref<T>) => VNodeChild,
): FunctionComponent<P> {
  const wrapped = ((props: P, ref?: Ref<T>) => render(props, ref)) as FunctionComponent<P>;
  wrapped.displayName = `ForwardRef(${render.name || 'Component'})`;
  wrapped.__helvetiumForwardRef = true;
  return wrapped;
}

export function shallowEqual(a: Readonly<unknown>, b: Readonly<unknown>): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);

  if (aKeys.length !== Object.keys(bRecord).length) {
    return false;
  }

  for (const key of aKeys) {
    if (
      !Object.prototype.hasOwnProperty.call(bRecord, key) ||
      !Object.is(aRecord[key], bRecord[key])
    ) {
      return false;
    }
  }

  return true;
}
