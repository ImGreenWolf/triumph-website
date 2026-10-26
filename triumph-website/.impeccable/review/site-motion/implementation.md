# Site motion implementation

Request: restore footer blur, animate the site using Motion, and add a blinds page transition.

The frontend layout now uses the installed `motion/react` through `SiteMotion`. Eight horizontal slats close over internal page navigation and reveal the destination after its pathname commits. Back/forward and programmatic navigation receive an arrival reveal. Initial visits remain immediately visible. Same-page queries/hashes, external URLs, downloads, modifier/new-tab links, and admin/API routes retain native navigation. A 4.5-second recovery and Escape dismissal prevent a stalled navigation from blocking the UI. Changing reduced-motion preferences mid-cover continues the requested navigation while removing the effect.

Public CMS blocks and top-level page sections receive once-per-visit entrances. Media containers use a short mask reveal; text content settles with a small displacement and opacity change. Existing independently animated blocks, forms, oversized sections, and member operational pages retain their own behavior. Focus ends any local entrance immediately. Mutation observation registers streamed/dynamically inserted sections; effect cleanup restores styles. Content is visible before enhancement and with JavaScript disabled.

Footer blur is restored from 16px to zero based on a zero-height flow anchor while the sticky footer reveals behind the page. It reaches exactly zero at the document bottom, on keyboard focus, under reduced motion, and when the footer is too tall to stick. Existing resisted footer stretch remains.

Validation:
- 26 browser tests passed (7 new motion checks and 19 existing header/public-site checks).
- 13 focused navigation eligibility tests passed.
- An additional one-shot/focus entrance regression passed (27 browser checks in total across the suite and focused followup).
- Source and new test direct ESLint clean.
- TypeScript reports only the two pre-existing test errors in admin.e2e.spec.ts and memberPasswordReset.int.spec.ts.
- Desktop 1440x1000 and mobile 390x1000 captures: partial footer blur around 8px, final blur 0px, no runtime page errors and no horizontal overflow.
- Automatic design hook reported no deterministic findings on patched UI targets; no extra manual scan.
- No new dependency, CMS schema/content changes, new raster imagery, deployment, or production build.

Captures are first-viewport homepage (`desktop.png`, `mobile.png`), intentional partial-blur footer (`*-footer-partial.png`), settled footer (`*-footer-clear.png`), intentional in-flight blinds (`*-blinds-closing.png`), and settled events destination (`*-arrival.png`). The hero's existing looping handwriting/video is outside scope; partial cursive words are expected. Existing authored page copy and visual styling are unchanged.

Finish: independent review returned `disposition: ship` with no material fixes. Scoped documentation is in `documentation.md` and the root `.impeccable/surfaces/site-motion.md`.
