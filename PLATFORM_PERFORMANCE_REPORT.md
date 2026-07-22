# Platform Performance Report

Date: 2026-07-21  
Scope: BarberSaaS Platform (`/platform`)  
Guardrails: no visual redesign, route changes, business-logic changes, database changes, or Supabase contract changes.

## Measurement method

- Production bundles were generated with `npm run build` before and after the optimization.
- Bundle figures are Vite's minified production output. Sizes are decimal kB.
- Rendering, effects, cleanup, keyboard behavior, responsive overflow, and reduced-motion behavior were audited statically in the Platform source.
- No Lighthouse score, Web Vitals percentile, or browser heap number is reported because this repository does not include a repeatable authenticated browser-performance harness. Those values were not fabricated.

## Bundle result

| Critical asset | Before | After | Change |
| --- | ---: | ---: | ---: |
| Initial JavaScript | 707.95 kB | 624.58 kB | -83.37 kB (-11.8%) |
| Initial CSS | 120.55 kB | 31.23 kB | -89.32 kB (-74.1%) |

The 109.19 kB Platform stylesheet is now deferred until a Platform route is entered. It was moved out of login, public booking, and tenant-dashboard startup without changing its rules.

Platform JavaScript is now split into route and interaction chunks:

| Deferred chunk | Minified size | Loaded when |
| --- | ---: | --- |
| Platform layout and command palette | 18.08 kB | Entering Platform |
| Mission Control | 13.04 kB | Opening Mission Control |
| Barber shop detail | 25.88 kB | Opening a shop |
| Barber shop directory | 6.96 kB | Opening the directory |
| Barber shop form | 5.54 kB | Creating or editing a shop |
| Create-user form | 5.41 kB | Opening the create-user panel |
| Strands/WebGL | 49.75 kB | Browser idle time on Mission Control |

The main application chunk still exceeds Vite's 500 kB advisory threshold. The remaining weight is shared and tenant-facing application code outside this Platform-only optimization; changing that code would exceed the stated guardrails.

## Rendering changes

- Platform routes now use route-level lazy loading, so unvisited pages are not parsed or evaluated up front.
- The create-user form is isolated in its own lazy component. Typing into its six fields no longer rerenders the full shop-detail page, user table, services, portal, and configuration sections.
- Shop-directory rows and shop-detail user rows are memoized. Opening confirmation UI or updating one record no longer rerenders every unchanged row.
- Command Palette and toast surfaces are memoized behind stable callbacks and message objects.
- Mission metrics and the Strands host are memoized.
- Animated counters update their text node during animation instead of issuing a React state update on every animation frame. The accessible final value remains exposed through `aria-label`.

## Animation and visual-component changes

- Strands remains visually identical but its module and WebGL dependency are requested during browser idle time rather than competing with the initial content render.
- Strands already pauses outside the viewport and while the document is hidden; cleanup cancels its frame, disconnects observers, removes the canvas, and releases the WebGL context.
- Repeated Strands resize notifications no longer resize the renderer or reallocate its drawing buffer when dimensions have not changed.
- LineSidebar pointer calculations are limited to one update per animation frame instead of running for every raw pointer event.
- LineSidebar compositor hints are enabled only during pointer/focus interaction instead of permanently promoting every link.
- Animated counters, LineSidebar, Strands, and CSS transitions share or respect the user's reduced-motion preference.

## Network and memory changes

- Opening Command Palette now performs only the real barber-shop list request. The potentially expensive per-tenant user index is deferred until the user searches or enters the Users scope; concurrency remains capped at four requests.
- Pending async Platform requests are guarded on unmount, preventing late responses from retaining or attempting to update abandoned view state.
- Reduced-motion consumers share one native media-query listener per active application instead of registering one listener per animated counter and visual component.
- All reviewed timers, animation frames, document/window listeners, observers, and WebGL resources have paired cleanup paths.

## Accessibility and responsive changes

- Added a keyboard-visible skip link to the Platform main content.
- Lazy route fallbacks expose an accessible live loading status.
- Confirmation dialogs expose their busy state.
- Wide Platform directory tables use a labeled, keyboard-focusable horizontal scroll region with contained overscroll.
- Icon-only directory actions are hidden from the accessibility tree while their explicit accessible labels remain.
- Dynamic viewport units are used when supported, preventing mobile browser chrome from producing incorrect shell/sidebar heights.
- Existing Command Palette dialog, focus trap, listbox semantics, keyboard navigation, and Escape behavior remain intact.

## Validation

- `npm run lint --if-present`: passed; no lint script is configured in `package.json`.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `git diff --check`: passed; only line-ending normalization warnings were reported.

## Recommended runtime follow-up

For production Web Vitals and memory numbers, run an authenticated staging trace with a fixed Supabase dataset and capture LCP, INP, CLS, long tasks, request count, and detached-node/heap deltas for Mission Control, directory, and shop detail. That measurement requires a controlled deployed environment and is intentionally not estimated here.
