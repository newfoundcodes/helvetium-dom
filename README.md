<div align="center">
  <img src="https://github.com/newfoundcodes/newfoundcodes-logo/blob/main/newfoundcodes-helvetium.png?raw=true" width="128" />
  <h1>Helvetium DOM</h1>
  <p>
    <a href="https://github.com/newfoundcodes/helvetium-alps/actions"><img src="https://github.com/newfoundcodes/helvetium-alps/actions/workflows/ci.yml/badge.svg" alt="Build Status"></a>
  </p>
</div>

**Helvetium DOM** is an independent, dependency-free TypeScript virtual DOM runtime for browser user interfaces.

The canonical npm package is:

```text
@newfoundcodes/helvetium-dom
```

Helvetium DOM implements its own VNode model, DOM renderer, reconciler, component runtime, hooks, scheduler, event layer, context, refs, portals, SSR serializer, hydration walker, and JSX/TSX factories. It does not depend on React or another UI framework at runtime.

## Capabilities

- Virtual DOM with text, HTML, SVG, MathML, fragments, components, and portals.
- Keyed sibling reconciliation with DOM identity preservation and multi-node range movement.
- Function components with `memo()` and `forwardRef()`.
- `useState`, `useReducer`, `useEffect`, `useLayoutEffect`, `useMemo`, `useCallback`, `useRef`, `useContext`, and `useId`.
- Context providers with inherited context maps.
- First-party History-API client routing with `Anchor`, route matching, Back/Forward support, dynamic parameters, base paths, router hooks, and SSR navigation markers for Helvetium Boot progressive enhancement.
- Object and callback refs.
- Native DOM event listeners with stable invokers and `Capture`, `Passive`, and `Once` suffixes.
- DOM property/attribute reconciliation, ARIA/data attributes, boolean attributes, and SVG aliases.
- Object/string style support with CSS custom properties and numeric value normalization.
- Microtask scheduling, `batch()`, root flushing, and `flushSync()`.
- `renderToString()` and `renderToStaticMarkup()`.
- Marker-aware hydration with recoverable mismatch handling.
- Root-local deterministic `useId()` generation for matching SSR/hydration traversals.
- First-party JSX/TSX through Helvetium DOM's `h` and `Fragment` factories.
- Optional automatic JSX runtime compatibility entry points.
- Strict TypeScript declarations and explicit package exports.
- 74 standalone usage examples.
- 124 explicit Playwright browser tests, plus Node regression tests.

## Install

```bash
npm install @newfoundcodes/helvetium-dom
```

## Recommended TSX configuration

Helvetium DOM does not require TypeScript's automatic `react-jsx` runtime. The recommended TypeScript setup emits direct calls to Helvetium DOM's own `h()` factory:

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "h",
    "jsxFragmentFactory": "Fragment"
  }
}
```

The `"react"` value is TypeScript's historical name for its configurable classic JSX emitter. It does not add a React dependency when `jsxFactory` is configured as `h`.

```tsx
import { Fragment, h, createRoot, useState } from '@newfoundcodes/helvetium-dom';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1>Helvetium DOM</h1>
      <button onClick={() => setCount((value) => value + 1)}>Count: {count}</button>
    </>
  );
}

const container = document.getElementById('app');
if (!container) throw new Error('Missing #app');

createRoot(container).render(<Counter />);
```

The emitted JavaScript calls `h(...)` and references Helvetium DOM's `Fragment`. It does not need `react/jsx-runtime`.

## Without JSX

JSX is optional. The renderer accepts the same VNodes created directly with `h()`:

```ts
import { createRoot, h } from '@newfoundcodes/helvetium-dom';

const root = createRoot(document.getElementById('app')!);
root.render(
  h('main', null, h('h1', null, 'Helvetium DOM'), h('p', null, 'No JSX transform is required.')),
);
```

## Package entry points

| Import                                         | Purpose                                    |
| ---------------------------------------------- | ------------------------------------------ |
| `@newfoundcodes/helvetium-dom`                 | Main browser/public API and public types   |
| `@newfoundcodes/helvetium-dom/server`          | SSR-focused entry point                    |
| `@newfoundcodes/helvetium-dom/router`          | Explicit client-router entry point         |
| `@newfoundcodes/helvetium-dom/jsx-runtime`     | Optional automatic JSX production runtime  |
| `@newfoundcodes/helvetium-dom/jsx-dev-runtime` | Optional automatic JSX development runtime |
| `@newfoundcodes/helvetium-dom/package.json`    | Package metadata                           |

The `package.json#exports` map is authoritative. Deep imports into internal runtime files are unsupported application API even though source files are shipped for transparency.

## Public API groups

### VNodes

`h`, `Fragment`, `fragment`, `createVNode`, `createTextVNode`, `createPortal`, `normalizeVNode`, `normalizeChildren`, `isVNode`.

### Rendering

`createRoot`, `hydrateRoot`.

### Components

`memo`, `forwardRef`.

### Hooks

`useState`, `useReducer`, `useEffect`, `useLayoutEffect`, `useMemo`, `useCallback`, `useRef`, `useContext`, `useId`.

### Context and refs

`createContext`, `createRef`.

### Routing

`Anchor`, `createBrowserRouter`, `RouterProvider`, `RouterOutlet`, `useRouter`, `useLocation`, `useRouteMatch`, `useParams`, `useNavigate`.

### Scheduling

`batch`, `flushSync`.

### Server rendering

`renderToString`, `renderToStaticMarkup`.

## Client-side routing with `Anchor`

Helvetium DOM includes its own client router. `Anchor` renders a real `<a href>` but intercepts eligible same-origin clicks so the browser does not load a new document. The router updates `history`, rematches the URL, and renders the new page component through the normal Helvetium DOM reconciler.

```tsx
import {
  Anchor,
  Fragment,
  RouterProvider,
  createBrowserRouter,
  createRoot,
  h,
} from '@newfoundcodes/helvetium-dom';

function Home() {
  return (
    <main>
      <h1>Home</h1>
      <Anchor to="/about">About</Anchor>
    </main>
  );
}

function About() {
  return (
    <main>
      <h1>About</h1>
      <Anchor to="/">Home</Anchor>
    </main>
  );
}

const router = createBrowserRouter([
  { path: '/', component: Home },
  { path: '/about', component: About },
]);

createRoot(document.getElementById('app')!).render(<RouterProvider router={router} />);
```

`Anchor` preserves native browser behavior for external URLs, downloads, non-`_self` targets, modifier-key clicks, and `reloadDocument`. Back/Forward are handled with `popstate`. Route patterns support static segments, `:params`, optional `:params?`, and final splats.

## Architecture summary

Every mounted VNode owns an inclusive DOM range:

- text: one `Text` node;
- element: one `Element`;
- fragment: `<!--v:f--> ... <!--/v:f-->`;
- function component: `<!--v:c--> ... <!--/v:c-->`;
- portal: source markers plus a separately owned target-marker range.

This range invariant is central to keyed reconciliation. A keyed component or fragment can render several adjacent DOM nodes and still move as one logical sibling.

Child reconciliation builds an old-key lookup, matches keyed nodes by key and VNode kind, matches compatible unkeyed children positionally, patches from right to left, moves complete DOM ranges before final anchors, and unmounts unmatched old children.

Function components own ordered hook slots. Successful renders must preserve hook order and hook count. State updates mark component instances dirty and enqueue them on their root. Root flushes process dirty components parent-before-child by depth and then commit layout/passive effects.

## Server rendering and hydration

```ts
import { h } from '@newfoundcodes/helvetium-dom';
import { renderToString } from '@newfoundcodes/helvetium-dom/server';

function App() {
  return <main>Server rendered</main>;
}

const html = renderToString(<App />, {
  identifierPrefix: 'request-42-',
});
```

Hydrate with the same logical initial tree and the same `identifierPrefix` when `useId()` participates in the tree:

```tsx
import { h, hydrateRoot } from '@newfoundcodes/helvetium-dom';

hydrateRoot(document.getElementById('app')!, <App />, {
  identifierPrefix: 'request-42-',
  onRecoverableError(error) {
    console.warn(error);
  },
});
```

`renderToString()` emits fragment/component markers required for range-aware hydration. `renderToStaticMarkup()` omits those markers and is intended for output that will not hydrate.

## Security boundary

Normal client text is created as DOM text nodes. SSR text and attribute values are escaped. Event source strings are never evaluated.

`dangerouslySetInnerHTML` is deliberately different: its `__html` value is treated as trusted raw HTML and is not sanitized. Helvetium DOM also does not impose application-specific URL protocol policy on `href`, `src`, and similar attributes. Sanitize or validate untrusted content before it reaches these sinks.

## Examples

`examples/` contains 74 standalone examples grouped by purpose:

- basic rendering;
- components;
- hooks;
- reconciliation;
- forms;
- platform integration;
- application patterns;
- SSR/hydration;
- advanced scheduling and low-level APIs;
- client routing and `Anchor`.

Type-check all examples:

```bash
npm run examples:typecheck
```

## Playwright browser tests

`tests/playwright/` contains 124 explicit tests. The suite exercises the compiled `dist/` modules in a real browser through a repository-local static server.

```bash
npm run test:playwright
```

Chromium only:

```bash
npm run test:playwright:chromium
```

The Playwright configuration defines Chromium, Firefox, and WebKit projects. It keeps traces on the first retry and failure artifacts for browser diagnostics. Tests use resilient Playwright locators such as `getByTestId()` where an element identifier would otherwise require CSS escaping.

## Node regression tests

The existing deterministic Node suite remains for fast core checks:

```bash
npm run test:node
```

It validates TSX factory emission, basic rendering/patching, keyed identity, fragments/refs, state/batching, effects, context, portals, once-listener rearming, client route matching/history/`Anchor`, SSR escaping/markers, hydration identity, and deterministic `useId()` behavior. The TSX emission fixture is compiled through its own temporary TypeScript project, so the regression test works with both TypeScript 5.x and TypeScript 6.x project-discovery rules.

## Development commands

```bash
npm run build
npm run typecheck
npm run examples:typecheck
npm run test:node
npm run test:playwright
npm pack --dry-run
```

## Browser policy

Helvetium DOM targets current evergreen browsers and relies on modern ES modules, `Map`, `Set`, `Symbol`, `Object.is`, `queueMicrotask`, standard DOM mutation methods, namespace-aware element creation, and modern `addEventListener` options.

The repository Playwright matrix is Chromium, Firefox, and WebKit. A consuming application that needs older browsers owns its transpilation and polyfill policy.

## Repository layout

```text
src/                 Runtime TypeScript implementation
type/                TypeScript declaration contracts
dist/                Emitted ESM, declarations, and source maps
examples/            74 TSX examples
tests/               Node and Playwright tests
benchmarks/          Runtime benchmark sources
playwright.config.ts Browser test configuration
```

## License

This project is licensed under the [AGPL-3.0-only](https://spdx.org/licenses/AGPL-3.0-only.html) License.
