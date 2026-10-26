# Site motion

Scope: animation extension of the existing frontend, using the installed Motion library. Preserve all CMS content, page layout, header, navigation semantics, and member workflows.

## Direction contract

THESIS: Horizontal blinds carry the transition between pages; supporting motion lets content settle into the same visual rhythm.

OWN-WORLD: Existing deep teal, gold, Poppins, authentic imagery, and existing header/menu choreography. Eight plain horizontal slats, no new imagery or identity.

STORY: A navigation action closes the current view, changes destination behind the blinds, places the new page at the top immediately, then reveals it. Each CMS block appears independently on scroll; the footer comes into focus as it emerges.

FIRST VIEWPORT: Existing composition remains visible by default. A fixed, decorative viewport layer appears only during navigation. The persistent header retains its own interaction. Initial page visits do not wait for blinds.

FORM: Scoped extension, code-led, no concept seed. Focal moment: staggered horizontal blinds, roughly 350ms closing and 500ms reopening. Continuity: route-aware choreography with failure recovery, back/forward arrivals, and cancellation. Feedback: existing hover/focus and menu states remain; each CMS block has its own one-shot entrance, including tall blocks and forms, without animating controls individually. Blocks with existing loop or scroll animation receive opacity only. Budget: transform-only slats, one-shot content entrances, scroll-linked footer blur capped at 16px. No new dependency. Reduced motion bypasses blinds/entrances/blur; keyboard focus clears footer blur. Downloads, external links, hashes, same-page queries, modified clicks, and new-tab links retain native behavior. Non-anchor page changes, including history arrivals, reset instantly before uncovering; explicit anchors retain their destination. Member screens get routing continuity without content entrances over their operational forms.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Ordinary animation extension: preserve global design files. No new raster assets. Validate real internal links, back/forward, slow or abandoned navigation, reduced motion, mobile reachability, footer focus, and default content visibility.

## Prior completion evidence — 2026-10-22

Disposition: **ship**, from the independent finish review. The reviewer checked all ten desktop/mobile captures and found no material fixes or unmet direction-contract promises. This is a motion extension of the incumbent visual world. `PRODUCT.md`, global styles and any global design records retain their authority; this work does not create `DESIGN.md` or `.impeccable/design.json`.

Implemented in `triumph-website/src/components/SiteMotion/`, `triumph-website/src/Footer/Reveal.client.tsx`, and the frontend layout. Eight horizontal slats inherit the existing background/accent tokens. Closing lasts approximately 346ms including stagger; reopening lasts approximately 528ms. At that prior review, public content used once-per-visit entrances while forms and independent animation were excluded. The followup below supersedes those public-block exclusions; member operational screens still skip content entrances. Footer blur progresses from at most 16px to zero, with immediate clarity for keyboard focus and reduced motion.

Reported verification: 26 browser checks and 13 navigation eligibility tests passed; focused ESLint passed. The additional one-time entrance/focus regression also passed, for 27 checked browser scenarios across the suite and focused followup. TypeScript retains two pre-existing test errors. No production build, deployment or authenticated CMS save/live-preview validation was performed.

Surface documentation and validation limits: `triumph-website/.impeccable/review/site-motion/documentation.md`. Implementation report and ten captured states: `triumph-website/.impeccable/review/site-motion/`. These PNGs are local review evidence of the existing application, not new shipping imagery. No generated or external raster assets, new dependency, CMS schema change or CMS content write were introduced.

## Historical followup — 2026-10-22

Disposition: **ship**, from a fresh independent finish review. All six followup captures were judged valid; no material fixes or unmet direction promises were found. This ordinary motion refinement preserves the incumbent palette, typography, imagery, layout and footer behavior. Global design files remain unchanged.

Non-anchor pathname changes now reset scroll to zero instantly in a layout effect before the blinds reopen. Intercepted navigation disables Next's competing automatic reset, and browser history restoration is manual while the controller is mounted. Explicit anchor destinations retain their behavior. The root uses `scroll-behavior: auto`; the separate back-to-top control can still request smooth scrolling.

Every rendered CMS block carries `data-scroll-block` and owns its observer, including nested, tall and form blocks. Surrounding sections do not duplicate block entrances. Standard blocks fade and settle from 24px over 500ms; compact media uses an 8% lower inset over 550ms; existing loop/team/scroll blocks receive opacity only. Below-fold blocks are hidden only after observer and focus recovery are installed. Focus, completion, cleanup and a live reduced-motion preference change restore temporary styles. Content remains visible without enhancement; member routes skip entrances.

Reported verification: 30 other regression checks passed in the full browser run. One synthetic below-fold setup initially failed; after waiting for enhancement and guaranteeing offscreen placement, that focused block-reveal check passed twice (8.4s and 9s; 23.6s for both repeats). This validates 31 distinct checked scenarios across the run and followup; it does not claim a fresh all-31 suite run. No application code changed after the independent ship review. Direct ESLint is clean; TypeScript retains the same two unrelated test errors. No production build, deployment, authenticated CMS interaction, dependency, schema or content write was performed.

Historical implementation, capture provenance and validation limits: `triumph-website/.impeccable/review/site-motion-followup/documentation.md`. The six captures beside it are local review evidence, not new shipping raster assets. The prior review and its ten captures remain historical evidence for the original animation extension.

## Current Tailwind and block ownership refinement — 2026-10-22

Disposition: **ship**, from the independent finish review of all ten current desktop/mobile captures. No material fixes or unmet direction promises were identified. This scoped refinement preserves the established visual world; global design files remain unchanged.

`triumph-website/src/blocks/RenderBlocks.tsx` renders each server block as children of `BlockReveal.client.tsx`. Each wrapper owns its viewport observer, waiting state, animation and cleanup. Do not reintroduce a site-wide selector registry or MutationObserver for CMS entrances. Server-rendered content remains visible before enhancement, including async StatsBlock content. Below-fold blocks wait only after their observer and focus recovery exist. Standard blocks settle from 24px over 500ms; compact media uses an 8% lower inset over 550ms; looping, team, scrolling-gallery and stats blocks use opacity only. Focus, cleanup and live reduced-motion changes clear temporary styles. Member routes skip block entrances.

`StatsBlock/StaggeredStats.client.tsx` independently observes the stat row and animates its direct stat articles once: 16px rise and fade over 450ms, up to 80ms between items, capped at 240ms total delay for the final article. Its own observer allows stats to enter independently of the surrounding block. Focus and reduced motion restore immediate visibility. Stats data reads and children remain server-rendered.

Use Tailwind utility and data/group variants for header, blinds and entrance waiting states. `SiteMotion/index.tsx` provides Motion configuration and blinds; it no longer scans content. `SiteMotion/BlindsTransition.tsx` keeps the eight-slat route choreography and runtime Motion transforms. Dedicated header and motion stylesheets were removed; existing base styles remain the incumbent styling system. Runtime animation styles and CMS-provided header variables remain appropriate for values determined at runtime.

Page-top navigation, history restoration, explicit anchors, footer blur and existing spacing remain as previously implemented. Reported current verification: all 33 browser scenarios and 20 focused navigation/server-rendering tests passed; direct ESLint is clean. TypeScript retains the same two known unrelated test errors. No production build, deployment or authenticated CMS save/live-preview interaction was performed.

Current source ownership, provenance and validation limits: `triumph-website/.impeccable/review/tailwind-blocks/documentation.md`. Ten current PNG captures are local review evidence, not new shipping imagery. No dependency, schema/CMS write, new raster asset or identity change was introduced. Earlier suite counts above are historical and do not describe this refinement's final suite.

## Framer Motion block reveal refinement — 2026-10-22

`BlockReveal.client.tsx` now renders a Framer Motion `motion.div` driven by `useAnimationControls`, using the already installed `framer-motion` package. Each instance retains its own one-shot viewport observer, existing reveal timing and media masks, Tailwind waiting states, focus recovery and live reduced-motion handling. The `RenderBlocks` server boundary and independent stats stagger remain intact. Default server output stays visible through `initial={false}`.

Scoped finish verdict: ship. Six existing browser checks passed for independent/tall/form blocks, one-shot cleanup, keyboard focus, live reduced motion, stats stagger and no-JavaScript visibility. Phone (390px) and desktop (1440px) browser checks reported no page errors or horizontal overflow. Direct lint and the mechanical detector are clean; TypeScript reports only the same two existing test errors. This library migration changes no visual direction, stylesheet, dependency, CMS schema or content. Temporary local browser captures are verification evidence, not shipping artwork. No production build or deployment was performed.
