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

import { createComponentInstance } from './component.js';
import { attributeNameForProp, expectedNamespace, isAriaOrDataAttribute } from './dom-names.js';
import { isEventProp } from './events.js';
import { patchProps } from './props.js';
import { cleanupHooks } from './hooks.js';
import { setRef } from './ref.js';
import { createRootInternals, commitRootEffects } from './renderer.js';
import { attemptComponentRender, mount, patch, unmount } from './reconciler.js';
import { FRAGMENT, PORTAL, TEXT } from './symbols.js';
import { normalizeVNode } from './vnode.js';
import { markRootFlushed } from './scheduler.js';
import type { Root, RootOptions, VNode, VNodeChild } from '../type/core.js';
import type { ComponentInstance, RootInternals } from '../type/internal.js';

function recoverable(root: RootInternals, message: string): void {
  const error = new Error(message);
  if (root.options.onRecoverableError) {
    root.options.onRecoverableError(error);
  } else if (typeof console !== 'undefined') {
    console.warn(error);
  }
}

function findBoundary(start: Comment, open: string, close: string): Comment | null {
  let depth = 0;
  let node: Node | null = start;

  while (node) {
    if (node.nodeType === Node.COMMENT_NODE) {
      const data = (node as Comment).data;

      if (data === open) {
        depth++;
      } else if (data === close && --depth === 0) {
        return node as Comment;
      }
    }

    node = node.nextSibling;
  }

  return null;
}

function removeCandidate(node: Node): Node | null {
  const next = node.nextSibling;
  if (node.nodeType === Node.COMMENT_NODE) {
    const data = (node as Comment).data;
    const close = data === 'v:c' ? '/v:c' : data === 'v:f' ? '/v:f' : null;

    if (close) {
      const end = findBoundary(node as Comment, data, close);
      if (end) {
        const after = end.nextSibling;
        let current: Node | null = node;

        while (current && current !== after) {
          const nextNode: ChildNode | null = current.nextSibling;

          current.parentNode?.removeChild(current);
          current = nextNode;
        }

        return after;
      }
    }
  }

  node.parentNode?.removeChild(node);
  return next;
}

function hydrateMismatch(
  parent: Node,
  vnode: VNode,
  node: Node | null,
  owner: ComponentInstance | null,
  root: RootInternals,
): Node | null {
  recoverable(
    root,
    `Hydration mismatch while hydrating ${typeof vnode.kind === 'string' ? `<${vnode.kind}>` : 'VNode'}.`,
  );

  const anchor = node;
  mount(parent, vnode, anchor, owner, root);

  if (node) {
    return removeCandidate(node);
  }

  return null;
}

function hydrateChildren(
  parent: Node,
  children: readonly VNode[],
  start: Node | null,
  endExclusive: Node | null,
  owner: ComponentInstance | null,
  root: RootInternals,
): Node | null {
  let cursor = start;
  for (const child of children) {
    cursor = hydrateVNode(parent, child, cursor, owner, root);
  }

  while (cursor && cursor !== endExclusive) {
    cursor = removeCandidate(cursor);
  }

  return cursor;
}

function reconcileHydratedAttributes(element: Element, props: Record<string, unknown>): void {
  const expected = new Set<string>();
  for (const [propName, value] of Object.entries(props)) {
    if (
      propName === 'children' ||
      propName === 'key' ||
      propName === 'ref' ||
      propName === 'dangerouslySetInnerHTML' ||
      isEventProp(propName)
    ) {
      continue;
    }

    if (value == null) {
      continue;
    }

    const attributeName = attributeNameForProp(propName);
    if (value === false && !isAriaOrDataAttribute(attributeName)) {
      continue;
    }

    if (
      propName === 'style' &&
      (value === '' || (typeof value === 'object' && Object.keys(value as object).length === 0))
    ) {
      continue;
    }

    expected.add(attributeName.toLowerCase());
  }

  for (const attributeName of element.getAttributeNames()) {
    if (!expected.has(attributeName.toLowerCase())) {
      element.removeAttribute(attributeName);
    }
  }
}

function hydrateVNode(
  parent: Node,
  vnode: VNode,
  node: Node | null,
  owner: ComponentInstance | null,
  root: RootInternals,
): Node | null {
  if (!node) {
    mount(parent, vnode, null, owner, root);
    return null;
  }

  if (vnode.kind === TEXT) {
    if (node.nodeType !== Node.TEXT_NODE) {
      return hydrateMismatch(parent, vnode, node, owner, root);
    }

    const text = node as Text;
    const expected = String(vnode.props.nodeValue ?? '');

    if (text.nodeValue !== expected) {
      recoverable(root, `Hydration text mismatch: expected ${JSON.stringify(expected)}.`);
      text.nodeValue = expected;
    }

    vnode._start = vnode._end = text;
    return text.nextSibling;
  }

  if (vnode.kind === PORTAL) {
    return hydrateMismatch(parent, vnode, node, owner, root);
  }

  if (vnode.kind === FRAGMENT) {
    if (node.nodeType !== Node.COMMENT_NODE || (node as Comment).data !== 'v:f') {
      return hydrateMismatch(parent, vnode, node, owner, root);
    }

    const end = findBoundary(node as Comment, 'v:f', '/v:f');
    if (!end) {
      return hydrateMismatch(parent, vnode, node, owner, root);
    }

    vnode._start = node;
    vnode._end = end;

    hydrateChildren(parent, vnode.children, node.nextSibling, end, owner, root);
    return end.nextSibling;
  }

  if (typeof vnode.kind === 'function') {
    if (node.nodeType !== Node.COMMENT_NODE || (node as Comment).data !== 'v:c') {
      return hydrateMismatch(parent, vnode, node, owner, root);
    }

    const end = findBoundary(node as Comment, 'v:c', '/v:c');
    if (!end) {
      return hydrateMismatch(parent, vnode, node, owner, root);
    }

    vnode._start = node;
    vnode._end = end;

    const instance = createComponentInstance(vnode, owner, root);
    vnode._instance = instance;

    const attempt = attemptComponentRender(instance);
    if (!attempt.ok) {
      instance.dirty = true;
      let extra: Node | null = node.nextSibling;

      while (extra && extra !== end) {
        extra = removeCandidate(extra);
      }

      if (root.options.onError) {
        root.options.onError(attempt.error);
      } else {
        instance.mounted = false;
        cleanupHooks(instance);

        node.parentNode?.removeChild(node);
        end.parentNode?.removeChild(end);

        throw attempt.error;
      }

      return end.nextSibling;
    }

    instance.subtree = attempt.subtree;
    if (attempt.subtree) {
      const cursor = hydrateVNode(parent, attempt.subtree, node.nextSibling, instance, root);
      let extra = cursor;

      while (extra && extra !== end) {
        extra = removeCandidate(extra);
      }
    } else {
      let extra: Node | null = node.nextSibling;
      while (extra && extra !== end) {
        extra = removeCandidate(extra);
      }
    }

    return end.nextSibling;
  }

  if (
    node.nodeType !== Node.ELEMENT_NODE ||
    (node as Element).localName !== vnode.kind ||
    (node as Element).namespaceURI !== expectedNamespace(parent, vnode.kind)
  ) {
    return hydrateMismatch(parent, vnode, node, owner, root);
  }

  const element = node as Element;
  vnode._start = vnode._end = element;

  reconcileHydratedAttributes(element, vnode.props);
  patchProps(element, {}, vnode.props);

  const raw = vnode.props.dangerouslySetInnerHTML as { __html?: unknown } | undefined;
  if (raw && raw.__html != null) {
    const expected = String(raw.__html);
    if (element.innerHTML !== expected) {
      recoverable(root, `Hydration HTML mismatch in <${vnode.kind}>.`);
      element.innerHTML = expected;
    }
  } else {
    hydrateChildren(element, vnode.children, element.firstChild, null, owner, root);
  }

  setRef(vnode.ref, element);
  return element.nextSibling;
}

export function hydrateRoot(
  container: Element | DocumentFragment,
  node: VNodeChild,
  options: RootOptions = {},
): Root {
  if (!container || typeof container.insertBefore !== 'function') {
    throw new TypeError('hydrateRoot() requires an Element or DocumentFragment container.');
  }

  const internal = createRootInternals(container, options);
  const initial = normalizeVNode(node);

  if (initial) {
    hydrateVNode(container, initial, container.firstChild, null, internal);
    internal.current = initial;
  } else {
    container.replaceChildren();
  }

  let extra: Node | null = initial ? (initial._end?.nextSibling ?? null) : container.firstChild;
  while (extra) {
    extra = removeCandidate(extra);
  }

  commitRootEffects(internal);
  return {
    render(nextNode: VNodeChild): void {
      if (internal.disposed) {
        throw new Error('Cannot render into an unmounted root.');
      }

      const next = normalizeVNode(nextNode);
      internal.current = patch(container, internal.current, next, null, null, internal);

      commitRootEffects(internal);
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
