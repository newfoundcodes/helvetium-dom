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

import type { CSSProperties, StyleValue } from '../type/dom.js';

const UNITLESS_CSS = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexNegative',
  'flexOrder',
  'flexPositive',
  'flexShrink',
  'fontWeight',
  'gridArea',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'scale',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
  'fillOpacity',
  'floodOpacity',
  'stopOpacity',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
]);

export function normalizeStyleName(name: string): string {
  if (name.startsWith('--')) {
    return name;
  }

  if (name.startsWith('ms')) {
    return `-${name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
  }

  return name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export function normalizeStyleValue(name: string, value: StyleValue): string {
  if (value == null) {
    return '';
  }

  if (
    typeof value === 'number' &&
    value !== 0 &&
    !name.startsWith('--') &&
    !UNITLESS_CSS.has(name)
  ) {
    return `${value}px`;
  }

  return String(value);
}

export function styleObjectToString(style: CSSProperties): string {
  const parts: string[] = [];
  for (const [name, value] of Object.entries(style)) {
    if (value == null || value === '') {
      continue;
    }

    parts.push(`${normalizeStyleName(name)}:${normalizeStyleValue(name, value as StyleValue)}`);
  }

  return parts.join(';');
}
