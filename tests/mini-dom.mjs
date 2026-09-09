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

const HTML_NS = 'http://www.w3.org/1999/xhtml';

class MiniNode {
  static ELEMENT_NODE = 1;
  static TEXT_NODE = 3;
  static COMMENT_NODE = 8;
  static DOCUMENT_NODE = 9;
  static DOCUMENT_FRAGMENT_NODE = 11;

  constructor(nodeType, ownerDocument = null) {
    this.nodeType = nodeType;
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this._children = [];
  }

  get childNodes() {
    return this._children;
  }

  get firstChild() {
    return this._children[0] ?? null;
  }

  get lastChild() {
    return this._children[this._children.length - 1] ?? null;
  }

  get nextSibling() {
    if (!this.parentNode) {
      return null;
    }

    const siblings = this.parentNode._children;
    const index = siblings.indexOf(this);
    return index >= 0 ? (siblings[index + 1] ?? null) : null;
  }

  get previousSibling() {
    if (!this.parentNode) {
      return null;
    }

    const siblings = this.parentNode._children;
    const index = siblings.indexOf(this);
    return index > 0 ? siblings[index - 1] : null;
  }

  appendChild(node) {
    return this.insertBefore(node, null);
  }

  append(...nodes) {
    for (const value of nodes) {
      const node =
        value instanceof MiniNode
          ? value
          : (this.ownerDocument ?? this).createTextNode(String(value));
      this.appendChild(node);
    }
  }

  insertBefore(node, anchor) {
    if (!(node instanceof MiniNode)) {
      throw new TypeError('insertBefore expects a Node.');
    }

    if (anchor !== null && anchor.parentNode !== this) {
      throw new Error('Anchor is not a child of this node.');
    }

    if (node === anchor) {
      return node;
    }

    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }

    const index = anchor === null ? this._children.length : this._children.indexOf(anchor);
    this._children.splice(index, 0, node);
    node.parentNode = this;

    if (!node.ownerDocument && this.ownerDocument) {
      node.ownerDocument = this.ownerDocument;
    }

    return node;
  }

  removeChild(node) {
    const index = this._children.indexOf(node);
    if (index < 0) {
      throw new Error('Node is not a child of this node.');
    }

    this._children.splice(index, 1);

    node.parentNode = null;
    return node;
  }

  replaceChildren(...nodes) {
    for (const child of this._children) {
      child.parentNode = null;
    }

    this._children = [];
    this.append(...nodes);
  }

  get textContent() {
    return this._children.map((child) => child.textContent ?? '').join('');
  }

  set textContent(value) {
    this.replaceChildren();

    const text = value == null ? '' : String(value);
    if (text !== '') {
      this.appendChild((this.ownerDocument ?? this).createTextNode(text));
    }
  }
}

class MiniText extends MiniNode {
  constructor(data, ownerDocument) {
    super(MiniNode.TEXT_NODE, ownerDocument);
    this.data = String(data);
  }

  get nodeValue() {
    return this.data;
  }

  set nodeValue(value) {
    this.data = String(value ?? '');
  }

  get textContent() {
    return this.data;
  }

  set textContent(value) {
    this.data = String(value ?? '');
  }
}

class MiniComment extends MiniNode {
  constructor(data, ownerDocument) {
    super(MiniNode.COMMENT_NODE, ownerDocument);
    this.data = String(data);
  }

  get nodeValue() {
    return this.data;
  }

  set nodeValue(value) {
    this.data = String(value ?? '');
  }

  get textContent() {
    return '';
  }

  set textContent(_) {}
}

class MiniStyleDeclaration {
  constructor() {
    this._values = new Map();
    this._cssText = '';
  }

  set cssText(value) {
    this._cssText = String(value ?? '');
    this._values.clear();

    for (const declaration of this._cssText.split(';')) {
      const index = declaration.indexOf(':');
      if (index < 0) {
        continue;
      }

      const name = declaration.slice(0, index).trim();
      const val = declaration.slice(index + 1).trim();

      if (name) {
        this._values.set(name, val);
      }
    }
  }

  get cssText() {
    if (this._cssText) {
      return this._cssText;
    }

    return [...this._values].map(([name, value]) => `${name}: ${value};`).join(' ');
  }

  setProperty(name, value) {
    this._cssText = '';
    this._values.set(String(name), String(value));
  }

  removeProperty(name) {
    this._cssText = '';

    const old = this._values.get(String(name)) ?? '';
    this._values.delete(String(name));
    return old;
  }

  getPropertyValue(name) {
    return this._values.get(String(name)) ?? '';
  }

  get display() {
    return this.getPropertyValue('display');
  }

  set display(value) {
    this.setProperty('display', value);
  }
}

function matchesSelector(element, selector) {
  if (!(element instanceof MiniElement)) {
    return false;
  }

  if (selector.startsWith('#')) {
    return element.id === selector.slice(1);
  }

  if (selector.startsWith('.')) {
    return element.className.split(/\s+/).includes(selector.slice(1));
  }

  return element.localName === selector.toLowerCase();
}

class MiniElement extends MiniNode {
  constructor(tagName, namespaceURI, ownerDocument) {
    super(MiniNode.ELEMENT_NODE, ownerDocument);
    this.namespaceURI = namespaceURI;
    this.localName = String(tagName).toLowerCase();
    this.tagName = namespaceURI === HTML_NS ? this.localName.toUpperCase() : String(tagName);
    this.nodeName = this.tagName;
    this._attributes = new Map();
    this._listeners = new Map();
    this._rawHTML = null;
    this.style = new MiniStyleDeclaration();

    this.value = '';
    this.checked = false;
    this.selected = false;
    this.muted = false;
    this.disabled = false;
    this.multiple = false;
    this.readOnly = false;
    this.required = false;
    this.autofocus = false;
    this.spellcheck = true;
    this.tabIndex = -1;
    this.contentEditable = 'inherit';
    this.draggable = false;
    this.indeterminate = false;
  }

  get id() {
    return this.getAttribute('id') ?? '';
  }

  set id(value) {
    this.setAttribute('id', value);
  }

  get className() {
    return this.getAttribute('class') ?? '';
  }

  set className(value) {
    this.setAttribute('class', value);
  }

  setAttribute(name, value) {
    this._attributes.set(String(name), String(value));

    if (name === 'style') {
      this.style.cssText = String(value);
    }
  }

  setAttributeNS(_namespace, name, value) {
    this.setAttribute(name, value);
  }

  getAttribute(name) {
    return this._attributes.has(String(name)) ? this._attributes.get(String(name)) : null;
  }

  getAttributeNames() {
    return [...this._attributes.keys()];
  }

  hasAttribute(name) {
    return this._attributes.has(String(name));
  }

  removeAttribute(name) {
    this._attributes.delete(String(name));
    if (name === 'style') {
      this.style.cssText = '';
    }
  }

  removeAttributeNS(_namespace, name) {
    this.removeAttribute(name);
  }

  addEventListener(type, listener, options = {}) {
    const list = this._listeners.get(type) ?? [];
    const normalized = typeof options === 'boolean' ? { capture: options } : { ...options };

    list.push({ listener, options: normalized });
    this._listeners.set(type, list);
  }

  removeEventListener(type, listener, options = {}) {
    const list = this._listeners.get(type);
    if (!list) {
      return;
    }

    const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
    const index = list.findIndex(
      (entry) => entry.listener === listener && Boolean(entry.options?.capture) === capture,
    );

    if (index >= 0) {
      list.splice(index, 1);
    }

    if (list.length === 0) {
      this._listeners.delete(type);
    }
  }

  dispatchEvent(event) {
    if (!event || typeof event.type !== 'string') {
      throw new TypeError('dispatchEvent expects an Event-like object.');
    }

    const list = [...(this._listeners.get(event.type) ?? [])];
    for (const entry of list) {
      if (typeof entry.listener === 'function') {
        entry.listener.call(this, event);
      } else {
        entry.listener?.handleEvent?.(event);
      }

      if (entry.options?.once) {
        this.removeEventListener(event.type, entry.listener, entry.options);
      }
    }

    return !event.defaultPrevented;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      for (const child of node._children) {
        if (matchesSelector(child, selector)) {
          matches.push(child);
        }

        if (child._children?.length) {
          visit(child);
        }
      }
    };

    visit(this);
    return matches;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  get innerHTML() {
    if (this._rawHTML !== null) {
      return this._rawHTML;
    }

    return this._children.map(serializeNode).join('');
  }

  set innerHTML(value) {
    this._rawHTML = String(value ?? '');
    for (const child of this._children) {
      child.parentNode = null;
    }

    this._children = [];
  }

  appendChild(node) {
    this._rawHTML = null;
    return super.appendChild(node);
  }

  insertBefore(node, anchor) {
    this._rawHTML = null;
    return super.insertBefore(node, anchor);
  }

  replaceChildren(...nodes) {
    this._rawHTML = null;
    return super.replaceChildren(...nodes);
  }

  get textContent() {
    return super.textContent;
  }

  set textContent(value) {
    this._rawHTML = null;
    super.textContent = value;
  }
}

class MiniDocumentFragment extends MiniNode {
  constructor(ownerDocument) {
    super(MiniNode.DOCUMENT_FRAGMENT_NODE, ownerDocument);
  }
}

class MiniDocument extends MiniNode {
  constructor() {
    super(MiniNode.DOCUMENT_NODE, null);
    this.ownerDocument = null;
    this.documentElement = this.createElement('html');
    this.body = this.createElement('body');

    this.documentElement.appendChild(this.body);
    this.appendChild(this.documentElement);
  }

  createElement(tagName) {
    return new MiniElement(tagName, HTML_NS, this);
  }

  createElementNS(namespaceURI, tagName) {
    return new MiniElement(tagName, namespaceURI, this);
  }

  createTextNode(data) {
    return new MiniText(data, this);
  }

  createComment(data) {
    return new MiniComment(data, this);
  }

  createDocumentFragment() {
    return new MiniDocumentFragment(this);
  }

  querySelector(selector) {
    if (matchesSelector(this.documentElement, selector)) {
      return this.documentElement;
    }

    return this.documentElement.querySelector(selector);
  }

  querySelectorAll(selector) {
    const own = matchesSelector(this.documentElement, selector) ? [this.documentElement] : [];
    return own.concat(this.documentElement.querySelectorAll(selector));
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function serializeNode(node) {
  if (node.nodeType === MiniNode.TEXT_NODE) {
    return escapeHtml(node.data);
  }

  if (node.nodeType === MiniNode.COMMENT_NODE) {
    return `<!--${node.data}-->`;
  }

  if (node.nodeType !== MiniNode.ELEMENT_NODE) {
    return node._children.map(serializeNode).join('');
  }

  const attrs = [...node._attributes]
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join('');
  return `<${node.localName}${attrs}>${node.innerHTML}</${node.localName}>`;
}

export function installMiniDOM() {
  const document = new MiniDocument();
  globalThis.Node = MiniNode;
  globalThis.Element = MiniElement;
  globalThis.HTMLElement = MiniElement;
  globalThis.SVGElement = MiniElement;
  globalThis.Text = MiniText;
  globalThis.Comment = MiniComment;
  globalThis.DocumentFragment = MiniDocumentFragment;
  globalThis.Document = MiniDocument;
  globalThis.document = document;
  return document;
}

export { MiniNode, MiniElement, MiniText, MiniComment, MiniDocument, MiniDocumentFragment };
