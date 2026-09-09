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

import { FRAGMENT, PORTAL, TEXT } from './symbols.js';
import type { ComponentType, Key, Ref, VNode, VNodeChild } from '../type/core.js';
import type { IntrinsicElementMap } from '../type/jsx-runtime.js';
import type { VNodeKind } from '../type/core.js';
import type {
  ElementChildrenAttribute as IElementChildrenAttribute,
  IntrinsicAttributes as IIntrinsicAttributes,
} from './interfaces/vnode.js';

const EMPTY_PROPS = Object.freeze({}) as Record<string, unknown>;

export function isVNode(value: unknown): value is VNode {
  return !!value && typeof value === 'object' && 'kind' in value && 'children' in value;
}

export function createTextVNode(value: string | number | bigint): VNode {
  return {
    kind: TEXT,
    props: { nodeValue: String(value) },
    children: [],
    key: null,
    ref: null,
    _start: null,
    _end: null,
  };
}

export function createVNode(
  kind: VNode['kind'],
  props: Record<string, unknown> | null,
  children: readonly VNodeChild[] = [],
): VNode {
  const input = props ?? EMPTY_PROPS;
  const key = (input.key ?? null) as Key | null;
  const ref = (input.ref ?? null) as Ref<unknown>;
  const cleanProps: Record<string, unknown> = { ...input };

  delete cleanProps.key;
  delete cleanProps.ref;

  const normalized = normalizeChildren(children);
  if (typeof kind === 'function') {
    cleanProps.children =
      normalized.length === 0 ? undefined : normalized.length === 1 ? normalized[0] : normalized;
  }

  return {
    kind,
    props: cleanProps,
    children: normalized,
    key,
    ref,
    _start: null,
    _end: null,
  };
}

export function h<P extends Record<string, unknown>>(
  kind: string | ComponentType<P> | typeof FRAGMENT,
  props?: P | null,
  ...children: VNodeChild[]
): VNode {
  return createVNode(kind as unknown as VNodeKind, props ?? null, children);
}

export namespace h {
  export namespace JSX {
    export type Element = VNode;
    export type ElementType = keyof IntrinsicElementMap | ComponentType<never>;

    export interface ElementChildrenAttribute extends IElementChildrenAttribute {}

    export interface IntrinsicAttributes extends IIntrinsicAttributes {}

    export type IntrinsicElements = IntrinsicElementMap;
  }
}

export function fragment(...children: VNodeChild[]): VNode {
  return createVNode(FRAGMENT, null, children);
}

export function createPortal(
  children: VNodeChild,
  target: Element | DocumentFragment,
  key?: Key,
): VNode {
  return createVNode(PORTAL, { target, key }, [children]);
}

export function normalizeVNode(value: VNodeChild): VNode | null {
  if (value == null || value === false || value === true) {
    return null;
  }

  if (isVNode(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return createVNode(FRAGMENT, null, value);
  }

  return createTextVNode(value as string | number | bigint);
}

export function normalizeChildren(input: readonly VNodeChild[]): VNode[] {
  const out: VNode[] = [];
  let bufferedText = '';

  const flushText = (): void => {
    if (bufferedText !== '') {
      out.push(createTextVNode(bufferedText));
      bufferedText = '';
    }
  };

  const visit = (child: VNodeChild): void => {
    if (child == null || child === false || child === true) {
      return;
    }

    if (Array.isArray(child)) {
      for (const nested of child) {
        visit(nested);
      }

      return;
    }

    if (isVNode(child)) {
      flushText();
      out.push(child);
      return;
    }

    bufferedText += String(child);
  };

  for (const child of input) {
    visit(child);
  }

  flushText();
  return out;
}

export const Fragment = FRAGMENT as typeof FRAGMENT & ComponentType<{ children?: VNodeChild }>;
