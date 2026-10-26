# Header redesign

User request: redesign, animate and polish the header. Confirmed choice: desktop category shortcuts plus an expandable full menu.

Implemented in `src/Header/Nav/CardNav.tsx`, its scoped `header.css`, and the header client wrapper. CMS labels, destinations, category ordering, and club logo remain authored in Payload. The header uses a larger wordmark, desktop shortcuts from 1200px, a gold account shortcut, and a two-line menu control. The complete directory uses adaptive columns and stacked mobile groups.

The panel opens in 360ms and closes in 220ms, follows intrinsic content height, and can reverse immediately. Reduced motion removes transitions. Closed links are inert and hidden to assistive technology. Escape restores toggle focus; outside clicks, focus leaving the navigation, and link selection close the panel. Route changes reset open state. Directory height is bounded by the viewport and scrolls independently.

Validation:
- 19 Playwright tests passed with `node node_modules/@playwright/test/cli.js test --config playwright.site-improvements.config.ts` (8 header tests, 11 public-site regressions).
- Responsive screenshot inspection at 320, 390, 768, 1024, 1280, and 1440px; no horizontal overflow or runtime page errors.
- Keyboard, rapid reversal, reduced motion, empty navigation, six long CMS groups on a 320x480 viewport, resize while open, live route dismissal, and current-page semantics covered.
- Direct ESLint passed for header TSX and new test/fixture code.
- Impeccable detector returned no findings.
- TypeScript reports only the two known unrelated test errors: missing `tests/helpers/seedUser` import in `tests/e2e/admin.e2e.spec.ts`, and incomplete Payload mock in `tests/int/memberPasswordReset.int.spec.ts`.
- The local Next dev server compiled and served the shared header on home and events. No production build, deployment, CMS save, or publication performed for this change.

Design contract: root `.impeccable/surfaces/triumph-website-src-header-nav-cardnav-tsx.md`. This is a component extension within the existing Poppins/teal/gold identity; no global design-system replacement and no new raster asset.

Finish review: first pass requested one desktop current-page-marker fix. The marker was moved to a pseudo element on the link container outside the ellipsis clipping box, with the same 1280px and 1440px views recaptured. The reviewer scored that fix resolved, found no introduced regression, and returned `disposition: ship` for the scored fix. All other first-pass header matrix rows matched the contract. Final design documentation is recorded in `documentation.md`.
