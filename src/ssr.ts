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

import { createComponentInstance, renderComponent } from './component.js';
import { isEventProp } from './events.js';
import { attributeNameForProp, BOOLEAN_ATTRIBUTES, isAriaOrDataAttribute } from './dom-names.js';
import { styleObjectToString } from './style.js';
import { FRAGMENT, PORTAL, TEXT } from './symbols.js';
import type { RootOptions, VNode, VNodeChild } from '../type/core.js';
import type { CSSProperties } from '../type/dom.js';
import type { ComponentInstance, RootInternals } from '../type/internal.js';
import type { RenderToStringOptions } from '../type/server.js';
import { normalizeVNode } from './vnode.js';

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function escapeText(value: unknown): string {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttribute(value: unknown): string {
  return escapeText(value).replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function serializeAttributes(props: Record<string, unknown>): string {
  let out = '';
  for (const [key, value] of Object.entries(props)) {
    if (
      key === 'children' ||
      key === 'key' ||
      key === 'ref' ||
      key === 'dangerouslySetInnerHTML' ||
      isEventProp(key)
    ) {
      continue;
    }

    if (value == null) {
      continue;
    }

    const name = attributeNameForProp(key);
    if (value === false && !isAriaOrDataAttribute(name)) {
      continue;
    }

    if (key === 'style') {
      const style = typeof value === 'string' ? value : styleObjectToString(value as CSSProperties);
      if (style) {
        out += ` style="${escapeAttribute(style)}"`;
      }

      continue;
    }

    if (BOOLEAN_ATTRIBUTES.has(name.toLowerCase())) {
      if (value) {
        out += ` ${name}`;
      }

      continue;
    }

    out += ` ${name}="${escapeAttribute(value)}"`;
  }

  return out;
}

function serverRoot(options: RenderToStringOptions): RootInternals {
  const noop = (): void => {};

  return {
    container: null as unknown as DocumentFragment,
    current: null,
    options: {} as RootOptions,
    scheduled: new Set(),
    layoutEffects: [],
    passiveEffects: [],
    flushing: false,
    disposed: false,
    identifierPrefix: options.identifierPrefix ?? '',
    nextComponentId: 0,
    rootContext: new Map(),
    enqueue: noop,
    requestFlush: noop,
    flush: noop,
  };
}

function renderVNode(
  vnode: VNode,
  owner: ComponentInstance | null,
  root: RootInternals,
  markers: boolean,
): string {
  if (vnode.kind === TEXT) {
    return escapeText(vnode.props.nodeValue ?? '');
  }

  if (vnode.kind === PORTAL) {
    throw new Error('Portals cannot be serialized. Render portal content only on the client.');
  }

  if (vnode.kind === FRAGMENT) {
    const body = vnode.children.map((child) => renderVNode(child, owner, root, markers)).join('');
    return markers ? `<!--v:f-->${body}<!--/v:f-->` : body;
  }

  if (typeof vnode.kind === 'function') {
    const instance = createComponentInstance(vnode, owner, root);
    const subtree = renderComponent(instance);
    instance.subtree = subtree;

    const body = subtree ? renderVNode(subtree, instance, root, markers) : '';
    return markers ? `<!--v:c-->${body}<!--/v:c-->` : body;
  }

  const tag = vnode.kind as string;
  const attrs = serializeAttributes(vnode.props);

  if (VOID_ELEMENTS.has(tag)) {
    return `<${tag}${attrs}>`;
  }

  const raw = vnode.props.dangerouslySetInnerHTML as { __html?: unknown } | undefined;
  const body =
    raw && raw.__html != null
      ? String(raw.__html)
      : vnode.children.map((child) => renderVNode(child, owner, root, markers)).join('');
  return `<${tag}${attrs}>${body}</${tag}>`;
}

export function renderToString(node: VNodeChild, options: RenderToStringOptions = {}): string {
  const vnode = normalizeVNode(node);
  if (!vnode) {
    return '';
  }

  return renderVNode(vnode, null, serverRoot(options), true);
}

export function renderToStaticMarkup(
  node: VNodeChild,
  options: RenderToStringOptions = {},
): string {
  const vnode = normalizeVNode(node);
  if (!vnode) {
    return '';
  }

  return renderVNode(vnode, null, serverRoot(options), false);
}
