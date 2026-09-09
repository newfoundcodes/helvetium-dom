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

import { clearEvents, isEventProp, patchEvent } from './events.js';
import {
  attributeNameForProp,
  BOOLEAN_ATTRIBUTES,
  isAriaOrDataAttribute,
  SVG_NS,
  XLINK_NS,
} from './dom-names.js';
import { normalizeStyleName, normalizeStyleValue } from './style.js';
import type { CSSProperties } from '../type/dom.js';

const PROPERTY_NAMES = new Set([
  'value',
  'checked',
  'selected',
  'muted',
  'disabled',
  'multiple',
  'readOnly',
  'required',
  'autofocus',
  'autoFocus',
  'spellcheck',
  'spellCheck',
  'tabIndex',
  'contentEditable',
  'draggable',
  'indeterminate',
]);

function setStyle(element: HTMLElement | SVGElement, previous: unknown, next: unknown): void {
  const style = element.style;
  if (next == null || next === false) {
    element.removeAttribute('style');
    return;
  }

  if (typeof next === 'string') {
    if (style.cssText !== next) {
      style.cssText = next;
    }

    return;
  }

  if (typeof next !== 'object') {
    return;
  }

  if (previous && typeof previous === 'object' && typeof previous !== 'string') {
    for (const key of Object.keys(previous as CSSProperties)) {
      if (!(key in (next as CSSProperties))) {
        style.removeProperty(normalizeStyleName(key));
      }
    }
  } else if (typeof previous === 'string') {
    style.cssText = '';
  }

  for (const [key, value] of Object.entries(next as CSSProperties)) {
    const cssName = normalizeStyleName(key);
    if (value == null || value === '') {
      style.removeProperty(cssName);
    } else {
      style.setProperty(cssName, normalizeStyleValue(key, value));
    }
  }
}

function setAttribute(element: Element, name: string, value: unknown): void {
  const attrName = attributeNameForProp(name);
  if (value == null) {
    element.removeAttribute(attrName);
    return;
  }

  if (value === false && !isAriaOrDataAttribute(attrName)) {
    element.removeAttribute(attrName);
    return;
  }

  if (BOOLEAN_ATTRIBUTES.has(attrName.toLowerCase())) {
    if (value) {
      element.setAttribute(attrName, '');
    } else {
      element.removeAttribute(attrName);
    }

    return;
  }

  if (name === 'xlinkHref') {
    element.setAttributeNS(XLINK_NS, 'xlink:href', String(value));
    return;
  }

  element.setAttribute(attrName, String(value));
}

function setProperty(element: Element, name: string, value: unknown): void {
  const target = element as unknown as Record<string, unknown>;
  const propertyAliases: Record<string, string> = {
    autoFocus: 'autofocus',
    spellCheck: 'spellcheck',
  };
  const propertyName =
    name === 'className' && element.namespaceURI === SVG_NS
      ? null
      : (propertyAliases[name] ?? name);

  if (!propertyName || !(propertyName in target)) {
    setAttribute(element, name, value);
    return;
  }

  try {
    if (value == null) {
      const current = target[propertyName];
      if (typeof current === 'boolean') {
        target[propertyName] = false;
      } else if (typeof current === 'string') {
        target[propertyName] = '';
      } else {
        target[propertyName] = value;
      }
    } else {
      target[propertyName] = value;
    }
  } catch {
    setAttribute(element, name, value);
  }
}

export function patchProp(element: Element, name: string, previous: unknown, next: unknown): void {
  if (name === 'children' || name === 'key' || name === 'ref') {
    return;
  }

  if (name === 'dangerouslySetInnerHTML') {
    return;
  }

  if (name === 'style') {
    setStyle(element as HTMLElement | SVGElement, previous, next);
    return;
  }

  if (isEventProp(name)) {
    patchEvent(element, name, next);
    return;
  }

  if (name === 'className' || name === 'class') {
    if (next == null || next === false) {
      element.removeAttribute('class');
    } else {
      element.setAttribute('class', String(next));
    }

    return;
  }

  if (PROPERTY_NAMES.has(name)) {
    setProperty(element, name, next);
    return;
  }

  setAttribute(element, name, next);
}

export function patchProps(
  element: Element,
  previous: Record<string, unknown>,
  next: Record<string, unknown>,
): void {
  for (const key of Object.keys(previous)) {
    if (!(key in next)) {
      patchProp(element, key, previous[key], null);
    }
  }

  for (const key of Object.keys(next)) {
    if (isEventProp(key) || !Object.is(previous[key], next[key])) {
      patchProp(element, key, previous[key], next[key]);
    }
  }
}

export function clearElementRuntimeState(element: Element): void {
  clearEvents(element);
}
