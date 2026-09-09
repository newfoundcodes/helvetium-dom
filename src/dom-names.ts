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

export const HTML_NS = 'http://www.w3.org/1999/xhtml';
export const SVG_NS = 'http://www.w3.org/2000/svg';
export const MATH_NS = 'http://www.w3.org/1998/Math/MathML';
export const XLINK_NS = 'http://www.w3.org/1999/xlink';

const ATTRIBUTE_ALIASES: Record<string, string> = {
  className: 'class',
  htmlFor: 'for',
  httpEquiv: 'http-equiv',
  charSet: 'charset',
  referrerPolicy: 'referrerpolicy',
  acceptCharset: 'accept-charset',
  crossOrigin: 'crossorigin',
  autoFocus: 'autofocus',
  readOnly: 'readonly',
  spellCheck: 'spellcheck',
  xlinkHref: 'xlink:href',
  xmlnsXlink: 'xmlns:xlink',
  fillRule: 'fill-rule',
  fillOpacity: 'fill-opacity',
  strokeWidth: 'stroke-width',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeMiterlimit: 'stroke-miterlimit',
  strokeDasharray: 'stroke-dasharray',
  strokeDashoffset: 'stroke-dashoffset',
  strokeOpacity: 'stroke-opacity',
  vectorEffect: 'vector-effect',
  markerStart: 'marker-start',
  markerMid: 'marker-mid',
  markerEnd: 'marker-end',
  clipPath: 'clip-path',
  dominantBaseline: 'dominant-baseline',
  textAnchor: 'text-anchor',
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  stopColor: 'stop-color',
  stopOpacity: 'stop-opacity',
  floodColor: 'flood-color',
  floodOpacity: 'flood-opacity',
  colorInterpolationFilters: 'color-interpolation-filters',
};

export const BOOLEAN_ATTRIBUTES = new Set([
  'allowfullscreen',
  'async',
  'autofocus',
  'autoplay',
  'checked',
  'controls',
  'default',
  'defer',
  'disabled',
  'formnovalidate',
  'hidden',
  'inert',
  'ismap',
  'itemscope',
  'loop',
  'multiple',
  'muted',
  'nomodule',
  'novalidate',
  'open',
  'playsinline',
  'readonly',
  'required',
  'reversed',
  'selected',
]);

export function attributeNameForProp(name: string): string {
  return ATTRIBUTE_ALIASES[name] ?? name;
}

export function isAriaOrDataAttribute(name: string): boolean {
  return name.startsWith('aria-') || name.startsWith('data-');
}

export function expectedNamespace(parent: Node, tag: string): string {
  const parentElement = parent instanceof Element ? parent : null;
  const parentNs = parentElement?.namespaceURI ?? HTML_NS;
  const htmlIntegrationPoint =
    parentElement?.namespaceURI === SVG_NS && parentElement.localName === 'foreignObject';

  if (tag === 'svg' || (parentNs === SVG_NS && !htmlIntegrationPoint)) {
    return SVG_NS;
  }

  if (tag === 'math' || parentNs === MATH_NS) {
    return MATH_NS;
  }

  return HTML_NS;
}
