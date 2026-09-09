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

import type { EventHandler } from '../type/dom.js';
import type { ElementWithEvents, EventInvoker, ParsedEventName } from '../type/events.js';

const EVENT_STORE = Symbol('helvetium.events');

function parseEventProp(propName: string): ParsedEventName | null {
  if (!propName.startsWith('on') || propName.length <= 2) {
    return null;
  }

  let raw = propName.slice(2);
  const options: AddEventListenerOptions = {};

  let changed = true;
  while (changed) {
    changed = false;

    if (raw.endsWith('Capture')) {
      options.capture = true;
      raw = raw.slice(0, -7);
      changed = true;
    }

    if (raw.endsWith('Passive')) {
      options.passive = true;
      raw = raw.slice(0, -7);
      changed = true;
    }

    if (raw.endsWith('Once')) {
      options.once = true;
      raw = raw.slice(0, -4);
      changed = true;
    }
  }

  if (!raw) {
    return null;
  }

  const name =
    raw === 'DoubleClick' || raw === 'DblClick'
      ? 'dblclick'
      : raw.replace(/^[A-Z]/, (value) => value.toLowerCase()).toLowerCase();
  return { name, options };
}

function eventKey(name: string, options: AddEventListenerOptions | boolean): string {
  if (typeof options === 'boolean') {
    return `${name}:${options ? '1' : '0'}:0:0`;
  }

  return `${name}:${options.capture ? '1' : '0'}:${options.passive ? '1' : '0'}:${options.once ? '1' : '0'}`;
}

export function isEventProp(name: string): boolean {
  return name.startsWith('on') && name.length > 2;
}

export function patchEvent(element: Element, propName: string, nextValue: unknown): void {
  const parsed = parseEventProp(propName);
  if (!parsed) {
    return;
  }

  const holder = element as ElementWithEvents;
  const store = holder[EVENT_STORE] ?? (holder[EVENT_STORE] = new Map());
  const key = eventKey(parsed.name, parsed.options);
  const existing = store.get(key);

  if (typeof nextValue === 'function') {
    const handler = nextValue as EventHandler;
    if (existing) {
      existing.invoker.value = handler;
      return;
    }

    const invoker = ((event: Event) => {
      if (typeof parsed.options !== 'boolean' && parsed.options.once) {
        store.delete(key);
      }

      invoker.value(event);
    }) as EventInvoker;

    invoker.value = handler;
    element.addEventListener(parsed.name, invoker, parsed.options);

    store.set(key, { invoker, options: parsed.options });
    return;
  }

  if (existing) {
    element.removeEventListener(parsed.name, existing.invoker, existing.options);
    store.delete(key);
  }
}

export function clearEvents(element: Element): void {
  const holder = element as ElementWithEvents;
  const store = holder[EVENT_STORE];

  if (!store) {
    return;
  }

  for (const [key, entry] of store) {
    const name = key.slice(0, key.indexOf(':'));
    element.removeEventListener(name, entry.invoker, entry.options);
  }

  store.clear();
}
