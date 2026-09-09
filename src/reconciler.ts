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

import { cleanupHooks } from './hooks.js';
import { expectedNamespace } from './dom-names.js';
import { createComponentInstance, renderComponent } from './component.js';
import { clearElementRuntimeState, patchProps } from './props.js';
import { setRef } from './ref.js';
import { FRAGMENT, PORTAL, TEXT } from './symbols.js';
import type { VNode } from '../type/core.js';
import type { ComponentInstance, RootInternals } from '../type/internal.js';
import type { RenderAttempt } from '../type/reconciler.js';

function isComponent(vnode: VNode): boolean {
  return typeof vnode.kind === 'function';
}

function sameType(a: VNode, b: VNode): boolean {
  if (a.kind !== b.kind || a.key !== b.key) {
    return false;
  }

  if (a.kind === PORTAL) {
    return a.props.target === b.props.target;
  }

  return true;
}

function createElementFor(parent: Node, tag: string): Element {
  const doc = parent.ownerDocument ?? (parent as Document);
  const namespace = expectedNamespace(parent, tag);
  return namespace === 'http://www.w3.org/1999/xhtml'
    ? doc.createElement(tag)
    : doc.createElementNS(namespace, tag);
}

function report(root: RootInternals, error: unknown, recoverable = false): void {
  if (recoverable) {
    if (root.options.onRecoverableError) {
      root.options.onRecoverableError(error);
    } else if (typeof console !== 'undefined') {
      console.warn(error);
    }

    return;
  }

  if (root.options.onError) {
    root.options.onError(error);
  } else {
    throw error;
  }
}

export function attemptComponentRender(instance: ComponentInstance): RenderAttempt {
  const root = instance.root;
  const layoutLength = root.layoutEffects.length;
  const passiveLength = root.passiveEffects.length;
  const hookLength = instance.hooks.length;
  const hookSnapshots = instance.hooks.map((slot) => ({ ...slot }));
  const previousContexts = instance.contexts;
  const previousInheritedContexts = instance.inheritedContexts;
  const previousRenderedProps = instance.renderedProps;

  try {
    return { ok: true, subtree: renderComponent(instance) };
  } catch (error) {
    root.layoutEffects.length = layoutLength;
    root.passiveEffects.length = passiveLength;

    for (let i = 0; i < hookLength; i++) {
      const slot = instance.hooks[i];
      const snapshot = hookSnapshots[i];

      for (const key of Object.keys(slot)) {
        delete (slot as unknown as Record<string, unknown>)[key];
      }

      Object.assign(slot, snapshot);
    }

    instance.hooks.length = hookLength;
    instance.contexts = previousContexts;
    instance.inheritedContexts = previousInheritedContexts;
    instance.renderedProps = previousRenderedProps;
    instance.hookIndex = 0;
    return { ok: false, subtree: instance.subtree, error };
  }
}

export function firstDom(vnode: VNode | null): Node | null {
  return vnode?._start ?? null;
}

export function lastDom(vnode: VNode | null): Node | null {
  return vnode?._end ?? null;
}

function insert(parent: Node, node: Node, anchor: Node | null): void {
  parent.insertBefore(node, anchor);
}

function moveRange(parent: Node, vnode: VNode, anchor: Node | null): void {
  const start = vnode._start;
  const end = vnode._end;

  if (!start || !end) {
    return;
  }

  if (end.nextSibling === anchor) {
    return;
  }

  let current: Node | null = start;
  const stop = end.nextSibling;

  while (current && current !== stop) {
    const nextNode: ChildNode | null = current.nextSibling;

    parent.insertBefore(current, anchor);
    current = nextNode;
  }
}

function mountText(parent: Node, vnode: VNode, anchor: Node | null): void {
  const text = (parent.ownerDocument ?? document).createTextNode(
    String(vnode.props.nodeValue ?? ''),
  );

  vnode._start = vnode._end = text;
  insert(parent, text, anchor);
}

function mountFragment(
  parent: Node,
  vnode: VNode,
  anchor: Node | null,
  owner: ComponentInstance | null,
  root: RootInternals,
): void {
  const doc = parent.ownerDocument ?? document;
  const start = doc.createComment('v:f');
  const end = doc.createComment('/v:f');

  vnode._start = start;
  vnode._end = end;

  insert(parent, start, anchor);
  insert(parent, end, anchor);

  for (const child of vnode.children) {
    mount(parent, child, end, owner, root);
  }
}

function mountElement(
  parent: Node,
  vnode: VNode,
  anchor: Node | null,
  owner: ComponentInstance | null,
  root: RootInternals,
): void {
  const element = createElementFor(parent, vnode.kind as string);
  vnode._start = vnode._end = element;
  patchProps(element, {}, vnode.props);

  const raw = vnode.props.dangerouslySetInnerHTML as { __html?: unknown } | undefined;
  if (raw && raw.__html != null) {
    element.innerHTML = String(raw.__html);
  } else {
    for (const child of vnode.children) {
      mount(element, child, null, owner, root);
    }
  }

  insert(parent, element, anchor);
  setRef(vnode.ref, element);
}

function mountComponent(
  parent: Node,
  vnode: VNode,
  anchor: Node | null,
  owner: ComponentInstance | null,
  root: RootInternals,
): void {
  const doc = parent.ownerDocument ?? document;
  const start = doc.createComment('v:c');
  const end = doc.createComment('/v:c');

  vnode._start = start;
  vnode._end = end;

  insert(parent, start, anchor);
  insert(parent, end, anchor);

  const instance = createComponentInstance(vnode, owner, root);
  vnode._instance = instance;

  const attempt = attemptComponentRender(instance);
  if (!attempt.ok) {
    instance.dirty = true;
    if (!root.options.onError) {
      instance.mounted = false;
      cleanupHooks(instance);

      start.parentNode?.removeChild(start);
      end.parentNode?.removeChild(end);
    }

    report(root, attempt.error);
    return;
  }

  instance.subtree = attempt.subtree;
  if (attempt.subtree) {
    mount(parent, attempt.subtree, end, instance, root);
  }
}

function mountPortal(
  parent: Node,
  vnode: VNode,
  anchor: Node | null,
  owner: ComponentInstance | null,
  root: RootInternals,
): void {
  const doc = parent.ownerDocument ?? document;
  const sourceStart = doc.createComment('v:p');
  const sourceEnd = doc.createComment('/v:p');

  vnode._start = sourceStart;
  vnode._end = sourceEnd;

  insert(parent, sourceStart, anchor);
  insert(parent, sourceEnd, anchor);

  const target = vnode.props.target as Element | DocumentFragment;
  if (!target || typeof target.insertBefore !== 'function') {
    throw new TypeError('Portal target must be an Element or DocumentFragment.');
  }

  const targetDoc = target.ownerDocument ?? doc;
  const start = targetDoc.createComment('v:portal');
  const end = targetDoc.createComment('/v:portal');

  target.appendChild(start);
  target.appendChild(end);

  const current =
    vnode.children.length === 1
      ? vnode.children[0]
      : ({
          kind: FRAGMENT,
          props: {},
          children: vnode.children,
          key: null,
          ref: null,
          _start: null,
          _end: null,
        } as VNode);
  vnode._portalState = { target, current, start, end };

  if (current) {
    mount(target, current, end, owner, root);
  }
}

export function mount(
  parent: Node,
  vnode: VNode,
  anchor: Node | null,
  owner: ComponentInstance | null,
  root: RootInternals,
): void {
  if (vnode.kind === TEXT) {
    mountText(parent, vnode, anchor);
  } else if (vnode.kind === FRAGMENT) {
    mountFragment(parent, vnode, anchor, owner, root);
  } else if (vnode.kind === PORTAL) {
    mountPortal(parent, vnode, anchor, owner, root);
  } else if (isComponent(vnode)) {
    mountComponent(parent, vnode, anchor, owner, root);
  } else {
    mountElement(parent, vnode, anchor, owner, root);
  }
}

function patchText(oldVNode: VNode, newVNode: VNode): void {
  const node = oldVNode._start as Text;
  const next = String(newVNode.props.nodeValue ?? '');

  if (node.nodeValue !== next) {
    node.nodeValue = next;
  }

  newVNode._start = newVNode._end = node;
}

function patchElement(
  oldVNode: VNode,
  newVNode: VNode,
  owner: ComponentInstance | null,
  root: RootInternals,
): void {
  const element = oldVNode._start as Element;
  newVNode._start = newVNode._end = element;

  const oldRef = oldVNode.ref;
  const newRef = newVNode.ref;
  patchProps(element, oldVNode.props, newVNode.props);

  const oldRaw = oldVNode.props.dangerouslySetInnerHTML as { __html?: unknown } | undefined;
  const newRaw = newVNode.props.dangerouslySetInnerHTML as { __html?: unknown } | undefined;

  if (newRaw && newRaw.__html != null) {
    if (!(oldRaw && oldRaw.__html != null)) {
      for (const child of oldVNode.children) {
        unmount(child, root);
      }
    }

    const html = String(newRaw.__html);
    if (element.innerHTML !== html) {
      element.innerHTML = html;
    }
  } else {
    const previousChildren = oldRaw && oldRaw.__html != null ? [] : oldVNode.children;
    if (oldRaw && oldRaw.__html != null) {
      element.textContent = '';
    }

    patchChildren(element, previousChildren, newVNode.children, null, owner, root);
  }

  if (oldRef !== newRef) {
    setRef(oldRef, null);
    setRef(newRef, element);
  }
}

function patchFragment(
  parent: Node,
  oldVNode: VNode,
  newVNode: VNode,
  owner: ComponentInstance | null,
  root: RootInternals,
): void {
  newVNode._start = oldVNode._start;
  newVNode._end = oldVNode._end;

  patchChildren(parent, oldVNode.children, newVNode.children, newVNode._end, owner, root);
}

function patchComponent(
  parent: Node,
  oldVNode: VNode,
  newVNode: VNode,
  owner: ComponentInstance | null,
  root: RootInternals,
): void {
  const instance = oldVNode._instance;
  if (!instance) {
    throw new Error('Component VNode is missing its instance.');
  }

  newVNode._start = oldVNode._start;
  newVNode._end = oldVNode._end;
  newVNode._instance = instance;

  const inheritedContext = owner?.contexts ?? root.rootContext;
  const comparator = instance.type.__helvetiumMemoCompare;
  const canMemo =
    !!comparator && instance.contexts === inheritedContext && oldVNode.ref === newVNode.ref;
  const shouldSkip = canMemo && (comparator as Function)(oldVNode.props, newVNode.props);

  instance.vnode = newVNode;
  instance.parent = owner;
  instance.depth = owner ? owner.depth + 1 : 0;

  if (shouldSkip && !instance.dirty) {
    return;
  }

  const attempt = attemptComponentRender(instance);
  if (!attempt.ok) {
    instance.dirty = true;
    report(root, attempt.error);
    return;
  }

  const oldSubtree = instance.subtree;
  instance.subtree = patch(parent, oldSubtree, attempt.subtree, newVNode._end, instance, root);
  instance.dirty = false;
}

function patchPortal(
  oldVNode: VNode,
  newVNode: VNode,
  owner: ComponentInstance | null,
  root: RootInternals,
): void {
  const state = oldVNode._portalState;
  if (!state) {
    throw new Error('Portal VNode is missing runtime state.');
  }

  newVNode._start = oldVNode._start;
  newVNode._end = oldVNode._end;
  newVNode._portalState = state;

  const next =
    newVNode.children.length === 1
      ? newVNode.children[0]
      : ({
          kind: FRAGMENT,
          props: {},
          children: newVNode.children,
          key: null,
          ref: null,
          _start: null,
          _end: null,
        } as VNode);
  state.current = patch(state.target, state.current, next, state.end, owner, root);
}

export function patch(
  parent: Node,
  oldVNode: VNode | null,
  newVNode: VNode | null,
  anchor: Node | null,
  owner: ComponentInstance | null,
  root: RootInternals,
): VNode | null {
  if (!oldVNode && !newVNode) {
    return null;
  }

  if (!oldVNode && newVNode) {
    mount(parent, newVNode, anchor, owner, root);
    return newVNode;
  }

  if (oldVNode && !newVNode) {
    unmount(oldVNode, root);
    return null;
  }

  oldVNode = oldVNode!;
  newVNode = newVNode!;

  if (!sameType(oldVNode, newVNode)) {
    const replacementAnchor = oldVNode._end?.nextSibling ?? anchor;

    unmount(oldVNode, root);
    mount(parent, newVNode, replacementAnchor, owner, root);
    return newVNode;
  }

  if (newVNode.kind === TEXT) {
    patchText(oldVNode, newVNode);
  } else if (newVNode.kind === FRAGMENT) {
    patchFragment(parent, oldVNode, newVNode, owner, root);
  } else if (newVNode.kind === PORTAL) {
    patchPortal(oldVNode, newVNode, owner, root);
  } else if (isComponent(newVNode)) {
    patchComponent(parent, oldVNode, newVNode, owner, root);
  } else {
    patchElement(oldVNode, newVNode, owner, root);
  }

  return newVNode;
}

function patchChildren(
  parent: Node,
  oldChildren: readonly VNode[],
  newChildren: readonly VNode[],
  boundaryAnchor: Node | null,
  owner: ComponentInstance | null,
  root: RootInternals,
): void {
  if (oldChildren.length === 0) {
    let anchor = boundaryAnchor;
    for (let i = newChildren.length - 1; i >= 0; i--) {
      mount(parent, newChildren[i], anchor, owner, root);
      anchor = newChildren[i]._start;
    }

    return;
  }

  if (newChildren.length === 0) {
    for (const child of oldChildren) {
      unmount(child, root);
    }

    return;
  }

  const keyed = new Map<string | number, number>();
  for (let i = 0; i < oldChildren.length; i++) {
    const key = oldChildren[i].key;
    if (key != null) {
      if (keyed.has(key)) {
        report(root, new Error(`Duplicate old sibling key: ${String(key)}`), true);
      }

      keyed.set(key, i);
    }
  }

  const used = new Array(oldChildren.length).fill(false) as boolean[];
  const matches = new Array<number>(newChildren.length).fill(-1);
  const seenNewKeys = new Set<string | number>();

  for (let i = 0; i < newChildren.length; i++) {
    const next = newChildren[i];
    let match = -1;

    if (next.key != null) {
      if (seenNewKeys.has(next.key)) {
        report(root, new Error(`Duplicate new sibling key: ${String(next.key)}`), true);
      }

      seenNewKeys.add(next.key);

      const candidate = keyed.get(next.key);
      if (candidate != null && !used[candidate] && oldChildren[candidate].kind === next.kind) {
        match = candidate;
      }
    } else if (
      i < oldChildren.length &&
      !used[i] &&
      oldChildren[i].key == null &&
      oldChildren[i].kind === next.kind
    ) {
      match = i;
    }

    if (match >= 0) {
      used[match] = true;
      matches[i] = match;
    }
  }

  let anchor = boundaryAnchor;
  for (let i = newChildren.length - 1; i >= 0; i--) {
    const oldIndex = matches[i];
    const oldChild = oldIndex >= 0 ? oldChildren[oldIndex] : null;
    const nextChild = patch(parent, oldChild, newChildren[i], anchor, owner, root)!;

    moveRange(parent, nextChild, anchor);
    anchor = nextChild._start;
  }

  for (let i = 0; i < oldChildren.length; i++) {
    if (!used[i]) {
      unmount(oldChildren[i], root);
    }
  }
}

function removeRange(start: Node | null, end: Node | null): void {
  if (!start || !end) {
    return;
  }

  let current: Node | null = start;
  const stop = end.nextSibling;

  while (current && current !== stop) {
    const nextNode: ChildNode | null = current.nextSibling;

    current.parentNode?.removeChild(current);
    current = nextNode;
  }
}

export function unmount(vnode: VNode, root: RootInternals): void {
  if (vnode.kind === TEXT) {
    vnode._start?.parentNode?.removeChild(vnode._start);
    return;
  }

  if (vnode.kind === FRAGMENT) {
    for (const child of vnode.children) {
      unmount(child, root);
    }

    vnode._start?.parentNode?.removeChild(vnode._start);
    vnode._end?.parentNode?.removeChild(vnode._end);
    return;
  }

  if (vnode.kind === PORTAL) {
    const state = vnode._portalState;
    if (state?.current) {
      unmount(state.current, root);
    }

    state?.start.parentNode?.removeChild(state.start);
    state?.end.parentNode?.removeChild(state.end);

    removeRange(vnode._start, vnode._end);
    return;
  }

  if (isComponent(vnode)) {
    const instance = vnode._instance;
    if (instance) {
      instance.mounted = false;
      instance.root.scheduled.delete(instance);

      cleanupHooks(instance);
      if (instance.subtree) {
        unmount(instance.subtree, root);
      }
    }

    vnode._start?.parentNode?.removeChild(vnode._start);
    vnode._end?.parentNode?.removeChild(vnode._end);
    return;
  }

  const element = vnode._start as Element | null;
  if (element) {
    setRef(vnode.ref, null);
    for (const child of vnode.children) {
      unmount(child, root);
    }

    clearElementRuntimeState(element);
    element.parentNode?.removeChild(element);
  }
}

export function performComponentUpdate(instance: ComponentInstance): void {
  if (!instance.mounted || !instance.dirty) {
    return;
  }

  const parent = instance.vnode._start?.parentNode;
  const end = instance.vnode._end;

  if (!parent || !end) {
    return;
  }

  const attempt = attemptComponentRender(instance);
  if (!attempt.ok) {
    instance.dirty = true;

    report(instance.root, attempt.error);
    return;
  }

  const oldSubtree = instance.subtree;
  instance.subtree = patch(parent, oldSubtree, attempt.subtree, end, instance, instance.root);
  instance.dirty = false;
}
