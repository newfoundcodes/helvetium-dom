# Helvetium DOM examples

This directory contains **74** standalone TypeScript/TSX usage examples. Every TSX example uses Helvetium DOM's `h`/`Fragment` factory path and the canonical package `@newfoundcodes/helvetium-dom`.

Run `npm run examples:typecheck` to compile-check all examples.

## Basic

- `examples/basic/01-hello-world.tsx` - Render a minimal element tree.
- `examples/basic/02-nested-elements.tsx` - Compose nested semantic HTML.
- `examples/basic/03-attributes.tsx` - Set common attributes and data attributes.
- `examples/basic/04-class-and-style.tsx` - Use className and typed style objects.
- `examples/basic/05-conditional-rendering.tsx` - Use booleans and null as empty children.
- `examples/basic/06-array-children.tsx` - Render arrays of VNode children.
- `examples/basic/07-fragments.tsx` - Render sibling nodes without an extra element.
- `examples/basic/08-text-normalization.tsx` - Mix text, numbers, bigint, arrays, and empty children.

## Components

- `examples/components/09-function-component.tsx` - Create a typed function component.
- `examples/components/10-component-children.tsx` - Accept and render component children.
- `examples/components/11-component-composition.tsx` - Compose small components into a page shell.
- `examples/components/12-memo-component.tsx` - Skip a redundant component render with memo().
- `examples/components/13-custom-memo-comparator.tsx` - Use a custom memo comparator.
- `examples/components/14-forward-ref.tsx` - Forward a VNode ref through a component.
- `examples/components/15-context-provider.tsx` - Provide and consume a context value.
- `examples/components/16-recursive-component.tsx` - Render a recursive tree component.

## Hooks

- `examples/hooks/17-use-state-counter.tsx` - Manage local state with useState().
- `examples/hooks/18-lazy-state.tsx` - Initialize expensive state lazily.
- `examples/hooks/19-use-reducer.tsx` - Model explicit state transitions with useReducer().
- `examples/hooks/20-use-effect.tsx` - Run a passive effect and cleanup.
- `examples/hooks/21-use-layout-effect.tsx` - Measure committed DOM in a layout effect.
- `examples/hooks/22-use-memo.tsx` - Memoize a derived value.
- `examples/hooks/23-use-callback.tsx` - Keep a callback identity stable.
- `examples/hooks/24-use-ref.tsx` - Keep mutable state without scheduling a render.
- `examples/hooks/25-use-id.tsx` - Create deterministic root-local IDs.
- `examples/hooks/26-use-context.tsx` - Read the nearest context value.

## Reconciliation

- `examples/reconciliation/27-keyed-reorder.tsx` - Preserve keyed DOM identity while reordering.
- `examples/reconciliation/28-keyed-insert-delete.tsx` - Insert and remove keyed siblings.
- `examples/reconciliation/29-keyed-components.tsx` - Move multi-node component ranges by key.
- `examples/reconciliation/30-unkeyed-positional.tsx` - Show positional identity for unkeyed siblings.
- `examples/reconciliation/31-replace-node-type.tsx` - Replace a node when its VNode kind changes.
- `examples/reconciliation/32-nested-fragment-patching.tsx` - Patch nested fragment ranges.

## Forms

- `examples/forms/33-controlled-input.tsx` - Control a text input with state.
- `examples/forms/34-checkbox.tsx` - Control a checkbox.
- `examples/forms/35-select.tsx` - Control a select element.
- `examples/forms/36-form-submit.tsx` - Handle a native submit event.
- `examples/forms/37-inline-validation.tsx` - Render validation feedback from state.
- `examples/forms/38-todo-form.tsx` - Build a small controlled todo workflow.

## Platform

- `examples/platform/39-svg.tsx` - Create namespaced SVG content.
- `examples/platform/40-svg-foreign-object.tsx` - Return to HTML namespace inside SVG foreignObject.
- `examples/platform/41-mathml.tsx` - Create MathML with h() and namespace propagation.
- `examples/platform/42-portal-modal.tsx` - Render a modal into a separate DOM target.
- `examples/platform/43-custom-element.tsx` - Render a hyphenated custom element.
- `examples/platform/44-data-aria.tsx` - Use data-* and ARIA attributes.
- `examples/platform/45-document-fragment-root.tsx` - Render into a DocumentFragment.

## Patterns

- `examples/patterns/46-tabs.tsx` - Build keyboard-neutral tab state.
- `examples/patterns/47-accordion.tsx` - Build an accessible disclosure pattern.
- `examples/patterns/48-search-filter.tsx` - Filter a keyed list from controlled input.
- `examples/patterns/49-pagination.tsx` - Render a simple page selector.
- `examples/patterns/50-theme-context.tsx` - Propagate a theme through context.
- `examples/patterns/51-toast-portal.tsx` - Render ephemeral notifications into a portal host.
- `examples/patterns/52-master-detail.tsx` - Use selected keyed data to render detail state.

## Ssr

- `examples/ssr/53-render-to-string.tsx` - Serialize hydratable markup on the server.
- `examples/ssr/54-static-markup.tsx` - Serialize static markup without hydration markers.
- `examples/ssr/55-ssr-use-id.tsx` - Keep useId deterministic with an identifier prefix.
- `examples/ssr/56-hydrate-root.tsx` - Hydrate matching server markup.
- `examples/ssr/57-ssr-escaping.tsx` - Demonstrate escaped text and attributes.
- `examples/ssr/58-static-email-fragment.tsx` - Generate a small static HTML fragment.

## Advanced

- `examples/advanced/59-batch-updates.tsx` - Group several state updates into one scheduled flush.
- `examples/advanced/60-flush-sync.tsx` - Commit state before the next statement.
- `examples/advanced/61-root-flush.tsx` - Manually flush a root after a state update.
- `examples/advanced/62-root-unmount.tsx` - Unmount a tree and release refs/effects.
- `examples/advanced/63-error-handlers.tsx` - Receive fatal and recoverable runtime errors.
- `examples/advanced/64-dangerous-html.tsx` - Use the explicit raw-HTML escape hatch with trusted content.
- `examples/advanced/65-event-options.tsx` - Use capture, passive, and once event suffixes.
- `examples/advanced/66-vnode-primitives.tsx` - Use the low-level VNode construction helpers.
- `examples/advanced/67-callback-ref.tsx` - Use callback refs for mount and unmount notifications.
- `examples/advanced/68-custom-css-property.tsx` - Update CSS custom properties through style objects.

## Routing

- `examples/routing/69-anchor-navigation.tsx` - Navigate between route components with `Anchor` and no document reload.
- `examples/routing/70-layout-and-outlet.tsx` - Keep a persistent application shell around `RouterOutlet`.
- `examples/routing/71-dynamic-params.tsx` - Read dynamic `:id` segments with `useParams()`.
- `examples/routing/72-programmatic-navigation.tsx` - Navigate after an application action with `useNavigate()`.
- `examples/routing/73-location-and-history-state.tsx` - Read query strings and `history.state` through `useLocation()`.
- `examples/routing/74-base-path-and-not-found.tsx` - Mount an SPA under a base path and render a not-found component.
