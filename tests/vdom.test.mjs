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

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { installMiniDOM } from './mini-dom.mjs';

const document = installMiniDOM();

const {
  Fragment,
  batch,
  createContext,
  createPortal,
  createRef,
  createRoot,
  h,
  hydrateRoot,
  renderToString,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useId,
} = await import('../dist/index.js');

afterEach(() => {
  document.body.replaceChildren();
});

function spy() {
  const fn = (...args) => {
    fn.calls.push(args);
  };

  fn.calls = [];
  return fn;
}

describe('DOM renderer', () => {
  it('renders and patches elements, attributes, styles, and events', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = createRoot(container);
    const first = spy();
    const second = spy();

    root.render(
      h(
        'button',
        { id: 'save', className: 'primary', style: { display: 'block' }, onClick: first },
        'Save',
      ),
    );

    const button = container.querySelector('button');
    assert.ok(button);
    assert.equal(button.id, 'save');
    assert.equal(button.className, 'primary');
    assert.equal(button.style.display, 'block');

    button.dispatchEvent(new Event('click'));
    assert.equal(first.calls.length, 1);

    root.render(h('button', { id: 'save-2', onClick: second }, 'Saved'));
    assert.equal(container.querySelector('button'), button);
    assert.equal(button.textContent, 'Saved');
    assert.equal(button.hasAttribute('class'), false);
    assert.equal(button.style.display, '');

    button.dispatchEvent(new Event('click'));
    assert.equal(first.calls.length, 1);
    assert.equal(second.calls.length, 1);
  });

  it('preserves keyed DOM identity while reordering', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const list = (values) =>
      h('ul', null, ...values.map((value) => h('li', { key: value }, String(value))));

    root.render(list([1, 2, 3]));

    const original = [...container.querySelectorAll('li')];
    root.render(list([3, 1, 2]));

    const reordered = [...container.querySelectorAll('li')];
    assert.deepEqual(
      reordered.map((item) => item.textContent),
      ['3', '1', '2'],
    );

    assert.equal(reordered[0], original[2]);
    assert.equal(reordered[1], original[0]);
    assert.equal(reordered[2], original[1]);
  });

  it('supports fragments and refs', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const ref = createRef();

    root.render(h(Fragment, null, h('span', { ref }, 'A'), h('span', null, 'B')));
    assert.equal(container.textContent, 'AB');
    assert.equal(ref.current?.textContent, 'A');

    root.unmount();
    assert.equal(ref.current, null);
  });

  it('supports component state and batched updates', () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    let setCount;
    let renders = 0;

    function Counter() {
      const [count, set] = useState(0);

      setCount = set;
      renders++;
      return h('output', null, count);
    }

    root.render(h(Counter, null));
    assert.equal(container.textContent, '0');

    batch(() => {
      setCount((n) => n + 1);
      setCount((n) => n + 1);
    });

    root.flush();
    assert.equal(container.textContent, '2');
    assert.equal(renders, 2);
  });

  it('runs layout/passive effects and cleanup', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const calls = [];

    function App() {
      useLayoutEffect(() => {
        calls.push('layout');
        return () => calls.push('layout-clean');
      }, []);

      useEffect(() => {
        calls.push('effect');
        return () => calls.push('effect-clean');
      }, []);
      return h('div', null, 'x');
    }

    root.render(h(App, null));
    assert.deepEqual(calls, ['layout']);
    await Promise.resolve();

    assert.deepEqual(calls, ['layout', 'effect']);
    root.unmount();

    assert.ok(calls.includes('layout-clean'));
    assert.ok(calls.includes('effect-clean'));
  });

  it('propagates context values', () => {
    const Theme = createContext('light');
    const container = document.createElement('div');
    const root = createRoot(container);

    function Label() {
      return h('span', null, useContext(Theme));
    }

    root.render(h(Theme.Provider, { value: 'dark' }, h(Label, null)));
    assert.equal(container.textContent, 'dark');

    root.render(h(Theme.Provider, { value: 'blue' }, h(Label, null)));
    assert.equal(container.textContent, 'blue');
  });

  it('renders portals and removes them on unmount', () => {
    const container = document.createElement('div');
    const target = document.createElement('aside');
    document.body.append(container, target);

    const root = createRoot(container);
    root.render(h('main', null, 'base', createPortal(h('strong', null, 'portal'), target)));

    assert.equal(container.textContent, 'base');
    assert.equal(target.textContent, 'portal');

    root.unmount();
    assert.equal(target.textContent, '');
  });

  it('re-arms once listeners on a subsequent render', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const handler = spy();
    const tree = () => h('button', { onClickOnce: handler }, 'Run');

    root.render(tree());

    const button = container.querySelector('button');
    button.dispatchEvent(new Event('click'));
    button.dispatchEvent(new Event('click'));

    assert.equal(handler.calls.length, 1);
    root.render(tree());

    button.dispatchEvent(new Event('click'));
    assert.equal(handler.calls.length, 2);
  });
});

describe('SSR and hydration', () => {
  it('serializes safe text and component markers', () => {
    function App() {
      return h('p', { className: 'x' }, '<hello>');
    }

    const html = renderToString(h(App, null));
    assert.match(html, /<!--v:c-->/);
    assert.match(html, /&lt;hello&gt;/);
    assert.match(html, /class="x"/);
  });

  it('serializes document metadata attribute aliases', () => {
    const html = renderToString(
      h(
        'head',
        null,
        h('meta', { charSet: 'utf-8' }),
        h('meta', { httpEquiv: 'x-ua-compatible', content: 'ie=edge' }),
        h('meta', { name: 'referrer', content: 'no-referrer', referrerPolicy: 'no-referrer' }),
      ),
    );

    assert.match(html, /<meta charset="utf-8">/);
    assert.match(html, /http-equiv="x-ua-compatible"/);
    assert.match(html, /content="ie=edge"/);
    assert.match(html, /referrerpolicy="no-referrer"/);
  });

  it('hydrates existing DOM and keeps element identity', () => {
    const container = document.createElement('div');
    const existing = document.createElement('section');
    existing.setAttribute('id', 'a');

    const span = document.createElement('span');
    span.appendChild(document.createTextNode('Hello'));

    existing.appendChild(span);
    container.appendChild(existing);

    const tree = h('section', { id: 'a' }, h('span', null, 'Hello'));
    const root = hydrateRoot(container, tree);
    assert.equal(container.querySelector('section'), existing);

    root.render(h('section', { id: 'b' }, h('span', null, 'World')));
    assert.equal(container.querySelector('section'), existing);
    assert.equal(existing.id, 'b');
    assert.equal(existing.textContent, 'World');
  });

  it('keeps useId deterministic per SSR root', () => {
    function IdView() {
      const id = useId();
      return h('div', { id }, id);
    }

    const first = renderToString(h(IdView, null), { identifierPrefix: 'srv-' });
    const second = renderToString(h(IdView, null), { identifierPrefix: 'srv-' });

    assert.equal(first, second);
    assert.match(first, /srv-/);
  });
});
