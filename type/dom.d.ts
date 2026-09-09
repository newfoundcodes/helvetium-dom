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

import type { Key, Ref, VNodeChild } from './core.js';

export type StyleValue = string | number | null | undefined;

export type CSSProperties = {
  [K in keyof CSSStyleDeclaration]?: CSSStyleDeclaration[K] extends string ? StyleValue : never;
} & {
  [K in `--${string}`]?: StyleValue;
};

export type EventHandler<E extends Event = Event> = (event: E) => void;

export interface DOMAttributes {
  onClick?: EventHandler<MouseEvent>;
  onClickCapture?: EventHandler<MouseEvent>;
  onDblClick?: EventHandler<MouseEvent>;
  onInput?: EventHandler<InputEvent>;
  onChange?: EventHandler<Event>;
  onSubmit?: EventHandler<SubmitEvent>;
  onFocus?: EventHandler<FocusEvent>;
  onBlur?: EventHandler<FocusEvent>;
  onKeyDown?: EventHandler<KeyboardEvent>;
  onKeyUp?: EventHandler<KeyboardEvent>;
  onPointerDown?: EventHandler<PointerEvent>;
  onPointerUp?: EventHandler<PointerEvent>;
  onPointerMove?: EventHandler<PointerEvent>;
  onMouseDown?: EventHandler<MouseEvent>;
  onMouseUp?: EventHandler<MouseEvent>;
  onMouseMove?: EventHandler<MouseEvent>;
  onTouchStart?: EventHandler<TouchEvent>;
  onTouchMove?: EventHandler<TouchEvent>;
  onTouchEnd?: EventHandler<TouchEvent>;
  onWheel?: EventHandler<WheelEvent>;
  onScroll?: EventHandler<Event>;
  onContextMenu?: EventHandler<MouseEvent>;
  onDragStart?: EventHandler<DragEvent>;
  onDragEnd?: EventHandler<DragEvent>;
  onDrop?: EventHandler<DragEvent>;

  [name: `on${string}`]: EventHandler<never> | undefined;
}

export interface HTMLAttributes<T extends Element = HTMLElement> extends DOMAttributes {
  key?: Key;
  ref?: Ref<T>;
  id?: string;
  class?: string;
  className?: string;
  style?: CSSProperties | string;
  title?: string;
  charSet?: string;
  content?: string;
  httpEquiv?: string;
  media?: string;
  nonce?: string;
  integrity?: string;
  crossOrigin?: string;
  referrerPolicy?: string;
  async?: boolean;
  defer?: boolean;
  role?: string;
  tabIndex?: number;
  hidden?: boolean;
  disabled?: boolean;
  checked?: boolean;
  selected?: boolean;
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
  name?: string;
  type?: string;
  href?: string;
  target?: string;
  rel?: string;
  src?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  htmlFor?: string;
  placeholder?: string;
  accept?: string;
  action?: string;
  autoComplete?: string;
  capture?: boolean | string;
  colSpan?: number;
  rowSpan?: number;
  download?: boolean | string;
  encType?: string;
  form?: string;
  formAction?: string;
  formEncType?: string;
  formMethod?: string;
  formNoValidate?: boolean;
  formTarget?: string;
  max?: number | string;
  maxLength?: number;
  method?: string;
  min?: number | string;
  minLength?: number;
  pattern?: string;
  step?: number | string;
  rows?: number;
  cols?: number;
  wrap?: string;
  srcSet?: string;
  sizes?: string;
  loading?: 'eager' | 'lazy';
  decoding?: 'sync' | 'async' | 'auto';
  poster?: string;
  preload?: string;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  autoPlay?: boolean;
  open?: boolean;
  dateTime?: string;
  cite?: string;
  lang?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  slot?: string;
  multiple?: boolean;
  required?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  contentEditable?: boolean | 'true' | 'false';
  spellCheck?: boolean;
  draggable?: boolean;
  dangerouslySetInnerHTML?: { __html: string };
  children?: VNodeChild;

  [name: `data-${string}`]: unknown;
  [name: `aria-${string}`]: string | number | boolean | null | undefined;
}

export interface SVGAttributes<T extends Element = SVGElement> extends DOMAttributes {
  key?: Key;
  ref?: Ref<T>;
  id?: string;
  class?: string;
  className?: string;
  style?: CSSProperties | string;
  role?: string;
  tabIndex?: number;
  children?: VNodeChild;
  viewBox?: string;
  preserveAspectRatio?: string;
  xmlns?: string;
  xlinkHref?: string;
  xmlnsXlink?: string;
  href?: string;
  width?: number | string;
  height?: number | string;
  x?: number | string;
  y?: number | string;
  x1?: number | string;
  y1?: number | string;
  x2?: number | string;
  y2?: number | string;
  cx?: number | string;
  cy?: number | string;
  r?: number | string;
  rx?: number | string;
  ry?: number | string;
  d?: string;
  points?: string;
  pathLength?: number | string;
  fill?: string;
  fillRule?: 'nonzero' | 'evenodd' | 'inherit' | string;
  fillOpacity?: number | string;
  stroke?: string;
  strokeWidth?: number | string;
  strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit' | string;
  strokeMiterlimit?: number | string;
  strokeLinejoin?: 'miter' | 'round' | 'bevel' | 'inherit' | string;
  strokeDasharray?: number | string;
  strokeDashoffset?: number | string;
  strokeOpacity?: number | string;
  opacity?: number | string;
  transform?: string;
  vectorEffect?: string;
  markerStart?: string;
  markerMid?: string;
  markerEnd?: string;
  clipPath?: string;
  mask?: string;
  filter?: string;
  dominantBaseline?: string;
  textAnchor?: string;
  fontFamily?: string;
  fontSize?: number | string;
  fontWeight?: number | string;
  gradientUnits?: string;
  gradientTransform?: string;
  spreadMethod?: string;
  offset?: number | string;
  stopColor?: string;
  stopOpacity?: number | string;
  patternUnits?: string;
  patternContentUnits?: string;
  patternTransform?: string;
  clipPathUnits?: string;
  maskUnits?: string;
  maskContentUnits?: string;
  filterUnits?: string;
  primitiveUnits?: string;
  colorInterpolationFilters?: string;
  floodColor?: string;
  floodOpacity?: number | string;
  dangerouslySetInnerHTML?: { __html: string };

  [name: `data-${string}`]: unknown;
  [name: `aria-${string}`]: string | number | boolean | null | undefined;
}
